import TcpSocket from 'react-native-tcp-socket';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
    ACK_TIMEOUT_MS,
    ATTEMPT_TIMEOUT_MS,
    AUTO_RESTART_COOLDOWN_MS,
    CONNECT_TIMEOUT_MS,
    DEVICE_SETTLE_DELAY_MS,
    LOW_LATENCY_PROPERTIES,
    STALL_TIMEOUT_MS,
    START_COMMAND,
    WATCHDOG_TICK_MS,
} from '@/constant/stream';
import { parseTcpAddress } from '@/helpers/tcpAddress';
import { IStreamConfig } from '@/interface/stream';
import { useStreamStore } from '@/store/useStreamStore';

/**
 * What the session needs from the player. The player itself is a native view
 * with a ref, so the screen hands these in once it is mounted, the same way
 * `ServerWorker` takes its store setters from React.
 */
export interface IPlayerHandle {
    setProperty: (name: string, value: string) => Promise<void>;
    load: (url: string) => void;
    unload: () => void;
    play: () => Promise<void>;
    pause: () => Promise<void>;
}

const KEEP_AWAKE_TAG = 'archer-link-stream';

/**
 * Connection diagnostics: attempts, acks, stalls and restarts. On in a dev
 * build, and in a release one when it is built with
 * `EXPO_PUBLIC_CONN_DIAG=true`, so a phone that shows a black screen can still
 * be read with `adb logcat -s ReactNativeJS`. The Flutter app gates the same
 * logs behind `--dart-define=CONN_DIAG`.
 */
const CONN_DIAG = __DEV__ || process.env.EXPO_PUBLIC_CONN_DIAG === 'true';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * One live stream, from the command socket to the last decoded frame.
 *
 * The device is not a camera that simply streams: it transmits only while a
 * plain TCP connection asking it to is held open, and it serves one such
 * session at a time. That, plus the fact that a dead RTSP stream looks exactly
 * like a slow one, is why this is a state machine and not three lines of
 * `player.open()`.
 */
export class StreamSession {
    private static instance: StreamSession | null = null;

    static getInstance(): StreamSession {
        if (!StreamSession.instance) StreamSession.instance = new StreamSession();

        return StreamSession.instance;
    }

    private player: IPlayerHandle | null = null;

    private config: IStreamConfig | null = null;

    private commandSocket: TcpSocket.Socket | null = null;

    private attemptDeadline: ReturnType<typeof setTimeout> | null = null;

    private stallWatchdog: ReturnType<typeof setInterval> | null = null;

    private lastPosition = 0;

    private lastFrameAt: number | null = null;

    private aliveSince: number | null = null;

    private isDisposed = false;

    private isHidden = false;

    private streamAlive = false;

    private autoRestartUsed = false;

    /**
     * Guards against two attempts at once: the device serves a single command
     * session, and a second one would leave both unanswered.
     */
    private attemptInProgress = false;

    /** Invalidates an attempt that is still waiting when its deadline fired. */
    private attemptId = 0;

    /** True between `load()` and the first decoded frame. */
    private connecting = false;

    // eslint-disable-next-line class-methods-use-this
    private log(message: string): void {
        // eslint-disable-next-line no-console
        if (CONN_DIAG) console.log(`[CONN] ${message}`);
    }

    /** The screen calls this once the native view is mounted. */
    attachPlayer(player: IPlayerHandle): void {
        this.player = player;
        this.isDisposed = false;
    }

    detachPlayer(): void {
        this.player = null;
    }

    // ── Attempts ────────────────────────────────────────────────────────────

    async start(config: IStreamConfig): Promise<void> {
        if (this.isDisposed || this.attemptInProgress) return;

        this.config = config;
        this.attemptInProgress = true;
        this.attemptId += 1;
        const attempt = this.attemptId;

        this.clearStallWatchdog();
        this.streamAlive = false;
        this.connecting = false;
        this.lastFrameAt = null;
        this.lastPosition = 0;

        useStreamStore.getState().setStatus('connecting');

        this.clearAttemptDeadline();
        this.attemptDeadline = setTimeout(() => {
            if (attempt !== this.attemptId) return;
            // Abandon whatever this attempt is still waiting for.
            this.attemptId += 1;
            this.log(`attempt #${attempt}: no frames after ${ATTEMPT_TIMEOUT_MS}ms, giving up`);
            this.failAttempt();
        }, ATTEMPT_TIMEOUT_MS);

        this.log(`attempt #${attempt} started`);

        try {
            await this.closeCommandSocket();
            if (this.isDisposed || attempt !== this.attemptId) return;

            if (config.shouldRunStreamView) {
                await this.sendStartCommand(config);
                if (this.isDisposed || attempt !== this.attemptId) return;
            }

            await this.openPlayer(config);
        } catch (error) {
            this.log(`attempt #${attempt} failed: ${String(error)}`);
            if (attempt === this.attemptId) this.failAttempt();
        }
    }

    /**
     * Full restart: the device is told to stop the only way it understands, by
     * losing the command connection, given a moment to settle, and then asked
     * to start again.
     */
    async restart(): Promise<void> {
        if (this.isDisposed || this.attemptInProgress) return;

        const { config } = this;
        if (!config) return;

        this.attemptInProgress = true;
        this.streamAlive = false;
        this.connecting = false;
        this.clearStallWatchdog();

        useStreamStore.getState().setStatus('connecting');

        // Playback goes first: the device should not still be feeding an RTSP
        // session when it is asked to start a new one.
        this.player?.unload();

        const hadCommandChannel = this.commandSocket !== null;
        await this.closeCommandSocket();

        if (hadCommandChannel) {
            this.log(`command channel dropped, waiting ${DEVICE_SETTLE_DELAY_MS}ms for the device`);
            await wait(DEVICE_SETTLE_DELAY_MS);
        }

        this.attemptInProgress = false;
        if (this.isDisposed) return;

        await this.start(config);
    }

    // ── Command channel ─────────────────────────────────────────────────────

    private sendStartCommand(config: IStreamConfig): Promise<void> {
        const { ip, port } = parseTcpAddress(config.tcpCommandUrl);
        if (!ip || !port) return Promise.reject(new Error(`bad tcp command url: ${config.tcpCommandUrl}`));

        return new Promise<void>((resolve, reject) => {
            let settled = false;
            let ackTimer: ReturnType<typeof setTimeout> | null = null;

            // Not getting an ack is not fatal. The device sometimes ignores a
            // new command session while it still believes an old one is alive,
            // and keeps transmitting anyway. Whether that was good enough is
            // decided by the attempt deadline, not here.
            const done = () => {
                if (settled) return;
                settled = true;
                if (ackTimer) clearTimeout(ackTimer);
                resolve();
            };

            const fail = (error: Error) => {
                if (settled) return;
                settled = true;
                if (ackTimer) clearTimeout(ackTimer);
                reject(error);
            };

            const connectTimer = setTimeout(() => {
                fail(new Error('command socket connect timeout'));
            }, CONNECT_TIMEOUT_MS);

            const socket = TcpSocket.createConnection({ host: ip, port: Number(port) }, () => {
                clearTimeout(connectTimer);
                // The socket stays open on purpose: the device stops
                // transmitting as soon as this connection is dropped.
                socket.write(`${START_COMMAND}\n`);
                ackTimer = setTimeout(() => {
                    this.log('no ack from the device');
                    done();
                }, ACK_TIMEOUT_MS);
            });

            this.commandSocket = socket;

            socket.on('data', data => {
                this.log(`device replied: ${String(data).trim()}`);
                done();
            });

            socket.on('error', error => {
                clearTimeout(connectTimer);
                fail(error instanceof Error ? error : new Error(String(error)));
            });
        });
    }

    private closeCommandSocket(): Promise<void> {
        const socket = this.commandSocket;
        this.commandSocket = null;

        if (!socket) return Promise.resolve();

        try {
            socket.removeAllListeners();
            socket.destroy();
        } catch {
            // Already gone. Nothing to close.
        }

        return Promise.resolve();
    }

    // ── Player ──────────────────────────────────────────────────────────────

    private async openPlayer(config: IStreamConfig): Promise<void> {
        const { player } = this;
        if (!player || this.isDisposed) return;

        player.unload();

        // Properties go on before the file does: mpv reads most of them when
        // it opens the demuxer, and setting them afterwards changes nothing.
        // eslint-disable-next-line no-restricted-syntax
        for (const [name, value] of LOW_LATENCY_PROPERTIES) {
            // eslint-disable-next-line no-await-in-loop
            await player.setProperty(name, value);
        }

        this.lastPosition = 0;

        const url = `rtsp://${config.streamUrl}`;
        this.log(`opening ${url}`);

        // Set right before the load: the unload above emits its own stale
        // events, which must not be taken for this attempt.
        this.connecting = true;
        player.load(url);
    }

    /**
     * The stream is up. Not the same thing as "the file opened": mpv reports
     * `file-loaded` as soon as the demuxer is ready, with the video size still
     * unknown, and it will happily sit on an RTSP url that never sends a frame.
     * So this is only called once something actually decoded.
     */
    private markAlive(): void {
        if (!this.connecting) return;

        this.connecting = false;
        this.attemptInProgress = false;
        this.streamAlive = true;

        this.clearAttemptDeadline();

        const now = Date.now();
        this.lastFrameAt = now;
        this.aliveSince = now;
        this.startStallWatchdog();

        this.log('stream is up');

        activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
            // A phone that refuses to stay awake is not worth failing over.
        });

        useStreamStore.getState().setStatus('playing');
    }

    /**
     * File opened. Carries the video size, which on a live stream is usually
     * still zero here, so it only counts when mpv already knows it.
     */
    onLoad(width: number): void {
        if (width > 0) this.markAlive();
    }

    /**
     * The liveness signal: position moves while frames are being decoded and
     * freezes the moment they stop. It is also what tells us the stream came
     * up at all, because it is the first thing that can only happen after a
     * frame was decoded.
     */
    onProgress(position: number): void {
        if (position === this.lastPosition) return;

        this.lastPosition = position;
        this.lastFrameAt = Date.now();
        this.markAlive();
    }

    /**
     * Logged only, never acted upon. mpv reports a failed hardware decoder here
     * and then plays the stream perfectly well through the software one, so an
     * error is not a verdict. The attempt deadline is.
     */
    onPlayerError(error: string): void {
        this.log(`player error (not fatal): ${error}`);
    }

    private failAttempt(): void {
        this.attemptInProgress = false;
        this.connecting = false;
        this.streamAlive = false;

        this.clearAttemptDeadline();
        this.clearStallWatchdog();

        useStreamStore.getState().setStatus('failed');
    }

    // ── Watchdog ────────────────────────────────────────────────────────────

    private startStallWatchdog(): void {
        this.clearStallWatchdog();

        this.stallWatchdog = setInterval(() => {
            if (this.isDisposed || this.isHidden || this.attemptInProgress) return;

            const { lastFrameAt } = this;
            if (lastFrameAt === null) return;

            const idle = Date.now() - lastFrameAt;

            if (idle < STALL_TIMEOUT_MS) {
                // Healthy long enough to earn the next automatic restart back.
                if (
                    this.autoRestartUsed &&
                    this.aliveSince !== null &&
                    Date.now() - this.aliveSince >= AUTO_RESTART_COOLDOWN_MS
                ) {
                    this.autoRestartUsed = false;
                }

                return;
            }

            this.clearStallWatchdog();

            if (this.autoRestartUsed) {
                this.log('stalled again after a restart, handing over to the user');
                this.failAttempt();

                return;
            }

            this.autoRestartUsed = true;
            this.log(`no frames for ${idle}ms, restarting the stream`);
            this.restart();
        }, WATCHDOG_TICK_MS);
    }

    private clearStallWatchdog(): void {
        if (!this.stallWatchdog) return;
        clearInterval(this.stallWatchdog);
        this.stallWatchdog = null;
    }

    private clearAttemptDeadline(): void {
        if (!this.attemptDeadline) return;
        clearTimeout(this.attemptDeadline);
        this.attemptDeadline = null;
    }

    // ── App lifecycle ───────────────────────────────────────────────────────

    /** The app went to the background. */
    onHidden(): void {
        if (this.isDisposed) return;

        this.isHidden = true;
        this.clearStallWatchdog();
        this.log('hidden: stall watchdog paused');

        this.player?.pause().catch(() => {});
    }

    /** The app came back to the foreground. */
    async onVisible(): Promise<void> {
        if (this.isDisposed) return;

        this.isHidden = false;

        if (!this.streamAlive) {
            // An attempt in flight or a failed state owns the screen.
            this.log('visible: no live stream to resume');

            return;
        }

        await this.player?.play().catch(() => {});

        // Whatever piled up while we were away is replayed first, so give the
        // stream a fresh window before the stall rule may fire.
        const now = Date.now();
        this.lastFrameAt = now;
        this.aliveSince = now;
        this.startStallWatchdog();
        this.log('visible: stall watchdog resumed');
    }

    async dispose(): Promise<void> {
        this.isDisposed = true;

        this.clearAttemptDeadline();
        this.clearStallWatchdog();

        await this.closeCommandSocket();

        this.player?.unload();
        this.player = null;

        deactivateKeepAwake(KEEP_AWAKE_TAG);
        useStreamStore.getState().setStatus('idle');
    }
}

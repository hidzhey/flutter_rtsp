import { DEV_STATUS_POLL_MS, RequestTypeEnum, WS_RECONNECT_MS } from '@/constant/serverWorker';
import { AGCMode, ButtonEnum, CMDDirect, ColorScheme, Zoom } from '@/interface/device';
import { useDevStatusStore } from '@/store/useDevStatusStore';
import { ProtobufLoader } from './protobufLoader';
import { RequestQueue } from './requestQueue';

const CONN_DIAG = __DEV__ || process.env.EXPO_PUBLIC_CONN_DIAG === 'true';

/**
 * The device's command channel: a WebSocket carrying protobuf.
 *
 * Separate from the stream on purpose. They are two different connections to
 * the same box and either can be down on its own, so the picture surviving
 * says nothing about the buttons working, and the other way round.
 *
 * Same shape as `core/serverWorker.ts` in the BC2 app, which talks to the same
 * `archer_protocol`, trimmed to the commands a stream view needs.
 */
export class ServerWorker {
    private static instance: ServerWorker | null = null;

    static getInstance(): ServerWorker {
        if (!ServerWorker.instance) ServerWorker.instance = new ServerWorker();

        return ServerWorker.instance;
    }

    private readonly proto = new ProtobufLoader();

    private readonly queue = new RequestQueue(() => this.onRequestTimeout());

    private ws: WebSocket | null = null;

    private url = '';

    private pollTimer: ReturnType<typeof setInterval> | null = null;

    private reconnectTimer: ReturnType<typeof setInterval> | null = null;

    private isConnecting = false;

    private isStopped = true;

    // eslint-disable-next-line class-methods-use-this
    private log(message: string): void {
        // eslint-disable-next-line no-console
        if (CONN_DIAG) console.log(`[WS] ${message}`);
    }

    /**
     * `commandUrl` is `host:port/path`, exactly as it sits in the config, so
     * the scheme is added here and nowhere else.
     */
    start(commandUrl: string): void {
        if (!commandUrl) return;

        if (this.url !== commandUrl) {
            this.log(`command url changed to ${commandUrl}`);
            this.closeSocket();
            this.url = commandUrl;
        }

        if (!this.isStopped) return;
        this.isStopped = false;

        this.connect();

        // Both loops run at one second, like the Flutter app: one keeps the
        // status fresh, the other keeps trying while the channel is down.
        this.pollTimer = setInterval(() => {
            if (this.isOpen() && !this.queue.isRequestRunning) this.getDevStatus();
        }, DEV_STATUS_POLL_MS);

        this.reconnectTimer = setInterval(() => {
            if (!this.isOpen() && !this.isConnecting) this.connect();
        }, WS_RECONNECT_MS);
    }

    stop(): void {
        this.isStopped = true;

        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.reconnectTimer) clearInterval(this.reconnectTimer);
        this.pollTimer = null;
        this.reconnectTimer = null;

        this.closeSocket();
        useDevStatusStore.getState().reset();
    }

    private isOpen(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    private connect(): void {
        if (this.isConnecting || this.isOpen() || !this.url) return;

        this.isConnecting = true;
        this.log(`connecting to ws://${this.url}`);

        const ws = new WebSocket(`ws://${this.url}`);
        // Frames arrive as binary; without this they come back as a Blob and
        // protobuf has nothing to decode.
        ws.binaryType = 'arraybuffer';
        this.ws = ws;

        ws.onopen = () => {
            this.isConnecting = false;
            this.log('open');
            useDevStatusStore.getState().setIsCommandChannelOpen(true);
            this.getDevStatus();
        };

        ws.onmessage = event => this.handleMessage(event.data as ArrayBuffer);

        ws.onerror = () => {
            this.log('socket error');
            this.dropConnection();
        };

        ws.onclose = () => {
            this.log('closed');
            this.dropConnection();
        };
    }

    private handleMessage(data: ArrayBuffer): void {
        // Whatever came back, the line is free again: the device answers one
        // request at a time and never says which one it is answering.
        this.queue.resolve();

        const payload = this.proto.decodeHostPayload(new Uint8Array(data));
        if (!payload) {
            this.log('undecodable frame, ignored');

            return;
        }

        if (payload.devStatus) useDevStatusStore.getState().setDevStatus(payload.devStatus);
    }

    private onRequestTimeout(): void {
        this.log('request went unanswered, dropping the connection');
        this.dropConnection();
    }

    /**
     * Gives up on the current socket. The reconnect loop picks it up from
     * here, so this never retries by itself.
     */
    private dropConnection(): void {
        this.isConnecting = false;
        this.queue.clear();
        this.closeSocket();
        useDevStatusStore.getState().setIsCommandChannelOpen(false);
    }

    private closeSocket(): void {
        const ws = this.ws;
        this.ws = null;
        if (!ws) return;

        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;

        try {
            ws.close();
        } catch {
            // Already gone.
        }
    }

    private send(type: RequestTypeEnum, bytes: Uint8Array): void {
        if (!this.isOpen()) {
            this.log(`not connected, ${type} dropped`);

            return;
        }

        this.queue.push({ type, send: () => this.ws?.send(bytes) });
    }

    // ── Commands ────────────────────────────────────────────────────────────

    /** Skipped when one is already waiting: the poll must not pile up. */
    getDevStatus(): void {
        if (this.queue.isInQueue(RequestTypeEnum.getDevStatus)) return;

        this.send(RequestTypeEnum.getDevStatus, this.proto.getHostDevStatus());
    }

    setZoom(zoom: Zoom): void {
        this.send(RequestTypeEnum.setZoom, this.proto.setZoom(zoom));
    }

    setColorScheme(scheme: ColorScheme): void {
        this.send(RequestTypeEnum.setPallette, this.proto.setPallette(scheme));
    }

    setAgc(mode: AGCMode): void {
        this.send(RequestTypeEnum.setAgc, this.proto.setAgc(mode));
    }

    /** Calibration, LRF measurement, FFC: things the device does once. */
    trigger(cmd: CMDDirect): void {
        this.send(RequestTypeEnum.cmdTrigger, this.proto.cmdTrigger(cmd));
    }

    pressButton(button: ButtonEnum): void {
        this.send(RequestTypeEnum.buttonPress, this.proto.buttonPress(button));
    }
}

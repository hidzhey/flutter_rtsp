import { IStreamConfig } from '@/interface/stream';

/**
 * Which device sits on which subnet. The phone joins the device's Wi-Fi, so the
 * subnet it ends up on is what tells us who we are talking to. Same table as
 * `getStreamConfig()` in the Flutter app.
 */
export const STREAM_CONFIG_BY_SUBNET: Record<string, IStreamConfig> = {
    '192.168.1': {
        streamUrl: '192.168.1.1:555//ir.sdp',
        commandUrl: '192.168.1.1:8080/websocket',
        tcpCommandUrl: '',
        shouldRunStreamView: false,
    },
    '192.168.100': {
        streamUrl: '192.168.100.1/stream0',
        commandUrl: '192.168.100.1:8080/websocket',
        tcpCommandUrl: '192.168.100.1:8888',
        shouldRunStreamView: true,
    },
};

export const EMPTY_STREAM_CONFIG: IStreamConfig = {
    streamUrl: '',
    commandUrl: '',
    tcpCommandUrl: '',
    shouldRunStreamView: false,
};

/**
 * The only command the device understands. There is no matching "stop":
 * dropping the command connection is what makes it stop transmitting.
 */
export const START_COMMAND = 'CMD_RTSP_TRANS_START';

/**
 * One deadline for a whole attempt: socket, command, ack, player and the first
 * frame. Whatever went wrong, the user gets a failed state instead of an
 * endless loader.
 */
export const ATTEMPT_TIMEOUT_MS = 15_000;

/** Frames were arriving and stopped: restart the stream. */
export const STALL_TIMEOUT_MS = 3_000;

/** Both have to fit inside `ATTEMPT_TIMEOUT_MS`. */
export const CONNECT_TIMEOUT_MS = 4_000;
export const ACK_TIMEOUT_MS = 5_000;

/**
 * Time for the device to notice that the command connection is gone, before it
 * is asked to start transmitting again.
 */
export const DEVICE_SETTLE_DELAY_MS = 1_000;

/**
 * How long a stream has to stay healthy before it earns another automatic
 * restart. Without this, a stream that dies right after every restart would
 * loop forever.
 */
export const AUTO_RESTART_COOLDOWN_MS = 10_000;

/** How often the stall watchdog looks at the clock. */
export const WATCHDOG_TICK_MS = 1_000;

/**
 * mpv properties that make an RTSP stream live rather than smooth.
 *
 * These are the whole reason the Flutter app feels instant, so they are carried
 * over verbatim from `_initializePlayer()`. They must be set before the file is
 * loaded: mpv reads most of them when it opens the demuxer.
 *
 * - `cache=no`, `cache-pause=no` — never hold frames back, never stall to refill.
 * - `demuxer-lavf-o` — RTSP over TCP (UDP loses frames on these devices), and
 *   ffmpeg told to stop guessing about the stream and start decoding.
 * - `untimed=yes` — show each frame as it arrives instead of pacing to a clock.
 * - `profile=low-latency` — mpv's own bundle of the same idea.
 * - `framedrop=vo` — when we fall behind, drop rather than queue.
 * - `audio=no` — the device sends none, and probing for it costs time.
 */
export const LOW_LATENCY_PROPERTIES: Array<[string, string]> = [
    ['cache', 'no'],
    ['cache-pause', 'no'],
    ['demuxer-lavf-o', 'rtsp_transport=tcp,analyzeduration=100000,probesize=32000,fflags=nobuffer'],
    ['untimed', 'yes'],
    ['profile', 'low-latency'],
    ['framedrop', 'vo'],
    ['audio', 'no'],
];

/**
 * Everything the app needs to know about one device it can talk to.
 *
 * The device is the server: the phone joins its Wi-Fi, and which device it is
 * follows from the subnet the phone ended up on. See `constant/stream.ts`.
 */
export interface IStreamConfig {
    /** RTSP endpoint without the scheme, e.g. `192.168.100.1/stream0`. */
    streamUrl: string;
    /** WebSocket endpoint for protobuf commands, e.g. `192.168.100.1:8080/websocket`. */
    commandUrl: string;
    /**
     * Plain TCP endpoint that starts the stream, e.g. `192.168.100.1:8888`.
     * Empty for devices that transmit on their own.
     */
    tcpCommandUrl: string;
    /**
     * Whether this device needs the start command before it transmits.
     * Mirrors `shouldRunStreamView` in the Flutter app.
     */
    shouldRunStreamView: boolean;
}

/** `ip:port/path` split into its parts. Any of them may be missing. */
export interface ITcpAddress {
    ip: string | null;
    port: string | null;
    path: string | null;
}

/** What the stream view shows. Exactly one of these is true at a time. */
export type StreamStatus = 'idle' | 'connecting' | 'playing' | 'failed';

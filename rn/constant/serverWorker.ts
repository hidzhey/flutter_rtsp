/** Which command a queued request carries, so a reply can be matched to it. */
export enum RequestTypeEnum {
    getDevStatus = 'getDevStatus',
    setZoom = 'setZoom',
    setPallette = 'setPallette',
    setAgc = 'setAgc',
    cmdTrigger = 'cmdTrigger',
    buttonPress = 'buttonPress',
}

/**
 * How long a request may go unanswered before the connection is written off.
 * The device answers in milliseconds on a good link, so anything near this is
 * a dead socket rather than a slow one.
 */
export const QUEUE_DROP_MS = 3_000;

/**
 * The device has no push: its status is polled. One second, same as the
 * Flutter app and the BC2 app, and only while nothing else is in flight.
 */
export const DEV_STATUS_POLL_MS = 1_000;

/** How often to retry while the command channel is down. Also one second. */
export const WS_RECONNECT_MS = 1_000;

/** Protobuf messages this app looks up by name once the schema is parsed. */
export const PROTOBUF_MESSAGE_TYPES = ['ClientPayload', 'HostPayload'] as const;

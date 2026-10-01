import protobuf from 'protobufjs';
import { stringProto } from '@/proto/stringProto';
import { AGCMode, ButtonEnum, CMDDirect, ColorScheme, IDevStatus, Zoom } from '@/interface/device';

/**
 * The wire format, parsed once at runtime.
 *
 * The schema is kept as a string rather than generated into code, the same way
 * the BC2 app does it: there is no build step to run, and the file stays a
 * copy of `archer_protocol.proto` that can be diffed against the device's own.
 */
export class ProtobufLoader {
    private readonly root: protobuf.Root;

    private readonly clientPayload: protobuf.Type;

    private readonly hostPayload: protobuf.Type;

    constructor() {
        this.root = protobuf.parse(stringProto).root;
        this.clientPayload = this.root.lookupType('archer_protocol.ClientPayload');
        this.hostPayload = this.root.lookupType('archer_protocol.HostPayload');
    }

    /** Wraps one command into a ClientPayload and serialises it. */
    private encode(command: Record<string, unknown>): Uint8Array {
        const payload = this.clientPayload.create({ command });

        return this.clientPayload.encode(payload).finish();
    }

    /**
     * Reads what the device sent back. Returns null on anything that does not
     * decode: a half-received frame is not worth taking the connection down
     * for, and the request timeout will deal with it if it keeps happening.
     */
    decodeHostPayload(data: Uint8Array): { devStatus?: IDevStatus } | null {
        try {
            return this.hostPayload.toObject(this.hostPayload.decode(data), {
                enums: Number,
                longs: Number,
                defaults: true,
            }) as { devStatus?: IDevStatus };
        } catch {
            return null;
        }
    }

    getHostDevStatus = (): Uint8Array => this.encode({ getHostDevStatus: {} });

    setZoom = (zoomLevel: Zoom): Uint8Array => this.encode({ setZoom: { zoomLevel } });

    setPallette = (scheme: ColorScheme): Uint8Array => this.encode({ setPallette: { scheme } });

    setAgc = (mode: AGCMode): Uint8Array => this.encode({ setAgc: { mode } });

    cmdTrigger = (cmd: CMDDirect): Uint8Array => this.encode({ cmdTrigger: { cmd } });

    buttonPress = (buttonPressed: ButtonEnum): Uint8Array => this.encode({ buttonPress: { buttonPressed } });
}

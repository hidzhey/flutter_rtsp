import { create } from 'zustand';
import { IDevStatus } from '@/interface/device';

interface IDevStatusStore {
    /** Null until the device has answered once. */
    devStatus: IDevStatus | null;
    setDevStatus: (devStatus: IDevStatus) => void;

    /** The command channel is up, which is separate from the stream being up. */
    isCommandChannelOpen: boolean;
    setIsCommandChannelOpen: (isCommandChannelOpen: boolean) => void;

    reset: () => void;
}

/** Fields compared to decide whether an incoming status is actually new. */
const FIELDS: Array<keyof IDevStatus> = [
    'charge',
    'zoom',
    'airTemp',
    'airHum',
    'airPress',
    'powderTemp',
    'windDir',
    'windSpeed',
    'pitch',
    'cant',
    'distance',
    'currentProfile',
    'colorScheme',
    'modAGC',
    'maxZoom',
];

const isSame = (a: IDevStatus | null, b: IDevStatus): boolean =>
    a !== null && FIELDS.every(field => a[field] === b[field]);

export const useDevStatusStore = create<IDevStatusStore>((set, get) => ({
    devStatus: null,
    // The status is polled once a second and mostly does not change. Writing it
    // through unconditionally would re-render every subscriber every second for
    // nothing, which is the trap the BC2 app hashes payloads to avoid.
    setDevStatus: devStatus => {
        if (isSame(get().devStatus, devStatus)) return;
        set({ devStatus });
    },

    isCommandChannelOpen: false,
    setIsCommandChannelOpen: isCommandChannelOpen => set({ isCommandChannelOpen }),

    reset: () => set({ devStatus: null, isCommandChannelOpen: false }),
}));

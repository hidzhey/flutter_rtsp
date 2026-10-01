import { create } from 'zustand';
import { EMPTY_STREAM_CONFIG } from '@/constant/stream';
import { IStreamConfig, StreamStatus } from '@/interface/stream';

interface IStreamStore {
    /** Which device we are talking to. Follows from the phone's subnet. */
    config: IStreamConfig;
    setConfig: (config: IStreamConfig) => void;

    /** Phone is on a Wi-Fi we recognise. */
    isWiFiConnected: boolean;
    setIsWiFiConnected: (isWiFiConnected: boolean) => void;

    status: StreamStatus;
    setStatus: (status: StreamStatus) => void;

    /**
     * What the player should be showing. Empty means "nothing yet": the view
     * mounts without a source so the low-latency properties can be set first.
     */
    source: string;
    setSource: (source: string) => void;
}

export const useStreamStore = create<IStreamStore>(set => ({
    config: EMPTY_STREAM_CONFIG,
    setConfig: config => set({ config }),

    isWiFiConnected: false,
    setIsWiFiConnected: isWiFiConnected => set({ isWiFiConnected }),

    status: 'idle',
    setStatus: status => set({ status }),

    source: '',
    setSource: source => set({ source }),
}));

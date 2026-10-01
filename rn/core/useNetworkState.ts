import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Network from 'expo-network';
import { EMPTY_STREAM_CONFIG, STREAM_CONFIG_BY_SUBNET } from '@/constant/stream';
import { useStreamStore } from '@/store/useStreamStore';

const EMPTY_IP = '0.0.0.0';

/**
 * Which device we are on, read off the phone's own IP. The device is an access
 * point, so joining its Wi-Fi is what picks the config. Same approach as
 * `useNetworkState` in the BC2 app, just resolving to a stream config.
 */
export const useNetworkState = (): void => {
    const setConfig = useStreamStore(state => state.setConfig);
    const setIsWiFiConnected = useStreamStore(state => state.setIsWiFiConnected);

    const [ip, setIp] = useState<string>(EMPTY_IP);

    useEffect(() => {
        const read = () => {
            Network.getIpAddressAsync()
                .then(setIp)
                .catch(() => setIp(EMPTY_IP));
        };

        read();
        const unsubscribe = NetInfo.addEventListener(read);

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const octets = ip.split('.');
        if (ip === EMPTY_IP || octets.length < 3) {
            setIsWiFiConnected(false);
            setConfig(EMPTY_STREAM_CONFIG);

            return;
        }

        const subnet = `${octets[0]}.${octets[1]}.${octets[2]}`;
        const config = STREAM_CONFIG_BY_SUBNET[subnet];

        setIsWiFiConnected(config !== undefined);
        setConfig(config ?? EMPTY_STREAM_CONFIG);
    }, [ip, setConfig, setIsWiFiConnected]);
};

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ExpoMpvView, ExpoMpvViewRef } from 'expo-mpv';
import styled from 'styled-components/native';
import { IPlayerHandle, StreamSession } from '@/core/streamSession';
import { useNetworkState } from '@/core/useNetworkState';
import { useStreamStore } from '@/store/useStreamStore';

const Screen = styled.View`
    flex: 1;
    background-color: #000000;
`;

/**
 * The stream, and nothing else.
 *
 * Deliberately bare: the point of this screen is to prove that the picture
 * arrives and keeps arriving. Buttons, recording and the device commands come
 * after that holds on real hardware.
 */
export default function StreamScreen() {
    useNetworkState();

    const playerRef = useRef<ExpoMpvViewRef>(null);
    const session = useMemo(() => StreamSession.getInstance(), []);

    const config = useStreamStore(state => state.config);
    const isWiFiConnected = useStreamStore(state => state.isWiFiConnected);
    const source = useStreamStore(state => state.source);
    const setSource = useStreamStore(state => state.setSource);

    // The player lives in a native view, so the session gets a handle to it
    // rather than owning it. `load` goes through the store because the source
    // is a prop, not a method.
    useEffect(() => {
        const handle: IPlayerHandle = {
            setProperty: (name, value) => playerRef.current?.setPropertyString(name, value) ?? Promise.resolve(),
            load: url => setSource(url),
            unload: () => setSource(''),
            play: () => playerRef.current?.play() ?? Promise.resolve(),
            pause: () => playerRef.current?.pause() ?? Promise.resolve(),
        };

        session.attachPlayer(handle);

        return () => {
            session.detachPlayer();
        };
    }, [session, setSource]);

    useEffect(() => {
        if (!isWiFiConnected || !config.streamUrl) return;

        session.start(config);
    }, [session, config, isWiFiConnected]);

    useEffect(
        () => () => {
            session.dispose();
        },
        [session],
    );

    useEffect(() => {
        const onChange = (state: AppStateStatus) => {
            if (state === 'active') {
                session.onVisible();

                return;
            }
            session.onHidden();
        };

        const subscription = AppState.addEventListener('change', onChange);

        return () => {
            subscription.remove();
        };
    }, [session]);

    const onLoad = useCallback(
        (event: { nativeEvent: { width: number } }) => {
            session.onLoad(event.nativeEvent.width);
        },
        [session],
    );

    const onProgress = useCallback(
        (event: { nativeEvent: { position: number } }) => {
            session.onProgress(event.nativeEvent.position);
        },
        [session],
    );

    const onError = useCallback(
        (event: { nativeEvent: { error: string } }) => {
            session.onPlayerError(event.nativeEvent.error);
        },
        [session],
    );

    return (
        <Screen>
            <StatusBar hidden />
            <ExpoMpvView
                ref={playerRef}
                source={source || undefined}
                hwdec="mediacodec"
                muted
                style={StyleSheet.absoluteFill}
                onLoad={onLoad}
                onProgress={onProgress}
                onError={onError}
            />
        </Screen>
    );
}

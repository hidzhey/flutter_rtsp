import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ExpoMpvView, ExpoMpvViewRef } from 'expo-mpv';
import styled from 'styled-components/native';
import { ServerWorker } from '@/core/serverWorker';
import { IPlayerHandle, StreamSession } from '@/core/streamSession';
import { useNetworkState } from '@/core/useNetworkState';
import { useStreamStore } from '@/store/useStreamStore';

const Screen = styled.View`
    flex: 1;
    background-color: #000000;
`;

/**
 * The stream, and nothing else on top of it.
 *
 * Deliberately bare: the point of this screen is to prove that the picture
 * arrives and keeps arriving. The command channel runs underneath it with no
 * controls wired to it yet, so the device status is read but nothing is sent.
 */
export default function StreamScreen() {
    useNetworkState();

    const playerRef = useRef<ExpoMpvViewRef>(null);
    const session = useMemo(() => StreamSession.getInstance(), []);
    const worker = useMemo(() => ServerWorker.getInstance(), []);

    const config = useStreamStore(state => state.config);
    const isWiFiConnected = useStreamStore(state => state.isWiFiConnected);
    const source = useStreamStore(state => state.source);
    const setSource = useStreamStore(state => state.setSource);

    // The player lives in a native view, so the session gets a handle to it
    // rather than owning it. `load` goes through the store because the source
    // is a prop, not a method.
    useEffect(() => {
        const handle: IPlayerHandle = {
            // Loud on a missing view, unlike the rest. expo-mpv resolves every
            // ref method to a no-op when the native view is not there, and a
            // silently skipped property means the stream comes up with mpv's
            // default buffering: it plays, just seconds behind. Better to fail
            // the attempt and say so than to ship that quietly.
            setProperty: (name, value) => {
                const view = playerRef.current;
                if (!view) return Promise.reject(new Error(`player not mounted, mpv property ${name} dropped`));

                return view.setPropertyString(name, value);
            },
            load: url => setSource(url),
            // Both halves matter: the native stop actually stops mpv, and
            // clearing the prop is what lets the next attempt re-apply the
            // same url (an unchanged prop is never re-sent).
            stop: async () => {
                setSource('');
                await playerRef.current?.stop();
            },
            play: () => playerRef.current?.play() ?? Promise.resolve(),
            pause: () => playerRef.current?.pause() ?? Promise.resolve(),
        };

        session.attachPlayer(handle);

        // Teardown lives here and not in its own effect: React runs cleanups in
        // the order the effects were declared, so a separate dispose effect
        // would always run after the handle had already been dropped, and
        // would have no player left to stop.
        return () => {
            session.dispose();
            session.detachPlayer();
        };
    }, [session, setSource]);

    useEffect(() => {
        if (!isWiFiConnected || !config.streamUrl) return;

        session.start(config);
    }, [session, config, isWiFiConnected]);

    // The command channel is its own connection and its own lifetime: it keeps
    // retrying on its own, so it is started once the device is known and only
    // stopped when the screen goes away.
    useEffect(() => {
        if (!isWiFiConnected || !config.commandUrl) return undefined;

        worker.start(config.commandUrl);

        return () => {
            worker.stop();
        };
    }, [worker, config, isWiFiConnected]);

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

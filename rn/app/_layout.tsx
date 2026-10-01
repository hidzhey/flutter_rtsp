import { Stack } from 'expo-router';
import { ThemeProvider } from 'styled-components/native';
import { darkTheme } from '@/constant/theme';

/**
 * The shell. One screen for now, so it is only here to hold the theme and to
 * keep the navigator out of the stream's way: no header, black background,
 * nothing drawn over the picture.
 */
export default function RootLayout() {
    return (
        <ThemeProvider theme={darkTheme}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: darkTheme.colors.appBg },
                }}
            />
        </ThemeProvider>
    );
}

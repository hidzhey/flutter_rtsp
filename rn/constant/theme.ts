export interface ITheme {
    name: string;
    colors: {
        transparent: 'transparent';
        appBg: string;
        primary: string;
        error: string;
        success: string;
    };
}

/**
 * The app lives on a scope in the field, so there is only a dark theme. Kept in
 * the same shape as the BC2 app's `constant/theme.ts` so the two can be merged
 * later without renaming anything.
 */
export const darkTheme: ITheme = {
    name: 'darkTheme',
    colors: {
        transparent: 'transparent',
        appBg: '#000000',
        primary: '#E0E0E0',
        error: '#FF2400',
        success: '#68CB7C',
    },
};

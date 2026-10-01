import 'styled-components/native';
import { ITheme } from '@/constant/theme';

declare module 'styled-components/native' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface DefaultTheme extends ITheme {}
}

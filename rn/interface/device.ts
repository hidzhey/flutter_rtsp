/**
 * The device protocol, as much of it as this app uses.
 *
 * The schema itself is `proto/stringProto.ts`, taken unchanged from the BC2
 * app: both products speak the same `archer_protocol`, so the two files are
 * byte for byte the same and should stay that way.
 */

export enum Zoom {
    UNKNOWN_ZOOM_LEVEL = 0,
    ZOOM_X1 = 1,
    ZOOM_X2 = 2,
    ZOOM_X3 = 3,
    ZOOM_X4 = 4,
    ZOOM_X6 = 5,
}

export enum ColorScheme {
    UNKNOWN_COLOR_SHEME = 0,
    SEPIA = 1,
    BLACK_HOT = 2,
    WHITE_HOT = 3,
}

export enum AGCMode {
    UNKNOWN_AGC_MODE = 0,
    AUTO_1 = 1,
    AUTO_2 = 2,
    AUTO_3 = 3,
}

/** Direct actions the device performs rather than settings it stores. */
export enum CMDDirect {
    UNKNOWN_CMD_DIRECTION = 0,
    CALIBRATE_ACCEL_GYRO = 1,
    LRF_MEASUREMENT = 2,
    RESET_CM_CLICKS = 3,
    TRIGGER_FFC = 4,
}

export enum ButtonEnum {
    UNKNOWN_BUTTON = 0,
    MENU_SHORT = 1,
    MENU_LONG = 2,
    UP_SHORT = 3,
    UP_LONG = 4,
    DOWN_SHORT = 5,
    DOWN_LONG = 6,
    LRF_SHORT = 7,
    LRF_LONG = 8,
    REC_SHORT = 9,
    REC_LONG = 10,
}

/**
 * What the device reports about itself, once a second. Units are the device's
 * own, straight from the schema: pressure in decaPascal, wind speed in
 * deciMeter per second, distance in deciMeter.
 */
export interface IDevStatus {
    charge: number;
    zoom: Zoom;
    airTemp: number;
    airHum: number;
    airPress: number;
    powderTemp: number;
    windDir: number;
    windSpeed: number;
    pitch: number;
    cant: number;
    distance: number;
    currentProfile: number;
    colorScheme: ColorScheme;
    modAGC: AGCMode;
    maxZoom: Zoom;
}

export const stringProto = `syntax = "proto3";

package archer_protocol;

message HostPayload {
\tHostProfile profile = 1;
\tHostDevStatus devStatus = 2;
\tCommandResponse response = 3;
\tReticles reticles = 4;
\tFullProfileData allProfiles = 5;
}

message ClientPayload {
\treserved 1;
\treserved "profile";
    ClientDevStatus devStatus = 2;
    Command command = 3;
    CommandResponse response = 4;
}

message CommandResponse {
\toneof oneofCommandResponse {
\t\tStatusOk statusOk = 1;
\t\tStatusError statusErr = 2;
\t}
}

message Command
{
\toneof oneofCommand {
\t\tSetZoomLevel setZoom = 1;
\t\tSetColorScheme setPallette = 2;
\t\tSetAgcMode setAgc = 3;
\t\tSetDistance setDst = 4;
\t\tSetHoldoff setHoldoff = 5;
\t\tSetZeroing setZeroing = 6;
\t\tSetCompassOffset setMagOffset = 7;
\t\tSetAirTemp setAirTC = 8;
\t\tSetAirHumidity setAirHum = 9;
\t\tSetAirPressure setAirPress = 10;
\t\tSetPowderTemp setPowderTemp = 11;
\t\tSetWind setWind = 12;
\t\tButtonPress buttonPress = 13;
\t\tTriggerCmd cmdTrigger = 14;
\t\tGetHostDevStatus getHostDevStatus = 15;
\t\tGetHostProfile getHostProfile = 16;
\t\tGetProfiles getAllProfiles = 17;
\t\tUpdateProfiles updateAllProfiles = 18;
\t\tGetReticles getReticles = 19;
\t\tUpdateReticles updateReticles = 20;
\t}
}
message GetProfiles
{

}
message GetReticles{

}
message UpdateReticles{
\tReticles data = 1;
}
message UpdateProfiles{
\tFullProfileData data = 1;
}
message StatusOk
{
\tOkStatusCode code = 1;
}

message StatusError
{
\tErrorStatusCode code = 1;
\tstring text = 2;
}

enum OkStatusCode {
\tUNKNOWN_OK_STATUS = 0;
    SUCCESS = 1;
}

enum ErrorStatusCode {
\tUNKNOWN_ERROR_STATUS = 0;
    FAILURE = 1;
\tINVALID_DATA = 2;
}


message SetZoomLevel {
    Zoom zoomLevel = 1;
}
message SetColorScheme {
    ColorScheme scheme = 1;
}
message GetHostDevStatus {
}
message GetHostProfile {
}
message SetAirTemp {
\tint32 temperature = 1; //[-100..100] C°
}
message SetPowderTemp {
    int32 temperature = 1; //[-100..100] C°
}
message SetAirHumidity {
    int32 humidity = 1; //[0..100]%
}
message SetAirPressure {
\tint32 pressure = 1; //[3000..12000] decaPascal
}
message SetWind {
\tint32 direction = 1; //[0..359] °
\tint32 speed = 2; //[0..200] deciMeter per second
}
message SetDistance {
\tint32 distance = 1; //deciMeter
}
message SetAgcMode {
\tAGCMode mode = 1;
}
message SetCompassOffset {
\tint32 offset = 1;  //[-360..360] °
}
enum HoldoffType{
\tUNDEFINED = 0;
\tMIL = 1;
\tMOA = 2;
\tCLICKS = 3;
}
message SetHoldoff{
\tint32 x = 1; //x1000 125 increments [-600000..600000] 20500 = 20.5 1x; 41 2x; 61.5 3x etc.
\tint32 y = 2; //x1000 125 increments [-600000..600000]
\tHoldoffType type = 3;
}
message ButtonPress{
\tButtonEnum buttonPressed = 1;
}
message TriggerCmd{
\tCMDDirect cmd = 1;
}
message SetZeroing{
\tint32 x = 1; //x1000 125 increments [-600000..600000]
\tint32 y = 2; //x1000 125 increments [-600000..600000]
}

message HostDevStatus {
    int32 charge = 1; // Represented as percentage
\tZoom zoom = 2; // zoom multiplier
\tint32 airTemp = 3; //-100..100 C°
\tint32 airHum = 4;\t//0..100%
\tint32 airPress = 5; //3000..12000 decaPascal
\tint32 powderTemp = 6; //-100..100 C°
\tint32 windDir = 7; //0..359 °
\tint32 windSpeed = 8; //0..200 deciMeter per second
\tint32 pitch = 9; //-90..90 °
\tint32 cant = 10; //-90..90 °
\tint32 distance = 11; //deciMeter
\tint32 currentProfile = 12; //profile index
\tColorScheme colorScheme = 13;
\tAGCMode modAGC = 14;
\tZoom maxZoom = 15;
}

message ClientDevStatus {
}

enum ColorScheme {
\tUNKNOWN_COLOR_SHEME = 0;
    SEPIA = 1;
    BLACK_HOT = 2;
    WHITE_HOT = 3;
}

enum AGCMode {
\tUNKNOWN_AGC_MODE = 0;
\tAUTO_1 = 1;
\tAUTO_2 = 2;
\tAUTO_3 = 3;
}

enum Zoom {
\tUNKNOWN_ZOOM_LEVEL = 0;
\tZOOM_X1 = 1;
\tZOOM_X2 = 2;
\tZOOM_X3 = 3;
\tZOOM_X4 = 4;
\tZOOM_X6 = 5;
}

enum ButtonEnum {
\tUNKNOWN_BUTTON = 0;
\tMENU_SHORT = 1;
\tMENU_LONG = 2;
\tUP_SHORT = 3;
\tUP_LONG = 4;
\tDOWN_SHORT = 5;
\tDOWN_LONG = 6;
\tLRF_SHORT = 7;
\tLRF_LONG = 8;
\tREC_SHORT = 9;
\tREC_LONG = 10;
}

enum CMDDirect {
\tUNKNOWN_CMD_DIRECTION = 0;
\tCALIBRATE_ACCEL_GYRO = 1;
\tLRF_MEASUREMENT = 2;
\tRESET_CM_CLICKS = 3;
\tTRIGGER_FFC = 4;
}

message CoefRow {
\tint32 bc_cd = 1;
\tint32 mv = 2;
}

enum DType {
\tVALUE = 0;
\tINDEX = 1;
}

message SwPos {
\tint32 c_idx = 1;
\tint32 reticle_idx = 2;
\tint32 zoom = 3;
\tint32 distance = 4;
\tDType distance_from = 5;
}

enum GType {
\tG1 = 0;
\tG7 = 1;
\tCUSTOM = 2;
}

enum TwistDir {
\tRIGHT = 0;
\tLEFT = 1;
}

message HostProfile {
\tstring profile_name = 1;
\tstring cartridge_name = 2;
\tstring bullet_name = 3;
\tstring short_name_top = 4;
\tstring short_name_bot = 5;
\tstring user_note = 6;
\tint32 zero_x = 7;
\tint32 zero_y = 8;
\tint32 sc_height = 9;
\tint32 r_twist = 10;
\tint32 c_muzzle_velocity = 11;
\tint32 c_zero_temperature = 12;
\tint32 c_t_coeff = 13;
\tint32 c_zero_distance_idx = 14;
\tint32 c_zero_air_temperature = 15;
\tint32 c_zero_air_pressure = 16;
\tint32 c_zero_air_humidity = 17;
\tint32 c_zero_w_pitch = 18;
\tint32 c_zero_p_temperature = 19;
\tint32 b_diameter = 20;
\tint32 b_weight = 21;
\tint32 b_length = 22;
\tTwistDir twist_dir = 23;
\tGType bc_type = 24;
\trepeated SwPos switches = 25;
\trepeated int32 distances = 26;
\trepeated CoefRow coef_rows = 27;
\tstring caliber = 28;
\tstring device_uuid = 29;
}


message ProfileList {
\trepeated ProfileListEntry profile_desc = 1;
\tint32 activeprofile = 2;
}

message ProfileListEntry {
\tstring profile_name = 1;
\tstring cartridge_name = 2;
\tstring short_name_top = 3;
\tstring short_name_bot = 4;
\tstring file_path = 5;
}

message FullProfileData{
\tProfileList table = 1;
\trepeated HostProfile profiles = 2;
}
message Reticle{
\tbytes data = 1;
\tstring folder_name = 2;
}

message Reticles{
\trepeated Reticle rets = 1;
}

message Payload {
\tHostProfile profile = 1;
}`;

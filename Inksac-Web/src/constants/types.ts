// api types-----------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  errors: ApiError[];
  has_errors: boolean;
}

export interface ApiError {
  property: string;
  message: string;
}

// ws types-------------------------------------------------------------------------------

export enum WSType {
  STROKE = "stroke",
  READY = "ready",
  UNDO = "undo",
  REDO = "redo",
}

export interface WSMessage {
  Mtype: WSType;
  data: any;
}

export enum WSCodes {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  INTERNAL_SERVER_ERROR = 1011,
  UNEXPECTED_ERROR = 1006,
  POLICY_VIOLATION = 1008,
  FORCE_DC = 4001,
}

// user types ----------------------------------------------------------------------------

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}

export interface UserGetDto {
  id: number;
  username: string;
  role: UserRole;
  pfp_path: string;
  has_room: boolean;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface UserCreateDto {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface UserShallowDto {
  id: number;
  username: string;
  pfp_path: string;
  has_room: boolean;
}

// brush types ------------------------------------------------------------------------------------

export enum RotationMode {
  NONE = "none",
  RANDOM = "random",
  FOLLOWSTROKE = "followstroke",
}

export enum BrushType {
  USER = "user",
  SYSTEM = "system",
}

export interface BrushGetDto {
  id: number;
  name: string;
  imgurl: string;
  spacing: number;
  rotation_mode: RotationMode;
  brush_type: BrushType;
  owner: UserShallowDto;
  in_use: boolean;
}

export interface BrushShallowDto {
  id: number;
  name: string;
  imgurl: string;
  spacing: number;
  rotation_mode: RotationMode;
  brush_type: BrushType;
  in_use: boolean;
}

export interface BrushCreateDto {
  name: string;
  spacing: number;
  rotation_mode: RotationMode;
}

export interface BrushUpdateDto {
  name: string;
  spacing: number;
  rotation_mode: RotationMode;
}

// room types --------------------------------------------------------------------------------------

export interface RoomGetDto {
  id: number;
  name: string;
  width: number;
  height: number;
  imgurl: string | null;
  expiration: string;
  owner: UserShallowDto;
  user_count: number;
}

export interface RoomShallowDto {
  id: number;
  name: string;
  expiration: string;
}

export interface RoomCreateDto {
  name: string;
  width: number;
  height: number;
}

export interface RoomUpdateDto {
  name: string;
}

// stroke types ---------------------------------------------------------------------------------

export interface StrokeGetDto {
  id: number;
  tempid: string | null;
  color: string;
  opacity: number;
  iseraser: boolean;
  scale: number;
  created_at: string;
  points: BrushCoord[];
  creator_id: number;
  brush: BrushShallowDto;
  room_id: number;
}

export interface StrokeCreateDto {
  color: string;
  opacity: number;
  iseraser: boolean;
  scale: number;
  points: BrushCoord[];
}

export interface BrushCoord {
  x: number;
  y: number;
}

// export interface StrokeData {
//   tempid: string;
//   points: BrushCoord[];
//   color: string;
//   scale: number;
//   opacity: number;
// }

export interface StrokeData {
  tempid: string;
  points: BrushCoord[];
  color: string;
  opacity: number;
  iseraser: boolean;
  scale: number;
  brushid: number;
}

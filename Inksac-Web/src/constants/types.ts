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
}

// brush types ------------------------------------------------------------------------------------

export enum RotationMode {
  NONE = "none",
  RANDOM = "random",
  FOLLOWSTROKE = "followstroke",
}

export interface BrushGetDto {
  id: number;
  name: string;
  imgurl: string;
  spacing: number;
  scale: number;
  opacity: number;
  rotation_mode: RotationMode;
  owner: UserShallowDto;
  in_use: boolean;
}

export interface BrushShallowDto {
  id: number;
  name: string;
  imgurl: string;
  spacing: number;
  scale: number;
  opacity: number;
  rotation_mode: RotationMode;
  in_use: boolean;
}

export interface BrushCreateDto {
  name: string;
  spacing: number;
  scale: number;
  opacity: number;
  rotation_mode: RotationMode;
}

export interface BrushUpdateDto {
  name: string;
  spacing: number;
  scale: number;
  opacity: number;
  rotation_mode: RotationMode;
}

// room types --------------------------------------------------------------------------------------

export interface RoomGetDto {
  id: number;
  name: string;
  expiration: string;
  owner: UserShallowDto;
}

export interface RoomShallowDto {
  id: number;
  name: string;
  expiration: string;
}

export interface RoomCreateDto {
  name: string;
}

export interface RoomUpdateDto {
  name: string;
}

// stroke types ---------------------------------------------------------------------------------

export interface StrokeGetDto {
  id: number;
  color: string;
  created_at: string;
  points: [number[]];
  creator_id: number;
  brush: BrushShallowDto;
  room_id: number;
}

export interface StrokeCreateDto {
  color: string;
  points: [number[]];
}

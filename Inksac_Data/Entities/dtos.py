from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from Inksac_Data.Common.Role import Role
from Inksac_Data.Common.BrushType import BrushType
from Inksac_Data.Common.Rotation import RotationMode

class LoginDto(BaseModel):
    username: str
    password: str

class UserCreateDto(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

class UserGetDto(BaseModel):
    id: int
    username: str
    role: Role
    pfp_path: str
    has_room: bool
    allowed_room_ids: List[int]

class UserShallowDto(BaseModel):
    id: int
    username: str
    pfp_path: str
    has_room: bool

class StrokePointDto(BaseModel):
    x: float
    y: float
    pressure: float
    size: float

class StrokeGetDto(BaseModel):
    id: int
    tempid: Optional[str] = ""
    color: str
    opacity: float
    iseraser: bool
    scale: int
    created_at: datetime
    points: List[StrokePointDto]
    creator_id: int
    brush: BrushShallowDto
    room_id: int
    layer_id: int

class StrokeCreateDto(BaseModel):
    color: str
    opacity: float
    iseraser: bool
    scale: int
    points: List[StrokePointDto]

class StrokeData(BaseModel):
    tempid: str
    points: List[StrokePointDto]
    color: str
    opacity: float
    scale: int
    brushid: int
    iseraser: bool
    layerid: int

class RoomCreateUpdateDto(BaseModel):
    name: str
    width: int
    height: int
    canvas_color: str
    private: bool

class RoomRenameDto(BaseModel):
    name: str

class RoomGetDto(BaseModel):
    id: int
    name: str
    width: int
    height: int
    imgurl: str | None
    expiration: datetime
    owner: UserShallowDto
    user_count: int
    canvas_color: str
    private: bool
    allowed_user_ids: List[int]

class RoomShallowDto(BaseModel):
    id: int
    name: str
    width: int
    height: int
    expiration: datetime
    canvas_color: str
    private: bool

class LayerGetDto(BaseModel):
    id: int
    name: str
    locked: bool
    position: int
    room_id: int
    opacity: float
    x: float
    y: float

class LayerCreateDto(BaseModel):
    name: str

class LayerUpdateDto(BaseModel):
    name: Optional[str] = None
    locked: Optional[bool] = None
    opacity: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None

class LayerReorderDto(BaseModel):
    ordered_layer_ids: list[int]

class BrushCreateDto(BaseModel):
    name: str
    spacing: float
    rotation_mode: RotationMode
    rotation_jitter: float

class BrushUpdateDto(BaseModel):
    name: str
    spacing: float
    rotation_mode: RotationMode
    rotation_jitter: float

class BrushGetDto(BaseModel):
    id: int
    name: str
    imgurl: str
    spacing: float
    rotation_mode: RotationMode
    rotation_jitter: float
    brush_type: BrushType
    owner: Optional[UserShallowDto]
    in_use: bool

class BrushShallowDto(BaseModel):
    id: int
    name: str
    imgurl: str
    spacing: float
    rotation_mode: RotationMode
    rotation_jitter: float
    brush_type: BrushType
    in_use: bool

class ReadyDataDto(BaseModel):
    layers: list[LayerGetDto]
    strokes: list[StrokeGetDto]
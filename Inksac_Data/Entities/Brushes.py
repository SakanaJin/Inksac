from sqlalchemy import Column, Integer, Float, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import Optional

from Inksac_Data.database import Base
from Inksac_Data.Common.Rotation import RotationMode
from Inksac_Data.Common.BrushType import BrushType
from Inksac_Data.Entities.Users import UserShallowDto

DEFAULT_BRUSH = "/user/brush/softShape.png"

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

class Brush(Base):
    __tablename__ = "brushes"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    imgurl = Column(String(255), nullable=False, default=DEFAULT_BRUSH)
    spacing = Column(Float, nullable=False) # this might not be necessary
    rotation_mode = Column(Enum(RotationMode), nullable=False, default=RotationMode.FOLLOWSTROKE)
    rotation_jitter = Column(Float, nullable=False, default=100.0)
    brush_type = Column(Enum(BrushType), nullable=False, default=BrushType.USER)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="brushes")

    rooms = relationship("Room", back_populates="brushes", secondary="usedbrushes")

    def toGetDto(self) -> BrushGetDto:
        owner = None
        if self.owner:
            owner = self.owner.toShallowDto()
        brushdto = BrushGetDto(
            id=self.id,
            name=self.name,
            imgurl=self.imgurl,
            spacing=self.spacing,
            rotation_mode=self.rotation_mode,
            rotation_jitter=self.rotation_jitter,
            brush_type=self.brush_type,
            owner=owner,
            in_use=bool(self.rooms)
        )
        return brushdto
    
    def toShallowDto(self) -> BrushShallowDto:
        brushdto = BrushShallowDto(
            id=self.id,
            name=self.name,
            imgurl=self.imgurl,
            spacing=self.spacing,
            rotation_mode=self.rotation_mode,
            rotation_jitter=self.rotation_jitter,
            brush_type=self.brush_type,
            in_use=bool(self.rooms)
        )
        return brushdto
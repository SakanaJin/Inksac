from sqlalchemy import Column, Integer, Float, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from Inksac_Data.database import Base
from Inksac_Data.Common.Rotation import RotationMode
from Inksac_Data.Entities.Users import UserShallowDto

DEFAULT_BRUSH = "/media/user/brush/softShape.png"

class BrushCreateDto(BaseModel):
    name: str
    spacing: float
    scale: float
    opacity: float
    rotation_mode: RotationMode

class BrushUpdateDto(BaseModel):
    name: str
    spacing: float
    scale: float
    opacity: float
    rotation_mode: RotationMode

class BrushGetDto(BaseModel):
    id: int
    name: str
    imgurl: str
    spacing: float
    scale: float
    opacity: float
    rotation_mode: RotationMode
    owner: UserShallowDto

class BrushShallowDto(BaseModel):
    id: int
    name: str
    imgurl: str
    spacing: float
    scale: float
    opacity: float
    rotation_mode: RotationMode

class Brush(Base):
    __tablename__ = "brushes"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    imgurl = Column(String(255), nullable=False, default=DEFAULT_BRUSH)
    spacing = Column(Float, nullable=False) # this might not be necessary
    scale = Column(Float, nullable=False)
    opacity = Column(Float, nullable=False)
    rotation_mode = Column(Enum(RotationMode), nullable=False, default=RotationMode.FOLLOWSTROKE)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="brushes")

    def toGetDto(self) -> BrushGetDto:
        brushdto = BrushGetDto(
            id=self.id,
            name=self.name,
            imgurl=self.imgurl,
            spacing=self.spacing,
            scale=self.scale,
            opacity=self.opacity,
            rotation_mode=self.rotation_mode,
            owner=self.owner.toShallowDto()
        )
        return brushdto
    
    def toShallowDto(self) -> BrushShallowDto:
        brushdto = BrushShallowDto(
            id=self.id,
            name=self.name,
            imgurl=self.imgurl,
            spacing=self.spacing,
            scale=self.scale,
            opacity=self.opacity,
            rotation_mode=self.rotation_mode,
        )
        return brushdto
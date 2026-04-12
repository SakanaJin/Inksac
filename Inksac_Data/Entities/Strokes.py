from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Optional

from Inksac_Data.database import Base
from Inksac_Data.Entities.Brushes import BrushShallowDto

Point = Dict[str, float]

class StrokeGetDto(BaseModel):
    id: int
    tempid: Optional[str] = ""
    color: str
    opacity: float
    iseraser: bool
    scale: int
    created_at: datetime
    points: List[Point]
    creator_id: int
    brush: BrushShallowDto
    room_id: int
    layer_id: int

class StrokeCreateDto(BaseModel):
    color: str
    opacity: float
    iseraser: bool
    scale: int
    points: List[Point]

class StrokeData(BaseModel):
    tempid: str
    points: List[Point]
    color: str
    opacity: float
    scale: int
    brushid: int
    iseraser: bool
    layerid: int

class Stroke(Base):
    __tablename__ = "strokes"
    id = Column(Integer, primary_key=True)
    points = Column(JSON, nullable=False)
    color = Column(String(25), nullable=False)
    opacity = Column(Float, nullable=False, default=1.00)
    created_at = Column(DateTime(timezone=True), default=datetime.now(), nullable=False)
    deleted = Column(Boolean, default=False)
    iseraser = Column(Boolean, default=False)
    scale = Column(Integer, nullable=False)

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    brush_id = Column(Integer, ForeignKey("brushes.id"), nullable=False)
    brush = relationship("Brush", back_populates=None)

    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    room = relationship("Room", back_populates="strokes")

    layer_id = Column(Integer, ForeignKey("layers.id", ondelete="CASCADE"), nullable=False)
    layer = relationship("Layer", back_populates="strokes")

    def toGetDto(self, tempid: str = None) -> StrokeGetDto:
        strokedto = StrokeGetDto(
            id=self.id,
            tempid=tempid,
            color=self.color,
            opacity=self.opacity,
            iseraser=self.iseraser,
            scale=self.scale,
            created_at=self.created_at,
            points=self.points,
            creator_id=self.creator_id,
            room_id=self.room_id,
            brush=self.brush.toShallowDto(),
            layer_id=self.layer_id
        )
        return strokedto
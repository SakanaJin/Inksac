from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime
from typing import List

from Inksac_Data.database import Base
from Inksac_Data.Entities.Brushes import BrushShallowDto

Point = list[float]

class StrokeGetDto(BaseModel):
    id: int
    color: str
    created_at: datetime
    points: List[Point]
    creator_id: int
    brush: BrushShallowDto
    room_id: int

class StrokeCreateDto(BaseModel):
    color: str
    points: List[Point]

class Stroke(Base):
    __tablename__ = "strokes"
    id = Column(Integer, primary_key=True)
    points = Column(JSON, nullable=False)
    color = Column(String(9), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(), nullable=False)

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    brush_id = Column(Integer, ForeignKey("brushes.id"), nullable=False)
    brush = relationship("Brush", back_populates=None)

    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    room = relationship("Room", back_populates="strokes")

    def toGetDto(self) -> StrokeGetDto:
        strokedto = StrokeGetDto(
            id=self.id,
            color=self.color,
            created_at=self.created_at,
            points=self.points,
            creator_id=self.creator_id,
            room_id=self.room_id,
            brush=self.brush.toShallowDto()
        )
        return strokedto
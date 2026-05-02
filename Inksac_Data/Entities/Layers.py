from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship

from Inksac_Data.database import Base
from Inksac_Data.Entities.dtos import LayerGetDto

class Layer(Base):
    __tablename__ = "layers"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    locked = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=0)
    opacity = Column(Float, nullable=False, default=1.0)
    x = Column(Float, nullable=False, default=0.0)
    y = Column(Float, nullable=False, default=0.0)

    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    room = relationship("Room", back_populates="layers")

    strokes = relationship(
        "Stroke",
        back_populates="layer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def toGetDto(self) -> LayerGetDto:
        return LayerGetDto(
            id=self.id,
            name=self.name,
            locked=self.locked,
            position=self.position,
            room_id=self.room_id,
            opacity=self.opacity,
            x=self.x,
            y=self.y,
        )
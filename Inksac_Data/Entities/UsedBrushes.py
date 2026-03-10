from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from Inksac_Data.database import Base

class UsedBrushes(Base):
    __tablename__ = "usedbrushes"
    brush_id = Column(Integer, ForeignKey("brushes.id"), primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
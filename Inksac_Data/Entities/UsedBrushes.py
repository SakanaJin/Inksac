from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from Inksac_Data.database import Base

class UsedBrushes(Base):
    __tablename__ = "usedbrushes"
    id = Column(Integer, primary_key=True)
    brush_id = Column(Integer, ForeignKey("brushes.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    UniqueConstraint("brush_id", "room_id", name="uq_usedbrushes")
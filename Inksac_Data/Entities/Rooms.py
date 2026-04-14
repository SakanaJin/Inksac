from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime, timedelta

from Inksac_Data.Common.WSManager import WSManager
from Inksac_Data.database import Base
from Inksac_Data.Entities.Users import UserShallowDto

def round_nearest_hour(time: datetime) -> datetime:
    return (time.replace(second=0, microsecond=0, minute=0, hour=time.hour) + timedelta(hours=time.minute//30))

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

class RoomShallowDto(BaseModel):
    id: int
    name: str
    width: int
    height: int
    expiration: datetime
    canvas_color: str
    private: bool

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    width = Column(Integer, nullable=False, default=2000)
    height = Column(Integer, nullable=False, default=2000)
    canvas_color = Column(String(20), nullable=False, default="#ffffff")
    imgurl = Column(String(500), nullable=True)
    expiration = Column(DateTime(timezone=True), default=round_nearest_hour(datetime.now() + timedelta(days=1)))
    private = Column(Boolean, nullable=False, default=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="room")

    strokes = relationship("Stroke", back_populates="room", cascade="all, delete-orphan", passive_deletes=True)

    layers = relationship("Layer", back_populates="room", cascade="all, delete-orphan", passive_deletes=True, order_by="Layer.position")

    brushes = relationship("Brush", back_populates="rooms", secondary="usedbrushes")

    allowed_users = relationship("User", back_populates="allowed_rooms", secondary="allowedusers")

    def toGetDto(self) -> RoomGetDto:
        roomdto = RoomGetDto(
            id=self.id,
            name=self.name,
            width=self.width,
            height=self.height,
            imgurl=self.imgurl,
            expiration=self.expiration,
            owner=self.owner.toShallowDto(),
            user_count=len(WSManager.rooms.get(self.id, {})),
            canvas_color=self.canvas_color,
            private=self.private
        )
        return roomdto
    
    def toShallowDto(self) -> RoomShallowDto:
        roomdto = RoomShallowDto(
            id=self.id,
            name=self.name,
            width=self.width,
            height=self.height,
            expiration=self.expiration,
            canvas_color=self.canvas_color,
            private=self.private
        )
        return roomdto
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime, timedelta

from Inksac_Data.database import Base
from Inksac_Data.Entities.Users import UserShallowDto

class RoomCreateUpdateDto(BaseModel):
    name: str

class RoomGetDto(BaseModel):
    id: int
    name: str
    expiration: datetime
    owner: UserShallowDto

class RoomShallowDto(BaseModel):
    id: int
    name: str
    expiration: datetime

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    expiration = Column(DateTime(timezone=True), default=datetime.now() + timedelta(days=1))

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="room")

    def toGetDto(self) -> RoomGetDto:
        roomdto = RoomGetDto(
            id=self.id,
            name=self.name,
            expiration=self.expiration,
            owner=self.owner.toShallowDto()
        )
        return roomdto
    
    def toShallowDto(self) -> RoomShallowDto:
        roomdto = RoomShallowDto(
            id=self.id,
            name=self.name,
            expiration=self.expiration
        )
        return roomdto

from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from Inksac_Data.database import Base
from Inksac_Data.Common.Role import Role
from Inksac_Data.Entities.dtos import UserGetDto, UserShallowDto

DEFAULT_PFP = "/user/pfp/default.png"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    role = Column(Enum(Role), default=Role.GUEST, nullable=False)
    pfp_path = Column(String(255), default=DEFAULT_PFP)
    created_at = Column(DateTime(timezone=True), default=datetime.now())

    brushes = relationship("Brush", back_populates="owner")
    brush_count = Column(Integer, default=0)

    room = relationship("Room", back_populates="owner", uselist=False)
    allowed_rooms = relationship("Room", back_populates="allowed_users", secondary="allowedusers")
    
    auth = relationship("UserAuth", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def toGetDto(self) -> UserGetDto:
        userdto = UserGetDto(
            id=self.id,
            username=self.username,
            role=self.role,
            pfp_path=self.pfp_path,
            has_room=bool(self.room),
            allowed_room_ids=[room.id for room in self.allowed_rooms]
        )
        return userdto
    
    def toShallowDto(self) -> UserShallowDto:
        userdto = UserShallowDto(
            id=self.id,
            username=self.username,
            pfp_path=self.pfp_path,
            has_room=bool(self.room)
        )
        return userdto
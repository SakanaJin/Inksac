from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from Inksac_Data.database import Base
from Inksac_Data.Common.Role import Role

DEFAULT_PFP = "/media/user/pfp/default.png"

class LoginDto(BaseModel):
    username: str
    password: str

class UserCreateDto(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

class UserGetDto(BaseModel):
    id: int
    username: str
    pfp_path: str

class UserShallowDto(BaseModel):
    id: int
    username: str
    pfp_path: str

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    role = Column(Enum(Role), default=Role.GUEST, nullable=False)
    pfp_path = Column(String(255), default=DEFAULT_PFP)

    brushes = relationship("Brush", back_populates="owner")
    brush_count = Column(Integer, default=0)
    
    auth = relationship("UserAuth", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def toGetDto(self) -> UserGetDto:
        userdto = UserGetDto(
            id=self.id,
            username=self.username,
            pfp_path=self.pfp_path
        )
        return userdto
    
    def toShallowDto(self) -> UserShallowDto:
        userdto = UserShallowDto(
            id=self.id,
            username=self.username,
            pfp_path=self.pfp_path
        )
        return userdto
from sqlalchemy import Column, Integer, ForeignKey

from Inksac_Data.database import Base

class AllowedUser(Base):
    __tablename__ = "allowedusers"
    userid = Column(Integer, ForeignKey("users.id"), primary_key=True)
    roomid = Column(Integer, ForeignKey("rooms.id"), primary_key=True)
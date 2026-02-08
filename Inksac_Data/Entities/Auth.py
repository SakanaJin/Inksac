from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel
import bcrypt

from Inksac_Data.database import Base

EMAIL_PATTERN = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$"

def create_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

class UserAuth(Base):
    __tablename__ = "auth"
    # witchcraft to get user.id and auth.id to be the same
    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    user = relationship("User", back_populates="auth")
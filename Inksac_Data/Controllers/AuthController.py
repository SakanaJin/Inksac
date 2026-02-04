from fastapi import APIRouter, Depends, HTTPException, Response as FastRes, Request, Cookie
from sqlalchemy.orm import Session
from typing import Optional
import bcrypt
import itsdangerous

from Inksac_Data.database import get_db, SECRET_KEY
from Inksac_Data.Entities.Users import User, LoginDto
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.Role import Role

router = APIRouter(prefix="/api/auth", tags=["Auth"])

serializer = itsdangerous.URLSafeTimedSerializer(SECRET_KEY)
COOKIE_NAME = "session_token"
COOKIE_MAX_AGE = 60 * 60 * 24 # one day

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_session_token(user_id: int) -> str:
    return serializer.dumps({"user_id": user_id})

def verify_session_token(token: str) -> Optional[int]:
    try:
        data = serializer.loads(token, max_age=COOKIE_MAX_AGE)
        return data["user_id"]
    except itsdangerous.BadSignature:
        return None
    
def get_current_user(session_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)) -> Optional[User]:
    response = Response()
    if not session_token:
        response.add_error("cookie", "not authenticated")
        raise HttpException(status_code=401, response=response)
    user_id = verify_session_token(session_token)
    if not user_id:
        response.add_error("cookie", "Invalid or expired token")
        raise HttpException(status_code=401, response=response)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        response.add_error("id", "user not found")
        raise HttpException(status_code=404, response=response)
    return user

def require_admin(user: User = Depends(get_current_user)) -> Optional[User]:
    response = Response()
    if user.role != Role.ADMIN:
        response.add_error("role", "Admin only")
        raise HttpException(status_code=403, response=response)
    return user

def require_not_guest(user: User = Depends(get_current_user)) -> Optional[User]:
    response = Response()
    if user.role == Role.GUEST:
        response.add_error("role", "Guests prohibited")
        raise HttpException(status_code=403, response=response)
    return user

@router.get("/get-current-user")
def get_current_user_endpoint(user: User = Depends(get_current_user)):
    response = Response()
    response.data = user.toGetDto()
    return response

@router.post("/logout")
def user_logout(fastres: FastRes):
    response = Response()
    fastres.delete_cookie(COOKIE_NAME)
    response.data = True
    return response

@router.post("/login")
def user_login(fastres: FastRes, logindto: LoginDto, db: Session = Depends(get_db)):
    response = Response()
    user = db.query(User).filter(User.username == logindto.username).first()
    if not user or not verify_password(logindto.password, user.auth.password_hash):
        response.add_error("password", "Username or password is incorrect")
        raise HttpException(status_code=401, response=response)
    token = create_session_token(user.id)
    fastres.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
        secure=False, # chnange to true for HTTPS
    )
    response.data = True
    return response


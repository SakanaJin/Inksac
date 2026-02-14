from fastapi import APIRouter, Depends, HTTPException, Response as FastRes, Request, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from typing import Optional
import bcrypt
import itsdangerous
from uuid import uuid4
from datetime import datetime
import re

from Inksac_Data.database import get_db, SECRET_KEY
from Inksac_Data.Entities.Users import User, LoginDto, UserCreateDto
from Inksac_Data.Entities.Auth import UserAuth, create_password_hash, EMAIL_PATTERN
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.Role import Role

router = APIRouter(prefix="/api/auth", tags=["Auth"])

serializer = itsdangerous.URLSafeTimedSerializer(SECRET_KEY)
COOKIE_NAME = "session_token"
COOKIE_MAX_AGE = 60 * 60 * 24 # one day
MAX_GUEST_ATTEMPTS = 5
MAXGUESTS = 10

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
def user_logout(fastres: FastRes, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    fastres.delete_cookie(COOKIE_NAME)
    if user.role == Role.GUEST:
        db.delete(user)
        db.commit()
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

@router.post("/guest")
def create_guest(fastres: FastRes, db: Session = Depends(get_db)):
    response = Response()
    guestcount = db.scalar(select(func.count(User.id)).filter(User.role == Role.GUEST))
    if guestcount >= MAXGUESTS:
        response.add_error("guest", "too many guests")
        raise HttpException(status_code=503, response=response)
    user = None
    for _ in range(MAX_GUEST_ATTEMPTS):
        try:
            user = User(
                username=f"Guest#{uuid4().hex[:5]}",
                role=Role.GUEST,
                created_at=datetime.now()
            )
            db.add(user)
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            user = None
    if not user:
        response.add_error("username", "unable to generate guest username")
        raise HttpException(status_code=500, response=response)
    token = create_session_token(user.id)
    fastres.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
        secure=False,
    )
    response.data = True
    return response

@router.post("/guest/upgrade")
def upgrade_guest(userdto: UserCreateDto, db: Session = Depends(get_db), guest: User = Depends(get_current_user)):
    response = Response()
    if len(userdto.username) == 0:
        response.add_error("username", "username cannot be empty")
    if len(userdto.email) == 0:
        response.add_error("email", "email cannot be empty")
    if not re.fullmatch(EMAIL_PATTERN, userdto.email):
        response.add_error("email", "invalid email")
    if len(userdto.password) == 0:
        response.add_error("password", "password cannot be empty")
    if userdto.password != userdto.confirm_password:
        response.add_error("confirm_password", "password fields do not match")
    if response.has_errors:
        raise HttpException(status_code=400, response=response)
    guest.username = userdto.username
    guest.role = Role.USER
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        response.add_error("username", "username already taken")
        raise HttpException(status_code=400, response=response)
    auth = UserAuth(
        id=guest.id,
        email=userdto.email,
        password_hash=create_password_hash(userdto.password)
    )
    db.add(auth)
    try:
        db.commit()
        db.refresh(guest)
        response.data = guest.toGetDto()
        return response
    except IntegrityError:
        db.rollback()
        response.add_error("email", "email has already been used")
        raise HttpException(status_code=400, response=response)
from fastapi import APIRouter, Depends, File, UploadFile, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import os
import uuid
import re
from datetime import datetime

from Inksac_Data.Entities.Users import User, UserCreateDto, DEFAULT_PFP
from Inksac_Data.Entities.Auth import UserAuth, create_password_hash, EMAIL_PATTERN
from Inksac_Data.Controllers.AuthController import require_admin, get_current_user, require_not_guest
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.Role import Role
from Inksac_Data.database import get_db, ROOT

PFP_PATH = "/media/user/pfp"
MAX_PFP_SIZE = 5 * 1024 * 1024 # 5MB

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("")
def create_user(userdto: UserCreateDto, db: Session = Depends(get_db)):
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
    user = User(username=userdto.username, role=Role.USER, created_at=datetime.now())
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        response.add_error("username", "username already taken")
        raise HttpException(status_code=400, response=response)
    auth = UserAuth(
        id=user.id,
        email=userdto.email,
        password_hash=create_password_hash(userdto.password)
    )
    db.add(auth)
    try:
        db.commit()
        db.refresh(user)
        response.data = user.toGetDto()
        return response
    except IntegrityError:
        db.rollback()
        response.add_error("email", "email has already been used")
        raise HttpException(status_code=400, response=response)

@router.get("")
def get_all_users(db: Session = Depends(get_db)):
    response = Response()
    users = db.query(User).all()
    response.data = [user.toGetDto() for user in users]
    return response

@router.get("/{id}")
def get_user_by_id(id: int, db: Session = Depends(get_db)):
    response = Response()
    user = db.query(User).filter(User.id == id).first()
    if not user:
        response.add_error("id", "user not found")
        raise HttpException(status_code=404, response=response)
    response.data = user.toGetDto()
    return response

@router.patch("/pfp")
async def update_pfp(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(require_not_guest)):
    response = Response()
    if not file.content_type.startswith("image/"):
        response.add_error("File", "File must be an image")
        raise HttpException(status_code=400, response=response)
    filesize = request.headers.get("content-length")
    if filesize and int(filesize) > MAX_PFP_SIZE:
        response.add_error("File", "File size too large")
        raise HttpException(status_code=413, response=response)
    extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{extension}"
    filepath = os.path.join(PFP_PATH, filename)
    if user.pfp_path != DEFAULT_PFP:
        os.remove(ROOT / user.pfp_path[1:])
    with open(ROOT / filepath[1:], "wb") as f:
        f.write(await file.read())
    user.pfp_path = filepath
    db.commit()
    response.data = user.toGetDto()
    return response

@router.delete("/pfp")
def remove_pfp(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if user.pfp_path == DEFAULT_PFP:
        response.add_error("pfp", "no pfp")
        raise HttpException(status_code=400, response=response)
    os.remove(ROOT / user.pfp_path[1:])
    user.pfp_path = DEFAULT_PFP
    db.commit()
    response.data = user.toGetDto()
    return response

@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    response = Response()
    user = db.query(User).filter(User.id == id).first()
    if not user:
        response.add_error("id", "user not found")
        raise HttpException(status_code=404, response=response)
    if user.pfp_path != DEFAULT_PFP:
        os.remove(ROOT / user.pfp_path[1:])
    db.delete(user)
    db.commit()
    response.data = True
    return response
from fastapi import APIRouter, Depends, File, UploadFile, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import uuid

from Inksac_Data.database import get_db, MEDIA_DIR
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.WSManager import WSManager
from Inksac_Data.Controllers.AuthController import get_current_user, require_not_guest
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Rooms import Room, RoomCreateUpdateDto, round_nearest_hour

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

@router.get("")
def get_all(db: Session = Depends(get_db)):
    response = Response()
    rooms = db.query(Room).all()
    response.data = [room.toGetDto() for room in rooms]
    return response

@router.get("/{id}")
def get_by_id(id: int, db: Session = Depends(get_db)):
    response = Response()
    room = db.query(Room).filter(Room.id == id).first()
    if not room:
        response.add_error("id", "room not found")
        raise HttpException(status_code=404, response=response)
    response.data = room.toGetDto()
    return response

@router.post("")
def create(roomdto: RoomCreateUpdateDto, db: Session = Depends(get_db), user: User = Depends(require_not_guest)):
    response = Response()
    roomcount = db.query(Room).count()
    if roomcount >= 10:
        response.add_error("room", "too many rooms in server")
        raise HttpException(status_code=503, response=response)
    if len(roomdto.name) == 0:
        response.add_error("name", "name cannot be empty")
        raise HttpException(status_code=400, response=response)
    if roomdto.width < 256:
        response.add_error("width", f"width must be at least {256}")
        raise HttpException(status_code=400, response=response)
    if roomdto.height < 256:
        response.add_error("height", f"height must be at least {256}")
        raise HttpException(status_code=400, response=response)
    if roomdto.width > 8192:
        response.add_error("width", f"width cannot be greater than {8192}")
        raise HttpException(status_code=400, response=response)
    if roomdto.height > 8192:
        response.add_error("height", f"height cannot be greater than {8192}")
        raise HttpException(status_code=400, response=response)
    if bool(user.room):
        response.add_error("room", "user already has an open room")
        raise HttpException(status_code=409, response=response)
    room = Room(
        name=roomdto.name,
        width=roomdto.width,
        height=roomdto.height,
        expiration=round_nearest_hour(datetime.now() + timedelta(days=1)),
        owner=user,
        imgurl=None
    )
    db.add(room)
    db.commit()
    response.data = room.toGetDto()
    return response

@router.patch("")
def update(roomdto: RoomCreateUpdateDto, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if len(roomdto.name) == 0:
        response.add_error("name", "name cannot be empty")
        raise HttpException(status_code=400, response=response)
    if not user.room:
        response.add_error("room", "you do not own this room")
        raise HttpException(status_code=403, response=response)
    user.room.name = roomdto.name
    db.commit()
    response.data = user.room.toGetDto()
    return response

@router.patch("/{id}/imgurl")
async def update_imgurl(
    id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    response = Response()

    if file.content_type not in ["image/png", "image/jpeg"]:
        response.add_error("file", "file must be a png or jpg image")
        raise HttpException(status_code=400, response=response)

    filesize = request.headers.get("content-length")
    if filesize and int(filesize) > 50 * 1024 * 1024: #50MB
        response.add_error("file", "file size too large")
        raise HttpException(status_code=413, response=response)

    room = db.query(Room).filter(Room.id == id).first()
    if not room:
        response.add_error("id", "room not found")
        raise HttpException(status_code=404, response=response)

    if room.owner_id != user.id:
        response.add_error("room", "you do not own this room")
        raise HttpException(status_code=403, response=response)

    extension = file.filename.split(".")[-1].lower()
    if extension == "jpeg":
        extension = "jpg"

    filename = f"{uuid.uuid4()}.{extension}"
    filepath = os.path.join("/user/room", filename)

    os.makedirs(MEDIA_DIR / "/user/room"[1:], exist_ok=True)

    if room.imgurl:
        old_path = MEDIA_DIR / room.imgurl[1:]
        if old_path.exists():
            os.remove(old_path)

    with open(MEDIA_DIR / filepath[1:], "wb") as f:
        f.write(await file.read())

    room.imgurl = filepath
    db.commit()
    response.data = room.toGetDto()
    return response

@router.delete("")
async def delete(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if not user.room:
        response.add_error("room", "you do not own this room")
        raise HttpException(status_code=403, response=response)

    if user.room.imgurl:
        img_path = MEDIA_DIR / user.room.imgurl[1:]
        if img_path.exists():
            os.remove(img_path)

    await WSManager.disconnect_room(roomid=user.room.id)
    db.delete(user.room)
    user.has_room = False
    db.commit()
    response.data = True
    return response
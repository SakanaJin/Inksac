from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from Inksac_Data.database import get_db
from Inksac_Data.Common.Response import Response, HttpException
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
    if len(roomdto.name) == 0:
        response.add_error("name", "name cannot be empty")
    if bool(user.room):
        response.add_error("room", "user already has an open room")
    if response.has_errors:
        raise HttpException(status_code=400, response=response)
    room = Room(
        name=roomdto.name,
        expiration=round_nearest_hour(datetime.now() + timedelta(days=1)),
        owner=user
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
    if not user.room:
        response.add_error("room", "user doesn't have an active room")
    if response.has_errors:
        raise HttpException(status_code=400, response=response)
    user.room.name = roomdto.name
    db.commit()
    response.data = user.room.toGetDto()
    return response

@router.delete("")
def delete(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if not user.room:
        response.add_error("room", "user doesn't have an active room")
        raise HttpException(status_code=400, response=response)
    db.delete(user.room)
    user.has_room = False
    db.commit()
    response.data = True
    return response
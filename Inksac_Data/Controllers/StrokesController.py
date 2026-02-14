from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from Inksac_Data.database import get_db
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.Role import Role
from Inksac_Data.Controllers.AuthController import get_current_user
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Strokes import Stroke, StrokeCreateDto
from Inksac_Data.Entities.Rooms import Room
from Inksac_Data.Entities.Brushes import Brush

router = APIRouter(prefix="/api/strokes", tags=["Strokes"])

@router.post("/room/{roomid}/brush/{brushid}")
def create(roomid: int, brushid: int, strokedto: StrokeCreateDto, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """this probably is not how stroke creation will be done. Endpoint for testing only"""
    response = Response()
    brush = db.query(Brush).filter(Brush.id == brushid).first()
    room = db.query(Room).filter(Room.id == roomid).first()
    if not brush:
        response.add_error("id", "brush not found")
    if not room:
        response.add_error("room", "room not found")
    if response.has_errors:
        raise HttpException(status_code=404, response=response)
    stroke = Stroke(
        points=strokedto.points,
        color=strokedto.color,
        created_at=datetime.now(),
        creator_id=user.id,
        brush=brush,
        brush_id=brushid,
        room_id=roomid,
    )
    room.brushes.append(brush)
    db.add(stroke)
    db.commit()
    response.data = stroke.toGetDto()
    return response

@router.get("")
def get_all(db: Session = Depends(get_db)):
    response = Response()
    strokes = db.query(Stroke).all()
    response.data = [stroke.toGetDto() for stroke in strokes]
    return response

@router.get("/room/{id}")
def get_by_room(id: int, db: Session = Depends(get_db)):
    response = Response()
    room = db.query(Room).filter(Room.id == id).first()
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)
    strokes = db.query(Stroke).filter(Stroke.room_id == id).order_by(Stroke.created_at).all()
    response.data = [stroke.toGetDto() for stroke in strokes]
    return response

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    stroke = db.query(Stroke).filter(Stroke.id == id).first()
    if not stroke:
        response.add_error("id", "stroke not found")
        raise HttpException(status_code=404, response=response)
    if stroke.creator_id != user.id and user.role != Role.ADMIN:
        response.add_error("creator", "user is not creator of stroke")
        raise HttpException(status_code=403, response=response)
    db.delete(stroke)
    db.commit()
    response.data = True
    return response
    
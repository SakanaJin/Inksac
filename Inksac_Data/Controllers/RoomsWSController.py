from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException, Depends
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from Inksac_Data.Common.WSManager import WSManager, WSMHandler, WSMTypes, WSMessage, WSCodes
from Inksac_Data.database import db_session
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Strokes import StrokeData, Stroke
from Inksac_Data.Entities.UsedBrushes import UsedBrushes
from Inksac_Data.Controllers.AuthController import get_current_user

router = APIRouter(prefix="/ws/rooms", tags=["RoomsWS"])

@router.websocket("/{roomid}")
async def room_websocket(websocket: WebSocket, roomid: int, user: User = Depends(get_current_user)):
    await WSManager.connect(roomid=roomid, userid=user.id, websocket=websocket)
    try:
        while True:
            m = await websocket.receive_json()
            try:
                message = WSMessage.model_validate(m)
            except ValidationError:
                continue
            await WSMHandler.handlers.get(message.Mtype, WSMHandler.handlers["not-found"])(
                message=message,
                roomid=roomid,
                userid=user.id, 
                websocket=websocket
            )
    except WebSocketDisconnect as e:
        if e.code != WSCodes.FORCE_DC:
            WSManager.disconnect(roomid=roomid, userid=user.id)
    except WebSocketException as e:
        if e.code != WSCodes.POLICY_VIOLATION:
            WSManager.disconnect(roomid=roomid, userid=user.id)
 
@WSMHandler.register(WSMTypes.READY)
async def onReady(message: WSMessage, roomid: int, websocket: WebSocket, **kwargs):
    if not message.data:
        return
    with db_session() as db:
        strokes = db.execute(
            select(Stroke)
            .where(Stroke.room_id == roomid)
            .where(Stroke.deleted == False)
        ).scalars().all()
        newMessage = WSMessage(Mtype=message.Mtype, data=[stroke.toGetDto() for stroke in strokes])
        await websocket.send_json(newMessage.model_dump(mode="json"))

@WSMHandler.register(WSMTypes.STROKE)
async def recieve_stroke(message: WSMessage, roomid: int, userid: int, **kwargs):
    try:
        strokeData = StrokeData.model_validate(message.data)
    except ValidationError:
        return #change this later maybe
    #maybe add check for the brush ? 
    with db_session() as db:
        stroke = Stroke(
            creator_id = userid,
            brush_id = strokeData.brushid,
            room_id = roomid,
            color = strokeData.color,
            opacity = strokeData.opacity,
            iseraser = strokeData.iseraser,
            created_at = datetime.now(),
            points = strokeData.points,
        )
        try:
            usedBrush = UsedBrushes(
                room_id=roomid,
                brush_id=strokeData.brushid
            )
            db.add(usedBrush)
            db.flush()
        except IntegrityError:
            db.rollback()
        db.add(stroke)
        db.commit()
        newMessage = WSMessage(Mtype=message.Mtype, data=stroke.toGetDto(tempid=strokeData.tempid))
        await WSManager.broadcast(roomid=roomid, message=newMessage)

@WSMHandler.register(WSMTypes.UNDO)
async def undo_stroke(message: WSMessage, roomid: int, **kwargs):
    if not isinstance(message.data, int):
        return 
    strokeid = message.data
    with db_session() as db:
        stroke = db.get(Stroke, strokeid)
        if not stroke:
            return #change this later maybe idk
        stroke.deleted = True
        db.commit()
    newMessage = WSMessage(Mtype=message.Mtype, data=strokeid)
    await WSManager.broadcast(roomid=roomid, message=newMessage)

@WSMHandler.register(WSMTypes.REDO)
async def redo_stroke(message: WSMessage, roomid: int, **kwargs):
    if not isinstance(message.data, int):
        return
    strokeid = message.data
    with db_session() as db:
        stroke = db.execute(
            select(Stroke)
            .where(Stroke.id == strokeid)
            .where(Stroke.deleted == True)
        ).scalar_one_or_none()
        if not stroke:
            return
        stroke.deleted = False
        db.commit()
        newMessage = WSMessage(Mtype=message.Mtype, data=stroke.toGetDto())
        await WSManager.broadcast(roomid=roomid, message=newMessage)

@WSMHandler.register("not-found")
async def notfound():
    pass
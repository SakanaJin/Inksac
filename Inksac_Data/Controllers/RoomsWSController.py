from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException, Depends
from pydantic import ValidationError, BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from Inksac_Data.Common.WSManager import WSManager, WSMHandler, WSMTypes, WSMessage, WSCodes
from Inksac_Data.database import db_session
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Strokes import StrokeData, Stroke, StrokeGetDto
from Inksac_Data.Entities.Layers import Layer, LayerGetDto
from Inksac_Data.Entities.UsedBrushes import UsedBrushes
from Inksac_Data.Controllers.AuthController import get_current_user


class ReadyDataDto(BaseModel):
    layers: list[LayerGetDto]
    strokes: list[StrokeGetDto]


router = APIRouter(prefix="/ws/rooms", tags=["RoomsWS"])

@router.websocket("/{roomid}")
async def room_websocket(websocket: WebSocket, roomid: int, user: User = Depends(get_current_user)):
    await WSManager.connect(roomid=roomid, userid=user.id, websocket=websocket)
    joinmessage = WSMessage(Mtype=WSMTypes.USERJOIN, data=user.toGetDto())
    await WSManager.broadcast(roomid=roomid, message=joinmessage, excludeuserid=user.id)
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
        leavemessage = WSMessage(Mtype=WSMTypes.USERLEAVE, data=user.id)
        await WSManager.broadcast(roomid=roomid, message=leavemessage)
    except WebSocketException as e:
        if e.code != WSCodes.POLICY_VIOLATION:
            WSManager.disconnect(roomid=roomid, userid=user.id)
            leavemessage = WSMessage(Mtype=WSMTypes.USERLEAVE, data=user.id)
            await WSManager.broadcast(roomid=roomid, message=leavemessage, excludeuserid=user.id)
 
@WSMHandler.register(WSMTypes.READY)
async def onReady(message: WSMessage, roomid: int, websocket: WebSocket, **kwargs):
    if not message.data:
        return
    with db_session() as db:
        layers = db.execute(
            select(Layer)
            .where(Layer.room_id == roomid)
            .order_by(Layer.position.asc(), Layer.id.asc())
        ).scalars().all()

        if len(layers) == 0:
            default_layer = Layer(
                name="Layer 1",
                position=0,
                room_id=roomid,
                locked=False,
                opacity=1.0,
            )
            db.add(default_layer)
            db.commit()

            layers = db.execute(
                select(Layer)
                .where(Layer.room_id == roomid)
                .order_by(Layer.position.asc(), Layer.id.asc())
            ).scalars().all()

        strokes = db.execute(
            select(Stroke)
            .where(Stroke.room_id == roomid)
            .where(Stroke.deleted == False)
            .order_by(Stroke.created_at.asc(), Stroke.id.asc())
        ).scalars().all()

        readyData = ReadyDataDto(
            layers=[layer.toGetDto() for layer in layers],
            strokes=[stroke.toGetDto() for stroke in strokes],
        )

        newMessage = WSMessage(Mtype=message.Mtype, data=readyData.model_dump(mode="json"))
        await websocket.send_json(newMessage.model_dump(mode="json"))

        userids = [id for id in WSManager.rooms[roomid].keys()]
        usersinroom = db.execute(
            select(User)
            .where(User.id.in_(userids))
        ).scalars().all()
        newerMessage = WSMessage(Mtype=WSMTypes.INITUSERS, data=[user.toGetDto() for user in usersinroom])
        await websocket.send_json(newerMessage.model_dump(mode="json"))

@WSMHandler.register(WSMTypes.STROKE)
async def recieve_stroke(message: WSMessage, roomid: int, userid: int, **kwargs):
    try:
        strokeData = StrokeData.model_validate(message.data)
    except ValidationError:
        return  # change this later maybe

    with db_session() as db:
        layer = db.execute(
            select(Layer)
            .where(Layer.id == strokeData.layerid)
            .where(Layer.room_id == roomid)
        ).scalar_one_or_none()

        if not layer:
            return

        if layer.locked:
            return

        stroke = Stroke(
            creator_id=userid,
            brush_id=strokeData.brushid,
            room_id=roomid,
            layer_id=strokeData.layerid,
            color=strokeData.color,
            opacity=strokeData.opacity,
            iseraser=strokeData.iseraser,
            scale=strokeData.scale,
            created_at=datetime.now(),
            points=strokeData.points,
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
        db.refresh(stroke)

        newMessage = WSMessage(
            Mtype=message.Mtype,
            data=stroke.toGetDto(tempid=strokeData.tempid)
        )
        await WSManager.broadcast(roomid=roomid, message=newMessage)

@WSMHandler.register(WSMTypes.UNDO)
async def undo_stroke(message: WSMessage, roomid: int, **kwargs):
    if not isinstance(message.data, int):
        return 
    strokeid = message.data
    with db_session() as db:
        stroke = db.get(Stroke, strokeid)
        if not stroke or stroke.room_id != roomid:
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
            .where(Stroke.room_id == roomid)
            .where(Stroke.deleted == True)
        ).scalar_one_or_none()
        if not stroke:
            return
        stroke.deleted = False
        db.commit()
        db.refresh(stroke)

        newMessage = WSMessage(
            Mtype=message.Mtype,
            data=stroke.toGetDto()
        )
    await WSManager.broadcast(roomid=roomid, message=newMessage)

@WSMHandler.register("not-found")
async def notfound():
    pass
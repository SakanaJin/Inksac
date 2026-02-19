from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException, Depends
from pydantic import ValidationError

from Inksac_Data.Common.WSManager import WSManager, WSMHandler, WSMTypes, WSMessage
from Inksac_Data.database import db_session
from Inksac_Data.Entities.Users import User
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
    except WebSocketDisconnect:
        WSManager.disconnect(roomid=roomid, userid=user.id)
    except WebSocketException as e:
        if e.code != 1008:
            WSManager.disconnect(roomid=roomid, userid=user.id)
 
@WSMHandler.register(WSMTypes.READY)
async def onReady(message: WSMessage, roomid: int, **kwargs):
    pass
    #this is where inital bgimg and stroke data will be sent

@WSMHandler.register(WSMTypes.STROKE)
async def recieve_stroke(message: WSMessage, roomid: int, websocket: WebSocket, **kwargs):
    await WSManager.broadcast(roomid=roomid, message=message, websocket=websocket)

@WSMHandler.register("not-found")
async def notfound():
    pass
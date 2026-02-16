from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from Inksac_Data.Common.WSManager import WSManager
from Inksac_Data.database import get_db
from Inksac_Data.Entities.Users import User
from Inksac_Data.Controllers.AuthController import get_current_user

router = APIRouter(prefix="/ws/rooms", tags=["RoomsWS"])

@router.websocket("/{roomid}")
async def room_websocket(websocket: WebSocket, roomid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    await WSManager.connect(roomid=roomid, websocket=websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await WSManager.broadcast(roomid=roomid, data=data, websocket=websocket)
    except WebSocketDisconnect:
        WSManager.disconnect(roomid=roomid, websocket=websocket)
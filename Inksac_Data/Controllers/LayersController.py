from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Inksac_Data.database import get_db
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Common.WSManager import WSManager, WSMessage, WSMTypes
from Inksac_Data.Controllers.AuthController import get_current_user
from Inksac_Data.Entities.Users import User
from Inksac_Data.Entities.Rooms import Room
from Inksac_Data.Entities.Layers import (
    Layer,
    LayerCreateDto,
    LayerUpdateDto,
    LayerReorderDto,
)

router = APIRouter(prefix="/api/layers", tags=["Layers"])


def get_room_layers(db: Session, roomid: int, for_update: bool = False):
    query = (
        db.query(Layer)
        .filter(Layer.room_id == roomid)
        .order_by(Layer.position.asc(), Layer.id.asc())
    )

    if for_update:
        query = query.with_for_update()

    return query.all()


def get_room_layer_dtos(db: Session, roomid: int):
    return [layer.toGetDto() for layer in get_room_layers(db, roomid)]


def require_room_owner(room: Room, user: User, response: Response):
    if room.owner_id != user.id:
        response.add_error("room", "you do not own this room")
        raise HttpException(status_code=403, response=response)


@router.get("/room/{roomid}")
def get_by_room(
    roomid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    room = db.query(Room).filter(Room.id == roomid).first()
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    response.data = get_room_layer_dtos(db, roomid)
    return response


@router.get("/room/{roomid}/permissions")
def get_room_permissions(
    roomid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    room = db.query(Room).filter(Room.id == roomid).first()
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    response.data = {
        "can_manage_layers": room.owner_id == user.id,
    }
    return response


@router.post("/room/{roomid}")
async def create(
    roomid: int,
    layerdto: LayerCreateDto,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    room = (
        db.query(Room)
        .filter(Room.id == roomid)
        .with_for_update()
        .first()
    )
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    require_room_owner(room, user, response)

    if len(layerdto.name.strip()) == 0:
        response.add_error("name", "layer name cannot be empty")
        raise HttpException(status_code=400, response=response)

    existing_layers = get_room_layers(db, roomid, for_update=True)
    next_position = len(existing_layers)

    layer = Layer(
        name=layerdto.name.strip(),
        locked=False,
        position=next_position,
        opacity=1.0,
        x=0.0,
        y=0.0,
        room_id=roomid,
    )
    db.add(layer)
    db.commit()

    next_layers = get_room_layer_dtos(db, roomid)
    response.data = next_layers

    await WSManager.broadcast(
        roomid=roomid,
        message=WSMessage(
            Mtype=WSMTypes.LAYERS_SYNC,
            data=next_layers,
        ),
    )

    return response


@router.patch("/{layerid}")
async def update(
    layerid: int,
    layerdto: LayerUpdateDto,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    layer = (
        db.query(Layer)
        .filter(Layer.id == layerid)
        .with_for_update()
        .first()
    )
    if not layer:
        response.add_error("layer", "layer not found")
        raise HttpException(status_code=404, response=response)

    room = db.query(Room).filter(Room.id == layer.room_id).first()
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    is_owner_managed_update = any(
        value is not None
        for value in [layerdto.name, layerdto.locked, layerdto.opacity]
    )

    if is_owner_managed_update:
        require_room_owner(room, user, response)

    if layerdto.name is not None:
        if len(layerdto.name.strip()) == 0:
            response.add_error("name", "layer name cannot be empty")
            raise HttpException(status_code=400, response=response)
        layer.name = layerdto.name.strip()

    if layerdto.locked is not None:
        layer.locked = layerdto.locked

    if layerdto.opacity is not None:
        if layerdto.opacity < 0 or layerdto.opacity > 1:
            response.add_error("opacity", "opacity must be between 0 and 1")
            raise HttpException(status_code=400, response=response)
        layer.opacity = layerdto.opacity

    if layerdto.x is not None:
        layer.x = layerdto.x

    if layerdto.y is not None:
        layer.y = layerdto.y

    db.commit()

    next_layers = get_room_layer_dtos(db, layer.room_id)
    response.data = next_layers

    await WSManager.broadcast(
        roomid=layer.room_id,
        message=WSMessage(
            Mtype=WSMTypes.LAYERS_SYNC,
            data=next_layers,
        ),
    )

    return response


@router.patch("/room/{roomid}/reorder")
async def reorder(
    roomid: int,
    reorderdto: LayerReorderDto,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    room = (
        db.query(Room)
        .filter(Room.id == roomid)
        .with_for_update()
        .first()
    )
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    require_room_owner(room, user, response)

    layers = get_room_layers(db, roomid, for_update=True)
    existing_ids = [layer.id for layer in layers]
    incoming_ids = reorderdto.ordered_layer_ids

    if sorted(existing_ids) != sorted(incoming_ids):
        response.add_error("layers", "reorder payload does not match room layers")
        raise HttpException(status_code=400, response=response)

    layer_map = {layer.id: layer for layer in layers}

    for index, layer_id in enumerate(incoming_ids):
        layer_map[layer_id].position = index

    db.commit()

    next_layers = get_room_layer_dtos(db, roomid)
    response.data = next_layers

    await WSManager.broadcast(
        roomid=roomid,
        message=WSMessage(
            Mtype=WSMTypes.LAYERS_SYNC,
            data=next_layers,
        ),
    )

    return response


@router.delete("/{layerid}")
async def delete_layer(
    layerid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    response = Response()

    layer = (
        db.query(Layer)
        .filter(Layer.id == layerid)
        .with_for_update()
        .first()
    )
    if not layer:
        response.add_error("layer", "layer not found")
        raise HttpException(status_code=404, response=response)

    room = (
        db.query(Room)
        .filter(Room.id == layer.room_id)
        .with_for_update()
        .first()
    )
    if not room:
        response.add_error("room", "room not found")
        raise HttpException(status_code=404, response=response)

    require_room_owner(room, user, response)

    room_layers = get_room_layers(db, layer.room_id, for_update=True)

    if len(room_layers) <= 1:
        response.add_error("layer", "cannot delete the last layer")
        raise HttpException(status_code=400, response=response)

    room_id = layer.room_id

    db.delete(layer)
    db.flush()

    remaining_layers = get_room_layers(db, room_id, for_update=True)

    for index, remaining_layer in enumerate(remaining_layers):
        remaining_layer.position = index

    db.commit()

    next_layers = get_room_layer_dtos(db, room_id)
    response.data = next_layers

    await WSManager.broadcast(
        roomid=room_id,
        message=WSMessage(
            Mtype=WSMTypes.LAYERS_SYNC,
            data=next_layers,
        ),
    )

    return response
from fastapi import APIRouter, Depends, File, UploadFile, Request
from sqlalchemy.orm import Session
import os
import uuid

from Inksac_Data.database import get_db, MEDIA_DIR
from Inksac_Data.Common.Response import Response, HttpException
from Inksac_Data.Entities.Brushes import Brush, BrushCreateDto, BrushUpdateDto, DEFAULT_BRUSH
from Inksac_Data.Entities.Users import User
from Inksac_Data.Controllers.AuthController import require_not_guest, get_current_user

MAX_BRUSH_SIZE = 1 * 1024 * 1024 # 1MB
BRUSH_PATH = "/user/brush"

router = APIRouter(prefix="/api/brushes", tags=['Brushes'])

@router.get("")
def get_all(db: Session = Depends(get_db)):
    response = Response()
    brushes = db.query(Brush).all()
    response.data = [brush.toGetDto() for brush in brushes]
    return response

@router.get("/{id}")
def get_by_id(id: int, db: Session = Depends(get_db)):
    response = Response()
    brush = db.query(Brush).filter(Brush.id == id).first()
    if not brush:
        response.add_error("id", "brush not found")
        raise HttpException(status_code=404, response=response)
    response.data = brush.toGetDto()
    return response

@router.post("")
def create(brushdto: BrushCreateDto, db: Session = Depends(get_db), user: User = Depends(require_not_guest)):
    response = Response()
    if len(brushdto.name) == 0:
        response.add_error("name", "name cannot be empty")
        raise HttpException(status_code=400, response=response)
    if user.brush_count > 10:
        response.add_error("brush_count", "user cannot have more than 10 brushes")
        raise HttpException(status_code=409, response=response)
    brush = Brush(
        name=brushdto.name,
        spacing=brushdto.spacing,
        scale=brushdto.scale,
        opacity=brushdto.opacity,
        rotation_mode=brushdto.rotation_mode,
        owner=user,
    )
    user.brush_count += 1
    db.add(brush)
    db.commit()
    response.data = brush.toGetDto()
    return response

@router.patch("/{id}")
def update(brushdto: BrushUpdateDto, id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if len(brushdto.name) == 0:
        response.add_error("name", "name cannot be empty")
        raise HttpException(status_code=400, response=response)
    brush = next((brush for brush in user.brushes if brush.id == id), None)
    if not brush:
        response.add_error("id", "brush not found")
        raise HttpException(status_code=404, response=response)
    if bool(brush.rooms):
        response.add_error("brush", "cannot edit brush in use")
        raise HttpException(status_code=409, response=response)
    brush.name = brushdto.name
    brush.spacing = brushdto.spacing
    brush.scale = brushdto.scale
    brush.opacity = brushdto.opacity
    brush.rotation_mode = brushdto.rotation_mode
    db.commit()
    response.data = brush.toGetDto()
    return response

@router.patch("/{id}/imgurl")
async def update_imgurl(id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    if not file.content_type.startswith("image/"):
        response.add_error("File", "File must be an image")
        raise HttpException(status_code=400, response=response)
    filesize = request.headers.get("content-length")
    if filesize and int(filesize) > MAX_BRUSH_SIZE:
        response.add_error("File", "File size too large")
        raise HttpException(status_code=413, response=response)
    brush = next((brush for brush in user.brushes if brush.id == id), None)
    if not brush:
        response.add_error("id", "brush not found")
        raise HttpException(status_code=404, response=response)
    if bool(brush.rooms):
        response.add_error("brush", "cannot edit brush in use")
        raise HttpException(status_code=409, response=response)
    extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{extension}"
    filepath = os.path.join(BRUSH_PATH, filename)
    if brush.imgurl != DEFAULT_BRUSH:
        os.remove(MEDIA_DIR / brush.imgurl[1:])
    with open(MEDIA_DIR / filepath[1:], "wb") as f:
        f.write(await file.read())
    brush.imgurl = filepath
    db.commit()
    response.data = brush.toGetDto()
    return response

@router.delete("/{id}/imgurl")
def remove_imgurl(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    brush = next((brush for brush in user.brushes if brush.id == id), None)
    if not brush:
        response.add_error("id", "brush not found")
        raise HttpException(status_code=404, response=response)
    if brush.imgurl == DEFAULT_BRUSH:
        response.add_error("imgurl", "no imgurl")
    if bool(brush.rooms):
        response.add_error("brush", "cannot edit brush in use")
    if response.has_errors:
        raise HttpException(status_code=409, response=response)
    os.remove(MEDIA_DIR / brush.imgurl[1:])
    brush.imgurl = DEFAULT_BRUSH
    db.commit()
    response.data = brush.toGetDto()
    return response

@router.delete("/{id}")
def delete_brush(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response = Response()
    brush = next((brush for brush in user.brushes if brush.id == id), None)
    if not brush:
        response.add_error("id", "brush not found")
        raise HttpException(status_code=404, response=response)
    if bool(brush.rooms):
        response.add_error("brush", "cannot delete brush in use")
        raise HttpException(status_code=409, response=response)
    if brush.imgurl != DEFAULT_BRUSH:
        os.remove(MEDIA_DIR / brush.imgurl[1:])
    db.delete(brush)
    db.commit()
    response.data = True
    return response
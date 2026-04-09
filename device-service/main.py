import logging
from datetime import datetime, time
from typing import List, Optional
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Request, Response, BackgroundTasks
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uvicorn

from .database import get_db, Base, engine
from .models import Device, DeviceUser, Attendance, Photo
from .ws_manager import manager
from .config import settings
from .utils import generate_tz_string, format_user_add_command, format_user_delete_command

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BIOMETRIC_ADMS")

app = FastAPI(title="PGMS Biometric Microservice")

# Redis
r = redis.from_url(settings.REDIS_URL, decode_responses=True)

class PGUserCreate(BaseModel):
    user_id: str
    name: str
    expiry_date: str  # YYYY-MM-DD HH:MM:SS
    allowed_start_time: str # HH:MM
    allowed_end_time: str # HH:MM

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Start periodic tasks here if using a simple loop
    # asyncio.create_task(run_background_checks())

# --- ADMS DEVICE ENDPOINTS ---

@app.get("/iclock/cdata")
async def adms_handshake(sn: str, response: Response):
    """
    Device handshake/initialization.
    Return 200 OK with specific ADMS headers.
    """
    logger.info(f"Handshake from SN: {sn}")
    return Response(content="OK", media_type="text/plain")

@app.post("/iclock/cdata")
async def adms_receive_data(sn: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Receives ATTLOG (Attendance), PHOTO (Images), and USER data.
    """
    body = await request.body()
    decoded_body = body.decode("utf-8", errors="ignore")
    
    # Simple ADMS parse logic
    if "ATTLOG" in decoded_body:
        # Example line: 1	2026-03-19 21:55:01	1	0	0	0
        lines = decoded_body.split("\n")
        for line in lines:
            if not line.strip() or "ATTLOG" in line: continue
            parts = line.split("\t")
            if len(parts) >= 2:
                uid = parts[0]
                ts = datetime.strptime(parts[1], "%Y-%m-%d %H:%M:%S")
                vtype = int(parts[2]) if len(parts) > 2 else 0
                
                attendance = Attendance(user_id=uid, device_sn=sn, timestamp=ts, verify_type=vtype)
                db.add(attendance)
                
                # Broadcast real-time to dashboard via WS
                await manager.broadcast(sn, {
                    "event": "punch",
                    "user_id": uid,
                    "timestamp": parts[1]
                })

    await db.commit()
    return Response(content="OK", media_type="text/plain")

@app.get("/iclock/getrequest")
async def adms_get_commands(sn: str):
    """
    Devices poll this endpoint for pending commands (USER ADD, DELETE, etc.).
    Commands are stored in Redis list 'commands:{sn}'.
    """
    cmd = await r.rpop(f"commands:{sn}")
    if cmd:
        logger.info(f"Sending command to {sn}: {cmd}")
        # Command ID is standard for tracking
        return Response(content=f"C:ID1:{cmd}", media_type="text/plain")
    return Response(content="OK", media_type="text/plain")

# --- INTERNAL API ENDPOINTS ---

@app.post("/api/pg/add-user")
async def add_user_to_device(user: PGUserCreate, db: AsyncSession = Depends(get_db)):
    """
    Add a new tenant to the biometric system with expiry and time zone constraints.
    """
    try:
        start_t = datetime.strptime(user.allowed_start_time, "%H:%M").time()
        end_t = datetime.strptime(user.allowed_end_time, "%H:%M").time()
        expiry_dt = datetime.strptime(user.expiry_date, "%Y-%m-%d %H:%M:%S")
        
        tz_str = generate_tz_string(start_t, end_t)
        
        # 1. Update/Create in DB
        result = await db.execute(select(DeviceUser).where(DeviceUser.user_id == user.user_id))
        db_user = result.scalars().first()
        
        if not db_user:
            db_user = DeviceUser(user_id=user.user_id)
            db.add(db_user)
            
        db_user.name = user.name
        db_user.expiry_date = expiry_dt
        db_user.allowed_start_time = start_t
        db_user.allowed_end_time = end_t
        db_user.tz_string = tz_str
        db_user.is_active = True
        
        await db.commit()
        
        # 2. Push Command to Device(s)
        # In production, you'd fetch all devices this user should be on
        result = await db.execute(select(Device))
        devices = result.scalars().all()
        
        cmd = format_user_add_command(user.user_id, user.name, tz_str, user.expiry_date)
        
        for device in devices:
            await r.lpush(f"commands:{device.sn}", cmd)
            
        return {"status": "success", "message": f"User queued for {len(devices)} devices"}
        
    except Exception as e:
        logger.error(f"Error adding user: {e}")
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/{sn}")
async def websocket_endpoint(websocket: WebSocket, sn: str):
    """
    Dashboard clients connect here to receive real-time punch notifications.
    """
    await manager.connect(sn, websocket)
    try:
        while True:
            await websocket.receive_text() # Keep alive
    except WebSocketDisconnect:
        manager.disconnect(sn, websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

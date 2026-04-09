import asyncio
from datetime import datetime
from sqlalchemy.future import select
from .database import AsyncSessionLocal
from .models import DeviceUser
from .utils import format_user_delete_command
import redis.asyncio as redis
from .config import settings

async def remove_expired_users():
    """
    Nightly cron job to find expired tenants and send delete commands to hardware.
    """
    async with AsyncSessionLocal() as session:
        now = datetime.utcnow()
        result = await session.execute(
            select(DeviceUser).where(DeviceUser.expiry_date < now, DeviceUser.is_active == True)
        )
        expired_users = result.scalars().all()

        if not expired_users:
            return

        r = redis.from_url(settings.REDIS_URL, decode_responses=True)
        
        for user in expired_users:
            cmd = format_user_delete_command(user.user_id)
            # Find all devices (or broadcast to all)
            # In simple terms, push deletion command to all SN queues
            # You might want to filter only devices where this user exists
            # For simplicity, we broadcast to a general queue or specific SNs
            await r.lpush(f"commands:0", cmd) # Example specific SN or use a loop
            user.is_active = False
            
        await session.commit()

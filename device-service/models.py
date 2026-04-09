from sqlalchemy import Column, Integer, String, DateTime, Time, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class DeviceUser(Base):
    __tablename__ = "device_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)  # ESSL ID
    name = Column(String)
    card_no = Column(String, nullable=True)
    expiry_date = Column(DateTime)
    allowed_start_time = Column(Time)
    allowed_end_time = Column(Time)
    tz_string = Column(String(56))  # 56-char TZ string
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    device_sn = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    verify_type = Column(Integer)  # 1: Finger, 15: Face, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    user_id = Column(String)
    s3_url = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    sn = Column(String, unique=True, index=True)
    name = Column(String)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=False)

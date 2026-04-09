from datetime import time

def generate_tz_string(start_time: time, end_time: time) -> str:
    """
    Generates a 56-character ESSL/ZKTeco TimeZone string.
    Format: 7 days x 8 chars (HHMMHHMM) per day.
    Example: 06:00 to 22:00 -> 06002200 (x7)
    """
    s_hhmm = start_time.strftime("%H%M")
    e_hhmm = end_time.strftime("%H%M")
    daily_tz = f"{s_hhmm}{e_hhmm}"
    return daily_tz * 7

def format_user_add_command(user_id: str, name: str, tz_string: str, expiry_datetime: str) -> str:
    """
    Formats the ADMS USER ADD command.
    """
    return f"DATA USER ADD Pin={user_id}\tName={name}\tTZ={tz_string}\tEndDatetime={expiry_datetime}"

def format_user_delete_command(user_id: str) -> str:
    """
    Formats the ADMS USER DELETE command.
    """
    return f"DATA USER DELETE Pin={user_id}"

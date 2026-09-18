from datetime import datetime, timezone, timedelta
from typing import Optional, Union

# Standard Vietnam Timezone (UTC+7 / Asia/Ho_Chi_Minh)
VIETNAM_OFFSET = timedelta(hours=7)
VIETNAM_TZ = timezone(VIETNAM_OFFSET, name="Asia/Ho_Chi_Minh")

def now_vn() -> datetime:
    """Returns current datetime object localized to Vietnam Time (GMT+7)."""
    return datetime.now(VIETNAM_TZ)

def now_vn_str() -> str:
    """Returns Vietnam datetime formatted as 'YYYY-MM-DD HH:MM:SS'."""
    return now_vn().strftime("%Y-%m-%d %H:%M:%S")

def now_vn_iso() -> str:
    """Returns ISO-8601 string with Vietnam timezone offset (+07:00)."""
    return now_vn().isoformat()

def to_vn_datetime(val: Union[str, datetime, None]) -> Optional[datetime]:
    """Parses any date/time string or datetime object and converts to Vietnam Time (GMT+7)."""
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            # Naive datetime: assume UTC and shift to VN
            return val.replace(tzinfo=timezone.utc).astimezone(VIETNAM_TZ)
        return val.astimezone(VIETNAM_TZ)
    
    val_str = str(val).strip()
    try:
        # If string contains timezone offset or Z
        if "T" in val_str:
            clean = val_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(VIETNAM_TZ)
        
        # Standard format 'YYYY-MM-DD HH:MM:SS'
        # In this codebase, tables using DATETIME('now', '+7 hours') already store VN local clock time
        dt = datetime.strptime(val_str[:19], "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=VIETNAM_TZ)
    except Exception:
        return None

def to_vn_iso(val: Union[str, datetime, None]) -> str:
    """Converts input to ISO 8601 with +07:00 offset, falling back to current Vietnam time."""
    dt = to_vn_datetime(val)
    if dt:
        return dt.isoformat()
    return now_vn_iso()

def to_vn_display(val: Union[str, datetime, None], fmt: str = "%H:%M %d/%m/%Y") -> str:
    """Formats datetime for UI display in Vietnam format (e.g. 14:30 15/09/2026)."""
    dt = to_vn_datetime(val)
    if dt:
        return dt.strftime(fmt)
    return str(val or "")

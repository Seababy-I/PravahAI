"""
IST timestamp utility for ShadowEvent AI backend.

Converts UTC ISO strings (from database/CSV) to IST for API responses.
IST = UTC + 5:30 (offset +05:30, no DST)
"""

from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
IST_FMT = "%d %b %Y, %I:%M %p IST"        # "20 Jun 2024, 10:31 PM IST"
IST_FMT_SHORT = "%d %b %Y %H:%M IST"       # "20 Jun 2024 22:31 IST"
IST_FMT_DATE = "%d %b %Y"                  # "20 Jun 2024"


def utc_str_to_ist(utc_str: str, fmt: str = IST_FMT_SHORT) -> str:
    """
    Convert a UTC ISO 8601 string to IST formatted string.

    Handles formats:
      '2024-03-07 17:01:48.111000+00:00'
      '2024-03-07T17:01:48Z'
      '2024-03-07 17:01:48'  (assumed UTC)

    Returns empty string if parsing fails.
    """
    if not utc_str or not isinstance(utc_str, str):
        return ""
    try:
        # Normalise separator
        s = utc_str.strip().replace("T", " ")
        # Remove trailing Z
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        # Parse with or without timezone
        if "+" in s[10:] or (s.count("-") > 2):
            dt = datetime.fromisoformat(s)
        else:
            dt = datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
        # Convert to IST
        dt_ist = dt.astimezone(IST)
        return dt_ist.strftime(fmt)
    except Exception:
        return utc_str[:16]   # fallback: raw truncated string


def utc_str_to_ist_hour(utc_str: str) -> int:
    """Return IST hour (0–23) from a UTC ISO string. Returns -1 on error."""
    if not utc_str:
        return -1
    try:
        s = utc_str.strip().replace("T", " ")
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        if "+" in s[10:] or (s.count("-") > 2):
            dt = datetime.fromisoformat(s)
        else:
            dt = datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
        return dt.astimezone(IST).hour
    except Exception:
        return -1


def now_ist() -> str:
    """Return current IST datetime as formatted string."""
    return datetime.now(IST).strftime(IST_FMT_SHORT)

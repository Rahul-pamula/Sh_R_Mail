"""
ADVANCED RATE LIMITER
Phase 1.5 — Auth Security

Implements composite key rate limiting (IP + Email + User-Agent)
and global Slowapi limiter for standard endpoints.
"""
import os
import time
import hashlib
from fastapi import Request, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address
import redis.asyncio as redis

# Fallback in-memory dict if Redis is missing (only for local dev)
# In production, Redis is strictly required for distributed rate limits!
_local_cache = {}

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# Initialize standard slowapi limiter for general routes
limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
except Exception:
    redis_client = None


async def enforce_auth_rate_limit(request: Request, email: str):
    """
    Apply strict layered rate limits for authentication endpoints (/login, /signup).
    Layer 1: IP-based burst protection.
    Layer 2: Email-based credential stuffing / lockout protection.
    Layer 3: Composite (IP + User-Agent + Email) strict throttling.
    """
    client_ip = get_remote_address(request)
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Generate keys
    ip_key = f"rl:auth:ip:{client_ip}"
    email_key = f"rl:auth:email:{email.lower()}"
    
    # Hash the composite key to prevent overly long Redis keys
    composite_raw = f"{client_ip}:{email.lower()}:{user_agent}"
    composite_hash = hashlib.sha256(composite_raw.encode()).hexdigest()
    composite_key = f"rl:auth:composite:{composite_hash}"

    # Configuration Thresholds
    IP_LIMIT = 20        # Max 20 auth attempts per minute from one IP
    EMAIL_LIMIT = 5      # Max 5 attempts per minute per email (prevent bruteforce/lockout)
    COMPOSITE_LIMIT = 3  # Max 3 attempts per minute for exact same combo
    WINDOW_SEC = 60

    if redis_client:
        try:
            # Execute pipeline to cleanly track limits
            pipe = redis_client.pipeline()
            
            # Increment counters
            pipe.incr(ip_key)
            pipe.incr(email_key)
            pipe.incr(composite_key)
            
            # Set TTL if new
            pipe.expire(ip_key, WINDOW_SEC, nx=True)
            pipe.expire(email_key, WINDOW_SEC, nx=True)
            pipe.expire(composite_key, WINDOW_SEC, nx=True)
            
            results = await pipe.execute()
            
            ip_count = results[0]
            email_count = results[1]
            composite_count = results[2]

            if ip_count > IP_LIMIT:
                raise HTTPException(status_code=429, detail="Too many attempts from this IP. Please try again later.")
            if email_count > EMAIL_LIMIT:
                raise HTTPException(status_code=429, detail="Account locked temporarily due to too many failed attempts.")
            if composite_count > COMPOSITE_LIMIT:
                raise HTTPException(status_code=429, detail="Too many attempts. Please wait 60 seconds.")
                
            return True
            
        except redis.ConnectionError:
            # Fallback to local cache if Redis fails during request
            pass
            
    # LOCAL CACHE FALLBACK (Only executes if Redis is completely down)
    now = time.time()
    for key, limit in [(ip_key, IP_LIMIT), (email_key, EMAIL_LIMIT), (composite_key, COMPOSITE_LIMIT)]:
        if key not in _local_cache:
            _local_cache[key] = {"count": 1, "expires": now + WINDOW_SEC}
        else:
            # Clean expired
            if _local_cache[key]["expires"] < now:
                _local_cache[key] = {"count": 1, "expires": now + WINDOW_SEC}
            else:
                _local_cache[key]["count"] += 1
                if _local_cache[key]["count"] > limit:
                    msg = "Account locked temporarily." if key == email_key else "Too many requests. Please try again later."
                    raise HTTPException(status_code=429, detail=msg)
                    
    return True

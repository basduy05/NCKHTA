"""
Redis & In-Memory Adaptive Caching Service (Phase 2 - Task 2.17)
Provides unified high-performance cache interface with automatic graceful fallback:
1. Connects to Redis when REDIS_URL environment variable is provided.
2. If Redis is unavailable or unconfigured, gracefully falls back to thread-safe in-memory cache with TTL.
Zero-downtime, zero configuration required for local dev, production-ready for Cloud Redis.
"""

import os
import time
import json
import threading
from typing import Any, Optional, Set

REDIS_URL = os.getenv("REDIS_URL", "").strip()

class InMemoryCache:
    """Thread-safe In-Memory Cache with TTL expiration."""
    def __init__(self):
        self._store = {}
        self._sets = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._store:
                return None
            val, expiry = self._store[key]
            if expiry is not None and time.time() > expiry:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        with self._lock:
            expiry = (time.time() + expire_seconds) if expire_seconds else None
            self._store[key] = (value, expiry)
            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            existed = key in self._store
            if existed:
                del self._store[key]
            return existed

    def sadd(self, key: str, member: str) -> bool:
        with self._lock:
            if key not in self._sets:
                self._sets[key] = set()
            self._sets[key].add(member)
            return True

    def sismember(self, key: str, member: str) -> bool:
        with self._lock:
            return member in self._sets.get(key, set())

    def srem(self, key: str, member: str) -> bool:
        with self._lock:
            if key in self._sets and member in self._sets[key]:
                self._sets[key].discard(member)
                return True
            return False


class CacheService:
    def __init__(self):
        self._memory = InMemoryCache()
        self._redis = None
        self._using_redis = False

        if REDIS_URL:
            try:
                import redis
                client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
                client.ping()
                self._redis = client
                self._using_redis = True
                print(f"[CACHE] Connected to Redis successfully at: {REDIS_URL.split('@')[-1] if '@' in REDIS_URL else REDIS_URL}")
            except Exception as e:
                print(f"[CACHE WARNING] Redis connection failed ({e}). Falling back to In-Memory Cache.")
                self._redis = None
                self._using_redis = False
        else:
            print("[CACHE] No REDIS_URL configured. Using high-speed In-Memory Cache with TTL.")

    @property
    def is_redis(self) -> bool:
        return self._using_redis

    def get(self, key: str) -> Optional[Any]:
        if self._using_redis and self._redis:
            try:
                raw = self._redis.get(key)
                if raw is not None:
                    try:
                        return json.loads(raw)
                    except Exception:
                        return raw
                return None
            except Exception as e:
                print(f"[CACHE REDIS ERROR] get: {e}")
        return self._memory.get(key)

    def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        if self._using_redis and self._redis:
            try:
                payload = json.dumps(value) if not isinstance(value, (str, int, float, bool)) else str(value)
                if expire_seconds:
                    self._redis.setex(key, expire_seconds, payload)
                else:
                    self._redis.set(key, payload)
                return True
            except Exception as e:
                print(f"[CACHE REDIS ERROR] set: {e}")
        return self._memory.set(key, value, expire_seconds)

    def delete(self, key: str) -> bool:
        if self._using_redis and self._redis:
            try:
                return bool(self._redis.delete(key))
            except Exception as e:
                print(f"[CACHE REDIS ERROR] delete: {e}")
        return self._memory.delete(key)

    def sadd(self, key: str, member: str) -> bool:
        if self._using_redis and self._redis:
            try:
                self._redis.sadd(key, member)
                return True
            except Exception as e:
                print(f"[CACHE REDIS ERROR] sadd: {e}")
        return self._memory.sadd(key, member)

    def sismember(self, key: str, member: str) -> bool:
        if self._using_redis and self._redis:
            try:
                return bool(self._redis.sismember(key, member))
            except Exception as e:
                print(f"[CACHE REDIS ERROR] sismember: {e}")
        return self._memory.sismember(key, member)

    def srem(self, key: str, member: str) -> bool:
        if self._using_redis and self._redis:
            try:
                return bool(self._redis.srem(key, member))
            except Exception as e:
                print(f"[CACHE REDIS ERROR] srem: {e}")
        return self._memory.srem(key, member)


# Singleton instance
cache = CacheService()

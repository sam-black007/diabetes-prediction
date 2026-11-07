import logging
from contextlib import asynccontextmanager
import asyncpg
from config import get_settings

log = logging.getLogger("dri.db")
_pool: asyncpg.Pool | None = None

CREATE_TABLES_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    input_json JSONB NOT NULL,
    result_json JSONB NOT NULL,
    health_score INTEGER NOT NULL,
    risk_category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metrics JSONB DEFAULT '{}'::jsonb,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenings_user_created ON screenings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
"""

async def init_db() -> None:
    """Create connection pool and automatically provision schema."""
    global _pool
    settings = get_settings()
    if not settings.DATABASE_URL:
        log.warning("DATABASE_URL not set - running in stateless demo mode")
        _pool = None
        return
    try:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
        async with _pool.acquire() as conn:
            await conn.execute(CREATE_TABLES_SQL)
            log.info("PostgreSQL database connected and schema verified.")
    except Exception as e:
        log.warning("Database unavailable (%s) - running without persistence", e)
        _pool = None

async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

def is_db_ready() -> bool:
    return _pool is not None

def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db() first.")
    return _pool

@asynccontextmanager
async def get_connection():
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn

@asynccontextmanager
async def get_transaction():
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn

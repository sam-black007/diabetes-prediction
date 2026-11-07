let cachedSql: any = null;

export async function getNeonSql() {
  if (cachedSql) return cachedSql;
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    '';

  if (!connectionString) return null;

  try {
    const { neon } = await import('@neondatabase/serverless');
    cachedSql = neon(connectionString);
    return cachedSql;
  } catch {
    return null;
  }
}

export async function initNeonSchema() {
  const sql = await getNeonSql();
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS screenings (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        input_json JSONB NOT NULL,
        result_json JSONB NOT NULL,
        health_score INTEGER NOT NULL,
        risk_category TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        provider TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        metrics JSONB DEFAULT '{}'::jsonb,
        last_sync_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.warn('[Neon] Schema init warning:', err);
  }
}

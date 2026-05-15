require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    beds: {
      directory: './test-data'
    }
  },
  supabase: {
    client: 'pg',
    connection: {
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // FIX: Lower timeout (8s) so backend fails before Vercel (10s)
      connectionTimeoutMillis: 8000,   // 8s to establish TCP connection
      query_timeout: 15000,            // 15s max per query
      statement_timeout: 15000,
    },
    // FIX: Pool tuned for Supabase free tier (max 3 concurrent connections)
    pool: {
      min: 0,           // Don't keep idle connections open
      max: 3,           // Supabase free tier supports up to 5
      acquireTimeoutMillis: 5000,   // 5s to get a connection from pool
      createTimeoutMillis: 5000,    // 5s to create a new connection
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,      // Close idle connections after 5s
      reapIntervalMillis: 1000,
      propagateCreateError: true,   // Let the error bubble up so we can rescue/log
    },
    migrations: {
      directory: './migrations'
    },
    beds: {
      directory: './test-data'
    }
  }
};

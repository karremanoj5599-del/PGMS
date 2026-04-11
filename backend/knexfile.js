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
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations'
    },
    beds: {
      directory: './test-data'
    }
  }
};

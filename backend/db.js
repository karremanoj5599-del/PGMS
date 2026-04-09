require('dotenv').config();
const knex = require('knex');
const config = require('./knexfile');

// Use supabase config if SUPABASE_DATABASE_URL is present, otherwise fallback to development (sqlite)
const environment = process.env.SUPABASE_DATABASE_URL ? 'supabase' : 'development';
console.log(`[DB] Connecting to environment: ${environment}`);
const db = knex(config[environment]);

module.exports = db;

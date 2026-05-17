require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function check() {
  try {
    const tenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
      .where('tenants.user_id', 13)
      .select('tenants.tenant_id', 'tenants.name', 'rooms.room_number');
    console.log("TENANTS AND ROOMS:", tenants);
  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
check();

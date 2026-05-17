require('dotenv').config();
const knex = require('knex');
const db = knex({ client: 'pg', connection: process.env.SUPABASE_DATABASE_URL });

async function check() {
  try {
    const tpls = await db('biometric_templates').whereIn('tenant_id', [447, 448]);
    console.log("Biometric templates:", tpls.map(t => ({
      id: t.id,
      tenant_id: t.tenant_id,
      type: t.type,
      is_valid: t.is_valid,
      finger_index: t.finger_index,
      major_ver: t.major_ver,
      minor_ver: t.minor_ver,
      template_data_len: t.template_data ? t.template_data.length : 0
    })));
  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
check();

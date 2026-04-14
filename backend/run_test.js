const db = require('./db');

async function run() {
  try {
    const tenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
      .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
      .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
      .select(
        'tenants.*', 
        'beds.bed_number', 
        'rooms.room_number', 
        'rooms.room_id',
        'floors.floor_name',
        'floors.floor_id',
        db.raw(`(SELECT COUNT(*) FROM biometric_templates WHERE biometric_templates.tenant_id = tenants.tenant_id AND biometric_templates.is_valid = true) as biometric_count`)
      );
    console.log("Success:", tenants.length);
  } catch (err) {
    console.error("Error in tenants query:", err.message);
  }

  try {
    let settings = await db('device_settings').where({ device_id: 0, user_id: 1 }).first();
    console.log("Success settings");
  } catch (err) {
    console.error("Error in settings query:", err.message);
  }

  process.exit();
}

run();

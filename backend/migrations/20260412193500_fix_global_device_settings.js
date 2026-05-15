/**
 * Migration: Fix global device settings ID
 * Converts device_id = 0 (which violated Postgres Foreign Key constraints)
 * to device_id = null (which naturally implies global/all devices).
 */
exports.up = async function(knex) {
  // Update any existing SQLite/Postgres rows that used device_id = 0 to device_id = null
  await knex('device_settings')
    .where('device_id', 0)
    .update({ device_id: null });
};

exports.down = async function(knex) {
  // We don't necessarily downgrade this since null is the correct design.
  // But if strictly reverting, we would change null back to 0.
  // However, SQLite allows 0 but Postgres throws constraint error, 
  // so keeping null is generally safer.
  await knex('device_settings')
    .whereNull('device_id')
    .update({ device_id: 0 });
};

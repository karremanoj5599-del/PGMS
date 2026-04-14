/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTenant = await knex.schema.hasColumn('attendance_logs', 'tenant_id');
  const hasPin = await knex.schema.hasColumn('attendance_logs', 'biometric_pin');
  const hasUserId = await knex.schema.hasColumn('attendance_logs', 'user_id');

  await knex.schema.alterTable('attendance_logs', table => {
    if (!hasTenant) {
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('SET NULL');
    }
    if (!hasPin) {
      table.string('biometric_pin').nullable();
    }
    if (hasUserId) {
      table.renameColumn('user_id', 'admin_user_id');
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table('attendance_logs', table => {
    table.renameColumn('admin_user_id', 'user_id');
    table.dropColumn('biometric_pin');
    table.dropColumn('tenant_id');
  });
};


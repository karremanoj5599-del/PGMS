/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('attendance_logs', table => {
    // Add missing columns
    table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('SET NULL');
    table.string('biometric_pin').nullable();
    // Rename user_id to admin_user_id if it's currently holding admin ID
    // Note: SQLite rename column is supported in recent Knex/SQLite versions
    table.renameColumn('user_id', 'admin_user_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('attendance_logs', table => {
    table.renameColumn('admin_user_id', 'user_id');
    table.dropColumn('biometric_pin');
    table.dropColumn('tenant_id');
  });
};


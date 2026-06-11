/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('staff', table => {
    table.increments('staff_id').primary();
    table.integer('admin_user_id').unsigned().notNullable(); // Reference to the owner/admin
    table.string('name').notNullable();
    table.string('mobile').notNullable();
    table.string('role').nullable(); // e.g., Cleaning, Security, Cook
    table.date('joining_date').notNullable();
    table.string('biometric_pin').nullable(); // Pin mapped in device
    table.string('status').defaultTo('Active'); // Active/Inactive
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  const hasStaffId = await knex.schema.hasColumn('attendance_logs', 'staff_id');
  if (!hasStaffId) {
    await knex.schema.alterTable('attendance_logs', table => {
      table.integer('staff_id').unsigned().references('staff_id').inTable('staff').onDelete('SET NULL');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('attendance_logs', table => {
    table.dropColumn('staff_id');
  });
  await knex.schema.dropTableIfExists('staff');
};

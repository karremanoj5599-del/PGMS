/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('staff', table => {
    table.boolean('access_granted').defaultTo(true);
  });

  const hasStaffId = await knex.schema.hasColumn('biometric_templates', 'staff_id');
  if (!hasStaffId) {
    await knex.schema.alterTable('biometric_templates', table => {
      table.integer('staff_id').unsigned().references('staff_id').inTable('staff').onDelete('CASCADE');
      table.integer('tenant_id').nullable().alter();
      table.dropUnique(['tenant_id', 'type', 'finger_index']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('biometric_templates', table => {
    table.dropColumn('staff_id');
    table.integer('tenant_id').notNullable().alter();
    table.unique(['tenant_id', 'type', 'finger_index']);
  });
  await knex.schema.alterTable('staff', table => {
    table.dropColumn('access_granted');
  });
};

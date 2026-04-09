/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('floors', table => {
      table.increments('floor_id').primary();
      table.string('floor_name').notNullable();
    })
    .createTable('rooms', table => {
      table.increments('room_id').primary();
      table.integer('floor_id').unsigned().references('floor_id').inTable('floors').onDelete('CASCADE');
      table.string('room_number').notNullable();
      table.integer('sharing_capacity').notNullable();
    })
    .createTable('beds', table => {
      table.increments('bed_id').primary();
      table.integer('room_id').unsigned().references('room_id').inTable('rooms').onDelete('CASCADE');
      table.string('bed_number').notNullable();
      table.float('bed_cost').notNullable();
      table.float('daily_cost').defaultTo(0);
      table.float('weekly_cost').defaultTo(0);
      table.float('advance_amount').defaultTo(0);
      table.string('status').defaultTo('Vacant'); // Occupied/Vacant/Maintenance
    })
    .createTable('tenants', table => {
      table.increments('tenant_id').primary();
      table.integer('bed_id').unsigned().references('bed_id').inTable('beds').onDelete('SET NULL');
      table.string('name').notNullable();
      table.string('mobile').notNullable();
      table.string('occupation');
      table.string('gender');
      table.string('proof_doc_url');
      table.date('joining_date').notNullable();
      table.date('expiry_date');
      table.string('tenant_type').defaultTo('Permanent'); // Permanent/Guest
      table.string('status').defaultTo('Staying'); // Staying/Vacated
    })
    .createTable('payments', table => {
      table.increments('payment_id').primary();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.date('payment_date').notNullable();
      table.float('amount_paid').notNullable();
      table.float('balance').defaultTo(0);
      table.string('payment_type').defaultTo('Rent'); // Rent/Advance
    })
    .createTable('devices', table => {
      table.increments('device_id').primary();
      table.string('device_name').notNullable();
      table.boolean('adms_status').defaultTo(false);
      table.string('url');
      table.string('ip_address');
    })
    .createTable('access_control', table => {
      table.increments('rule_id').primary();
      table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
      table.integer('device_id').unsigned().references('device_id').inTable('devices').onDelete('CASCADE');
      table.boolean('access_granted').defaultTo(false);
      table.date('expiry_rule_date');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('access_control')
    .dropTableIfExists('devices')
    .dropTableIfExists('payments')
    .dropTableIfExists('tenants')
    .dropTableIfExists('beds')
    .dropTableIfExists('rooms')
    .dropTableIfExists('floors');
};

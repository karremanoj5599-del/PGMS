exports.up = function(knex) {
  return knex.schema.createTable('tenant_bed_history', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.integer('bed_id').unsigned().references('bed_id').inTable('beds').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tenant_bed_history');
};

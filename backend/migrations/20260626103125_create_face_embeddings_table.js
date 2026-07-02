exports.up = function(knex) {
  return knex.schema.createTable('face_embeddings', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.json('embedding').notNullable(); // Store embedding as a JSON array of floats
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('face_embeddings');
};

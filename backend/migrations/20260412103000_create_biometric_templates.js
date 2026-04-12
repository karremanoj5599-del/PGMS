/**
 * Migration: Create biometric_templates table
 * Stores raw biometric template data (fingerprints, face, palm) received from devices.
 * Enables cross-device synchronization of biometric enrollment data.
 */
exports.up = function(knex) {
  return knex.schema.createTable('biometric_templates', (table) => {
    table.increments('id').primary();
    table.integer('tenant_id').notNullable().references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.string('type').notNullable().defaultTo('fingerprint'); // 'fingerprint', 'face', 'palm'
    table.text('template_data').notNullable(); // Raw base64/hex template string
    table.integer('finger_index').defaultTo(0); // 0-9 for which finger (fingerprint only)
    table.string('algorithm_ver').defaultTo('10.0'); // Version of biometric algorithm (e.g. ZKFinger 10.0)
    table.string('source_device_sn'); // SN of device that captured the template
    table.integer('user_id'); // Admin user_id for multi-tenancy
    table.boolean('is_valid').defaultTo(true); // Soft-disable flag
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: one template per finger per tenant
    table.unique(['tenant_id', 'type', 'finger_index']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('biometric_templates');
};


exports.up = function(knex) {
  return knex.schema.table('biometric_templates', (table) => {
    table.string('major_ver').nullable();
    table.string('minor_ver').nullable();
    table.string('format').nullable();
    table.string('no_index').nullable(); // Maps to No= field in ADMS
  });
};

exports.down = function(knex) {
  return knex.schema.table('biometric_templates', (table) => {
    table.dropColumn('major_ver');
    table.dropColumn('minor_ver');
    table.dropColumn('format');
    table.dropColumn('no_index');
  });
};

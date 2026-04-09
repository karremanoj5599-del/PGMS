exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('attendance_logs', 'user_id');
  if (!hasColumn) {
    await knex.schema.table('attendance_logs', (t) => {
      t.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
    });
    // Assign existing data to user_id: 1 if possible
    await knex('attendance_logs').update({ user_id: 1 });
  }
};

exports.down = function(knex) {
  return knex.schema.table('attendance_logs', t => {
    t.dropColumn('user_id');
  });
};

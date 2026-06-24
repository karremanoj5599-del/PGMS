/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('mess_menu', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable(); // PG Owner / Admin
    table.integer('day_index').notNullable(); // 0 = Sunday, 1 = Monday, etc.
    table.string('day_of_week').notNullable(); // Monday, Tuesday, etc.
    table.string('breakfast').notNullable().defaultTo('Not set');
    table.string('lunch').notNullable().defaultTo('Not set');
    table.string('dinner').notNullable().defaultTo('Not set');
    table.timestamps(true, true);
    table.unique(['user_id', 'day_index']); // Each admin has one menu per day
  });

  await knex.schema.createTable('meal_opt_outs', table => {
    table.increments('id').primary();
    table.integer('tenant_id').unsigned().references('tenant_id').inTable('tenants').onDelete('CASCADE');
    table.date('opt_out_date').notNullable(); // Format: YYYY-MM-DD
    table.timestamps(true, true);
    table.unique(['tenant_id', 'opt_out_date']); // Can only opt out once per specific date
  });

  // Seed default data for all existing users
  const users = await knex('users').select('user_id');
  const defaultMenu = [
    { day_index: 1, day_of_week: 'Monday', breakfast: 'Poha & Tea', lunch: 'Roti, Dal, Sabzi', dinner: 'Rice, Chicken/Paneer Curry' },
    { day_index: 2, day_of_week: 'Tuesday', breakfast: 'Idli Sambar', lunch: 'Rajma Chawal', dinner: 'Roti, Mix Veg' },
    { day_index: 3, day_of_week: 'Wednesday', breakfast: 'Aloo Paratha', lunch: 'Kadhi Pakora, Rice', dinner: 'Roti, Egg/Dal Tadka' },
    { day_index: 4, day_of_week: 'Thursday', breakfast: 'Upma & Coffee', lunch: 'Chole Bhature', dinner: 'Veg Biryani, Raita' },
    { day_index: 5, day_of_week: 'Friday', breakfast: 'Puri Sabzi', lunch: 'Roti, Dal Makhani', dinner: 'Fried Rice, Manchurian' },
    { day_index: 6, day_of_week: 'Saturday', breakfast: 'Dosa, Chutney', lunch: 'Pav Bhaji', dinner: 'Roti, Matar Paneer' },
    { day_index: 0, day_of_week: 'Sunday', breakfast: 'Chole Kulche', lunch: 'Special Thali', dinner: 'Khichdi, Papad' },
  ];

  const inserts = [];
  for (const user of users) {
    for (const menu of defaultMenu) {
      inserts.push({
        user_id: user.user_id,
        ...menu
      });
    }
  }

  if (inserts.length > 0) {
    await knex('mess_menu').insert(inserts);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('meal_opt_outs');
  await knex.schema.dropTableIfExists('mess_menu');
};

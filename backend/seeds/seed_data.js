/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('access_control').del();
  await knex('devices').del();
  await knex('payments').del();
  await knex('tenants').del();
  await knex('beds').del();
  await knex('rooms').del();
  await knex('floors').del();

  // Insert floors
  const [f1, f2] = await knex('floors').insert([
    { floor_name: 'Ground Floor' },
    { floor_name: 'First Floor' }
  ]).returning('floor_id');

  const f1_id = typeof f1 === 'object' ? f1.floor_id : f1;
  const f2_id = typeof f2 === 'object' ? f2.floor_id : f2;

  // Insert rooms
  const [r1, r2] = await knex('rooms').insert([
    { floor_id: f1_id, room_number: 'G01', sharing_capacity: 2 },
    { floor_id: f2_id, room_number: '101', sharing_capacity: 3 }
  ]).returning('room_id');

  const r1_id = typeof r1 === 'object' ? r1.room_id : r1;
  const r2_id = typeof r2 === 'object' ? r2.room_id : r2;

  // Insert beds
  await knex('beds').insert([
    { room_id: r1_id, bed_number: 'G01-A', bed_cost: 8000, advance_amount: 3000, status: 'Occupied' },
    { room_id: r1_id, bed_number: 'G01-B', bed_cost: 8000, advance_amount: 3000, status: 'Vacant' },
    { room_id: r2_id, bed_number: '101-A', bed_cost: 7500, advance_amount: 2500, status: 'Maintenance' },
    { room_id: r2_id, bed_number: '101-B', bed_cost: 7500, advance_amount: 2500, status: 'Vacant' },
    { room_id: r2_id, bed_number: '101-C', bed_cost: 7500, advance_amount: 2500, status: 'Vacant' }
  ]);
};

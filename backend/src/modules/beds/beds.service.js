const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');
const { parseBedBatch } = require('../../shared/utils/parseBatch');

exports.getAll = (userId) => {
  return db('beds')
    .join('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('tenants', 'beds.bed_id', '=', 'tenants.bed_id')
    .where('beds.user_id', userId)
    .select(
      'beds.*',
      'rooms.room_number',
      'tenants.name as tenant_name',
      'tenants.mobile as tenant_mobile',
      'tenants.joining_date as tenant_joining_date',
      'tenants.photo as tenant_photo',
      'tenants.tenant_id'
    );
};

exports.getVacant = (userId) => {
  return db('beds')
    .join('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where({ 'beds.status': 'Vacant', 'beds.user_id': userId })
    .select('beds.*', 'rooms.room_number');
};

exports.create = async (data, userId) => {
  const { room_id, bed_number, bed_cost, daily_cost, weekly_cost, advance_amount } = data;
  const bedLabels = parseBedBatch(bed_number);
  const room = await db('rooms').where({ room_id, user_id: userId }).first();
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    throw err;
  }

  const results = [];
  for (const label of bedLabels) {
    const bedCount = await db('beds').where('room_id', room_id).count('bed_id as count').first();
    if (bedCount.count >= room.sharing_capacity) break;

    const existing = await db('beds').where({ room_id, bed_number: label, user_id: userId }).first();
    if (!existing) {
      const [inserted] = await db('beds').insert({
        room_id: toNull(room_id),
        bed_number: label,
        bed_cost: toNull(bed_cost) || 0,
        daily_cost: toNull(daily_cost) || 0,
        weekly_cost: toNull(weekly_cost) || 0,
        advance_amount: toNull(advance_amount) || 0,
        status: 'Vacant',
        user_id: userId
      }).returning('bed_id');
      const id = typeof inserted === 'object' ? inserted.bed_id : inserted;
      results.push({ bed_id: id, bed_number: label });
    }
  }
  return results;
};

exports.update = async (id, data, userId) => {
  await db('beds').where({ bed_id: id, user_id: userId }).update({
    bed_number: data.bed_number,
    bed_cost: toNull(data.bed_cost),
    daily_cost: toNull(data.daily_cost),
    weekly_cost: toNull(data.weekly_cost),
    advance_amount: toNull(data.advance_amount),
    status: data.status || 'Vacant'
  });
  const bed = await db('beds').where('bed_id', id).first();
  if (!bed) {
    const err = new Error('Bed not found');
    err.statusCode = 404;
    throw err;
  }
  return bed;
};

exports.remove = async (id, userId) => {
  const bed = await db('beds').where({ bed_id: id, user_id: userId }).first();
  if (!bed) {
    const err = new Error('Bed not found');
    err.statusCode = 404;
    throw err;
  }
  if (bed.status === 'Occupied') {
    const err = new Error('Cannot delete an occupied bed');
    err.statusCode = 400;
    throw err;
  }
  await db('beds').where({ bed_id: id, user_id: userId }).del();
};

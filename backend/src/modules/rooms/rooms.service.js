const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');
const { parseRoomBatch } = require('../../shared/utils/parseBatch');

exports.getAll = (userId) => {
  return db('rooms')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('rooms.user_id', userId)
    .select('rooms.*', 'floors.floor_name');
};

exports.create = async (floorId, roomNumber, sharingCapacity, userId) => {
  const roomNumbers = parseRoomBatch(roomNumber.toString());
  const results = [];

  for (const num of roomNumbers) {
    const existing = await db('rooms').where({ room_number: num, floor_id: floorId, user_id: userId }).first();
    if (!existing) {
      const [inserted] = await db('rooms').insert({
        floor_id: toNull(floorId),
        room_number: num,
        sharing_capacity: sharingCapacity || 1,
        user_id: userId
      }).returning('room_id');
      const id = typeof inserted === 'object' ? inserted.room_id : inserted;
      results.push({ room_id: id, room_number: num });
    }
  }
  return results;
};

exports.update = async (id, data, userId) => {
  await db('rooms').where({ room_id: id, user_id: userId }).update({
    floor_id: toNull(data.floor_id),
    room_number: data.room_number,
    sharing_capacity: data.sharing_capacity
  });
  const room = await db('rooms').where('room_id', id).first();
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    throw err;
  }
  return room;
};

exports.remove = async (id, userId) => {
  const occupiedBeds = await db('beds').where('room_id', id).andWhere('status', 'Occupied').first();
  if (occupiedBeds) {
    const err = new Error('Cannot delete a room with occupied beds');
    err.statusCode = 400;
    throw err;
  }
  const count = await db('rooms').where('room_id', id).del();
  if (count === 0) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    throw err;
  }
};

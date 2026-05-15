const db = require('../../config/database');

exports.getAll = (userId) => {
  return db('floors').where('user_id', userId);
};

exports.create = async (floorNames, userId) => {
  const results = [];
  for (const name of floorNames) {
    const existing = await db('floors').where({ floor_name: name, user_id: userId }).first();
    if (!existing) {
      const [inserted] = await db('floors').insert({ floor_name: name, user_id: userId }).returning('floor_id');
      const id = typeof inserted === 'object' ? inserted.floor_id : inserted;
      results.push({ floor_id: id, floor_name: name });
    }
  }
  return results;
};

exports.update = async (id, floorName, userId) => {
  await db('floors').where({ floor_id: id, user_id: userId }).update({ floor_name: floorName });
  return db('floors').where('floor_id', id).first();
};

exports.remove = async (id, userId) => {
  const rooms = await db('rooms').where({ floor_id: id, user_id: userId }).first();
  if (rooms) {
    const err = new Error('Cannot delete floor with existing rooms');
    err.statusCode = 400;
    throw err;
  }
  const count = await db('floors').where({ floor_id: id, user_id: userId }).del();
  if (count === 0) {
    const err = new Error('Floor ID ' + id + ' not found');
    err.statusCode = 404;
    throw err;
  }
};

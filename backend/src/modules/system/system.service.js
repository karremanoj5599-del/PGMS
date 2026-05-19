const db = require('../../config/database');

exports.getOptions = async (userId) => {
  let settings = await db('device_settings').where({ device_id: null, user_id: userId }).first();
  if (!settings) {
    const [inserted] = await db('device_settings')
      .insert({ device_id: null, user_id: userId })
      .returning('id');
    const id = typeof inserted === 'object' ? inserted.id : inserted;
    settings = await db('device_settings').where('id', id).first();
  }
  return settings;
};

exports.updateOptions = async (data, userId) => {
  const { 
    lock_delay, sensor_type, door_mode, anti_passback,
    expire_action, auto_block_enabled, auto_block_days, auto_delete_enabled, auto_delete_days
  } = data;
  
  let settings = await db('device_settings').where({ device_id: null, user_id: userId }).first();
  if (!settings) {
    await db('device_settings').insert({ device_id: null, user_id: userId });
  }
  
  await db('device_settings').where({ device_id: null, user_id: userId }).update({
    lock_delay: lock_delay !== undefined ? lock_delay : 5,
    sensor_type: sensor_type || 'NONE',
    door_mode: door_mode || 'NORMAL',
    anti_passback: !!anti_passback,
    expire_action: expire_action !== undefined ? expire_action : 0,
    auto_block_enabled: !!auto_block_enabled,
    auto_block_days: auto_block_days !== undefined ? auto_block_days : 0,
    auto_delete_enabled: !!auto_delete_enabled,
    auto_delete_days: auto_delete_days !== undefined ? auto_delete_days : 0,
    updated_at: db.fn.now()
  });
  
  // Sync to ALL user devices via Command Queue
  const devices = await db('devices').where({ user_id: userId, adms_status: true });
  for (const device of devices) {
    if (device && device.sn) {
      await db('device_commands').insert({
        device_sn: device.sn,
        command: `DATA UPDATE options LockDelay=${lock_delay || 5}\tExpireAction=${expire_action || 0}`,
        user_id: userId
      });
    }
  }

  return db('device_settings').where({ device_id: null, user_id: userId }).first();
};

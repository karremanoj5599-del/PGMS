const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const { toNull } = require('../../shared/utils/toNull');

exports.getAll = (userId) => {
  return db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .leftJoin('access_control', 'tenants.tenant_id', '=', 'access_control.tenant_id')
    .where('tenants.user_id', userId)
    .select(
      'tenants.*', 'beds.bed_number', 'beds.bed_cost', 'beds.advance_amount',
      'rooms.room_number', 'rooms.sharing_capacity',
      'floors.floor_name', 'access_control.access_granted'
    );
};

exports.create = async (data, userId) => {
  const { name, mobile, bed_id, joining_date, id_proof, photo, biometric_pin, status,
          access_expiry_date, punch_limit, advance_amount, daily_cost, weekly_cost } = data;

  const bedId = toNull(bed_id);
  const insertData = {
    name, mobile, bed_id: bedId,
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    id_proof: toNull(id_proof), photo: toNull(photo),
    biometric_pin: toNull(biometric_pin),
    status: status || 'Staying', user_id: userId,
    access_expiry_date: toNull(access_expiry_date),
    punch_limit: toNull(punch_limit)
  };

  const [inserted] = await db('tenants').insert(insertData).returning('tenant_id');
  const newId = typeof inserted === 'object' ? inserted.tenant_id : inserted;

  // Update bed status
  if (bedId) {
    await db('beds').where('bed_id', bedId).update({ status: 'Occupied' });
  }

  // Create access control record
  await db('access_control').insert({ tenant_id: newId, access_granted: true }).catch(() => {});

  return newId;
};

exports.update = async (id, data, userId) => {
  const { name, mobile, bed_id, joining_date, id_proof, photo, biometric_pin, status,
          access_expiry_date, punch_limit } = data;

  const tenant = await db('tenants').where({ tenant_id: id, user_id: userId }).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  const newBedId = toNull(bed_id);

  // If bed changed, update old and new bed statuses
  if (tenant.bed_id && tenant.bed_id !== newBedId) {
    await db('beds').where('bed_id', tenant.bed_id).update({ status: 'Vacant' });
  }
  if (newBedId) {
    await db('beds').where('bed_id', newBedId).update({ status: 'Occupied' });
  }

  await db('tenants').where({ tenant_id: id, user_id: userId }).update({
    name: name || tenant.name,
    mobile: mobile || tenant.mobile,
    bed_id: newBedId,
    joining_date: joining_date || tenant.joining_date,
    id_proof: toNull(id_proof),
    photo: toNull(photo),
    biometric_pin: toNull(biometric_pin),
    status: status || tenant.status,
    access_expiry_date: toNull(access_expiry_date),
    punch_limit: toNull(punch_limit)
  });

  return db('tenants').where('tenant_id', id).first();
};

exports.remove = async (id, userId) => {
  const tenant = await db('tenants').where({ tenant_id: id, user_id: userId }).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  if (tenant.bed_id) {
    await db('beds').where('bed_id', tenant.bed_id).update({ status: 'Vacant' });
  }

  // Queue device delete commands
  const pin = tenant.biometric_pin || tenant.tenant_id.toString();
  const devices = await db('devices').where({ user_id: userId, adms_status: true });
  for (const device of devices) {
    if (!device.sn) continue;
    await db('device_commands').insert({
      device_sn: device.sn,
      command: `DATA DELETE USERINFO PIN=${pin}`,
      user_id: userId
    });
  }

  await db('access_control').where('tenant_id', id).del().catch(() => {});
  await db('biometric_templates').where('tenant_id', id).del().catch(() => {});
  await db('tenants').where({ tenant_id: id, user_id: userId }).del();
};

exports.bulkDelete = async (ids, userId) => {
  let count = 0;
  for (const id of ids) {
    try {
      await exports.remove(id, userId);
      count++;
    } catch (err) {
      console.error(`Failed to delete tenant ${id}:`, err.message);
    }
  }
  return count;
};

exports.revokeTenant = async (id, userId) => {
  const tenant = await db('tenants').where({ tenant_id: id, user_id: userId }).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  await db('tenants').where('tenant_id', id).update({ status: 'Vacated' });
  if (tenant.bed_id) {
    await db('beds').where('bed_id', tenant.bed_id).update({ status: 'Vacant' });
  }
  await db('access_control').where('tenant_id', id).update({ access_granted: false }).catch(() => {});

  // Queue device commands to remove access
  const pin = tenant.biometric_pin || tenant.tenant_id.toString();
  const devices = await db('devices').where({ user_id: userId, adms_status: true });
  for (const device of devices) {
    if (!device.sn) continue;
    await db('device_commands').insert({
      device_sn: device.sn,
      command: `DATA DELETE USERINFO PIN=${pin}`,
      user_id: userId
    });
  }
};

exports.setPin = async (id, pin, userId) => {
  const hashedPassword = await bcrypt.hash(pin.toString(), 10);
  await db('tenants').where({ tenant_id: id, user_id: userId }).update({
    password_hash: hashedPassword,
    biometric_pin: pin
  });
};

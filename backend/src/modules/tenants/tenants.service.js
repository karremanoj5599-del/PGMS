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
      'rooms.room_id', 'rooms.room_number', 'rooms.sharing_capacity',
      'floors.floor_id', 'floors.floor_name', 'access_control.access_granted',
      db.raw('(SELECT COUNT(*) FROM biometric_templates WHERE biometric_templates.tenant_id = tenants.tenant_id) as biometric_count'),
      db.raw(`CASE 
        WHEN tenants.access_expiry_date IS NOT NULL AND tenants.access_expiry_date < CURRENT_TIMESTAMP THEN true
        WHEN tenants.expiry_date IS NOT NULL AND tenants.expiry_date < CURRENT_DATE THEN true
        ELSE false 
      END as is_expired`)
    );
};

exports.create = async (data, userId) => {
  const { tenant_id, name, mobile, bed_id, joining_date, id_proof, photo, biometric_pin, status,
          access_expiry_date, punch_limit, gender, occupation, expiry_date, tenant_type,
          custom_rent, custom_advance, discount_amount, email } = data;

  const bedId = toNull(bed_id);
  const insertData = {
    name, mobile, bed_id: bedId,
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    proof_doc_url: toNull(id_proof), photo: toNull(photo),
    biometric_pin: toNull(biometric_pin),
    status: status || 'Staying', user_id: userId,
    // Store as full datetime (end of day UTC) if a date is provided
    access_expiry_date: access_expiry_date ? new Date(access_expiry_date + 'T23:59:59.999Z') : null,
    punch_limit: toNull(punch_limit),
    gender: toNull(gender),
    occupation: toNull(occupation),
    expiry_date: toNull(expiry_date),
    tenant_type: tenant_type || 'Permanent',
    custom_rent: custom_rent !== undefined && custom_rent !== '' ? parseFloat(custom_rent) : null,
    custom_advance: custom_advance !== undefined && custom_advance !== '' ? parseFloat(custom_advance) : null,
    discount_amount: discount_amount !== undefined && discount_amount !== '' ? parseFloat(discount_amount) : 0,
    email: toNull(email)
  };

  if (tenant_id) {
    insertData.tenant_id = Number(tenant_id);
  }

  const [inserted] = await db('tenants').insert(insertData).returning('tenant_id');
  const newId = typeof inserted === 'object' ? inserted.tenant_id : inserted;

  // Sync sequence in PostgreSQL after manual ID insertion to prevent future duplicate key violations
  if (tenant_id && db.client.config.client === 'pg') {
    await db.raw(`SELECT setval('tenants_tenant_id_seq', COALESCE((SELECT MAX(tenant_id) FROM tenants), 1))`).catch(err => {
      console.error('Failed to sync tenants sequence after manual insert:', err.message);
    });
  }

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
          access_expiry_date, punch_limit, gender, occupation, expiry_date, tenant_type,
          custom_rent, custom_advance, discount_amount, email, country_code } = data;

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
    proof_doc_url: toNull(id_proof),
    photo: toNull(photo),
    biometric_pin: toNull(biometric_pin),
    status: status || tenant.status,
    // Store as full datetime (end of day UTC) if a date is provided
    access_expiry_date: access_expiry_date ? new Date(access_expiry_date + 'T23:59:59.999Z') : null,
    punch_limit: toNull(punch_limit),
    gender: toNull(gender),
    occupation: toNull(occupation),
    expiry_date: toNull(expiry_date),
    tenant_type: tenant_type || tenant.tenant_type,
    custom_rent: custom_rent !== undefined ? (custom_rent !== '' ? parseFloat(custom_rent) : null) : tenant.custom_rent,
    custom_advance: custom_advance !== undefined ? (custom_advance !== '' ? parseFloat(custom_advance) : null) : tenant.custom_advance,
    discount_amount: discount_amount !== undefined ? (discount_amount !== '' ? parseFloat(discount_amount) : 0) : tenant.discount_amount,
    email: email !== undefined ? toNull(email) : tenant.email
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
    await db('device_commands').insert([
      { device_sn: device.sn, command: `DATA DELETE USERINFO PIN=${pin}`, user_id: userId }
    ]);
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
    await db('device_commands').insert([
      { device_sn: device.sn, command: `DATA DELETE USERINFO PIN=${pin}`, user_id: userId }
    ]);
  }
};

exports.setPin = async (id, pin, userId) => {
  const hashedPassword = await bcrypt.hash(pin.toString(), 10);
  await db('tenants').where({ tenant_id: id, user_id: userId }).update({
    password_hash: hashedPassword,
    biometric_pin: pin
  });
};

exports.convertToStaff = async (id, userId) => {
  // 1. Fetch tenant
  const tenant = await db('tenants').where({ tenant_id: id, user_id: userId }).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  // 2. Insert into staff
  const staffData = {
    name: tenant.name,
    mobile: tenant.mobile,
    role: 'Converted from Tenant',
    joining_date: tenant.joining_date,
    status: 'Active',
    biometric_pin: tenant.biometric_pin || tenant.tenant_id.toString(),
    admin_user_id: userId,
    access_granted: true // Ensure access is granted by default
  };
  const [newStaff] = await db('staff').insert(staffData).returning('staff_id');
  const staffId = typeof newStaff === 'object' ? newStaff.staff_id : newStaff;

  // 3. Update attendance logs
  await db('attendance_logs')
    .where({ tenant_id: id, admin_user_id: userId })
    .update({ staff_id: staffId, tenant_id: null });

  // 4. Update biometric templates (MOVE them, do NOT delete them)
  await db('biometric_templates')
    .where({ tenant_id: id })
    .update({ staff_id: staffId, tenant_id: null });

  // 5. Clean up tenant records without triggering device deletion commands
  if (tenant.bed_id) {
    await db('beds').where('bed_id', tenant.bed_id).update({ status: 'Vacant' });
  }
  await db('access_control').where('tenant_id', id).del().catch(() => {});
  await db('tenants').where({ tenant_id: id, user_id: userId }).del();

  // 6. Sync the new staff member to devices (overwrites their old tenant access with staff access)
  const { syncStaffAccess } = require('../access-control/access.service');
  await syncStaffAccess(staffId);

  return { message: 'Converted to staff successfully', staff_id: staffId };
};

exports.resyncBiometrics = async (id, target_device_sn, userId) => {
  const tenant = await db('tenants').where({ tenant_id: id, user_id: userId }).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  const templates = await db('biometric_templates').where('tenant_id', id);
  if (templates.length === 0) return;

  const pin = tenant.biometric_pin || tenant.tenant_id.toString();
  const devicesQuery = db('devices').where({ user_id: userId, adms_status: true });
  if (target_device_sn) {
    devicesQuery.andWhere('sn', target_device_sn);
  }
  const devices = await devicesQuery;

  for (const device of devices) {
    if (!device.sn) continue;
    const commands = [];
    for (const tpl of templates) {
      const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
      const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
      const format = tpl.format ? `\tFormat=${tpl.format}` : '';
      const size = tpl.template_data ? `\tSize=${Buffer.from(tpl.template_data, 'base64').length}` : '';
      const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');
      commands.push({
        device_sn: device.sn,
        command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}${size}\tTmp=${tpl.template_data}`,
        user_id: userId
      });
    }
    if (commands.length > 0) {
      await db('device_commands').insert(commands);
    }
  }
};

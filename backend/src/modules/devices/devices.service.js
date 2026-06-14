const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');

exports.getAll = (userId) => db('devices').where('user_id', userId);

exports.create = async (data, userId) => {
  const { device_name, ip_address, port, machine_id, adms_status, sn } = data;
  if (!device_name) { const err = new Error('Device name is required'); err.statusCode = 400; throw err; }
  const insertData = {
    device_name,
    ip_address: ip_address || null,
    port: port || 4370,
    machine_id: machine_id || 1,
    adms_status: adms_status ? true : false,
    user_id: userId,
  };
  if (sn) {
    const existing = await db('devices').where({ sn, user_id: userId }).first();
    if (existing) { const err = new Error('Device SN already registered'); err.statusCode = 400; throw err; }
    insertData.sn = sn;
  }
  const [inserted] = await db('devices').insert(insertData).returning('device_id');
  return typeof inserted === 'object' ? inserted.device_id : inserted;
};

exports.update = async (id, data, userId) => {
  const updateData = {};
  if (data.device_name !== undefined) updateData.device_name = data.device_name;
  if (data.ip_address !== undefined) updateData.ip_address = data.ip_address;
  if (data.port !== undefined) updateData.port = data.port;
  if (data.machine_id !== undefined) updateData.machine_id = data.machine_id;
  if (data.adms_status !== undefined) updateData.adms_status = data.adms_status ? true : false;
  if (data.sn !== undefined) updateData.sn = data.sn;
  if (data.comm_key !== undefined) updateData.comm_key = data.comm_key;
  await db('devices').where({ device_id: id, user_id: userId }).update(updateData);
  return db('devices').where('device_id', id).first();
};

exports.remove = async (id, userId) => {
  const device = await db('devices').where({ device_id: id, user_id: userId }).first();
  if (!device) { const err = new Error('Device not found'); err.statusCode = 404; throw err; }
  await db('device_commands').where('device_sn', device.sn).del().catch(() => {});
  await db('devices').where({ device_id: id, user_id: userId }).del();
};

exports.queueCommand = async (sn, command, userId) => {
  await db('device_commands').insert({ device_sn: sn, command, user_id: userId });
};

exports.getCommands = (sn, userId) => {
  return db('device_commands').where({ device_sn: sn, user_id: userId }).orderBy('id', 'desc').limit(50);
};

exports.getSyncHistory = (userId) => {
  return db('device_commands').where({ user_id: userId }).orderBy('id', 'desc').limit(100);
};

exports.syncUser = async (sn, tenantId, userId, isStaff = false) => {
  if (isStaff) {
    const staff = await db('staff')
      .where('admin_user_id', userId)
      .andWhere(function() {
        this.where('staff_id', tenantId).orWhere('biometric_pin', String(tenantId));
      })
      .first();

    if (!staff) { const err = new Error('Staff not found'); err.statusCode = 404; throw err; }
    
    const { syncStaffAccess } = require('../access-control/access.service');
    await syncStaffAccess(staff.staff_id);
    return staff;
  } else {
    const tenant = await db('tenants').where({ tenant_id: tenantId, user_id: userId }).first();
    if (!tenant) { const err = new Error('Tenant not found'); err.statusCode = 404; throw err; }
    const { syncTenantAccess } = require('../access-control/access.service');
    await syncTenantAccess(tenantId);
    return tenant;
  }
};

exports.bulkSync = async (tenantIds, userId) => {
  if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
    const err = new Error('No tenant IDs provided');
    err.statusCode = 400;
    throw err;
  }
  const { syncTenantAccess } = require('../access-control/access.service');
  const tenants = await db('tenants')
    .whereIn('tenant_id', tenantIds.map(Number))
    .andWhere('user_id', userId);

  for (const tenant of tenants) {
    await syncTenantAccess(tenant.tenant_id);
  }
  return tenants.length;
};

exports.downloadUsers = async (sn, userId) => {
  await db('device_commands').insert({ device_sn: sn, command: 'DATA QUERY USERINFO PIN=\tName=\tPri=\tPasswd=\tCard=\tGrp=\tTZ=\tVerify=\tViceCard=', user_id: userId });
};

exports.syncHistory = async (sn, userId) => {
  await db('device_commands').insert({ device_sn: sn, command: 'DATA QUERY ATTLOG StartTime=\tEndTime=', user_id: userId });
};

exports.queryInfo = async (sn, userId) => {
  await db('device_commands').insert({ device_sn: sn, command: 'INFO', user_id: userId });
};

exports.broadcastTemplates = async (sn, userId) => {
  const { generateTZMask } = require('../../shared/utils/generateTZMask');
  const { DAYS } = require('../../shared/constants');

  const tenants = await db('tenants').where({ user_id: userId, status: 'Staying' });
  const allCommands = [];

  for (const tenant of tenants) {
    const pin = tenant.biometric_pin || tenant.tenant_id.toString();
    let access = await db('access_control').where('tenant_id', tenant.tenant_id).first();

    // Auto-create access record if missing
    if (!access) {
      try {
        await db('access_control').insert({ tenant_id: tenant.tenant_id, access_granted: true, user_id: userId });
        access = await db('access_control').where('tenant_id', tenant.tenant_id).first();
      } catch (e) { /* skip */ }
    }
    const isApproved = access ? !!access.access_granted : false;
    if (!isApproved) continue; // Skip blocked tenants

    // --- 1. Timezone ---
    let grpId = 1;
    let tzIds = [1, 0, 0];

    if (access && access.access_group_id) {
      const group = await db('access_groups').where({ id: access.access_group_id, user_id: userId }).first();
      if (group) {
        grpId = group.id;
        const tzs = [];
        const schedIds = [group.timezone1_id, group.timezone2_id, group.timezone3_id].filter(id => id);
        for (const sid of schedIds) {
          const s = await db('access_schedules').where({ id: sid, user_id: userId }).first();
          if (!s) continue;
          const dStr = s.valid_days || '1111111';
          const daysMap = DAYS.map((day, i) => {
            const isActive = dStr[i] === '1';
            const start = s[`${day}_start`] || '00:00';
            const end = s[`${day}_end`] || '23:59';
            return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
          }).join('\t');
          allCommands.push({ device_sn: sn, command: `DATA UPDATE timezone TimezoneId=${s.timezone_id}\t${daysMap}`, user_id: userId });
          tzs.push(s.timezone_id);
        }
        tzIds = [tzs[0] || 0, tzs[1] || 0, tzs[2] || 0];
      }
    } else {
      const scheduleId = access ? access.schedule_id || 1 : 1;
      const schedule = await db('access_schedules').where({ id: scheduleId, user_id: userId }).first();
      if (schedule) {
        grpId = schedule.id;
        const dStr = schedule.valid_days || '1111111';
        const daysMap = DAYS.map((day, i) => {
          const isActive = dStr[i] === '1';
          const start = schedule[`${day}_start`] || '00:00';
          const end = schedule[`${day}_end`] || '23:59';
          return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
        }).join('\t');
        allCommands.push({ device_sn: sn, command: `DATA UPDATE timezone TimezoneId=${schedule.timezone_id}\t${daysMap}`, user_id: userId });
        tzIds = [schedule.timezone_id, 0, 0];
      }
    }

    // --- 2. Access Group ---
    let holidayId = 0;
    if (access && access.access_group_id) {
      const group = await db('access_groups').where({ id: access.access_group_id, user_id: userId }).first();
      if (group && group.holiday_id) {
        holidayId = group.holiday_id;
      }
    }
    allCommands.push({ device_sn: sn, command: `DATA UPDATE accgroup id=${grpId}\ttimezone1=${tzIds[0]}\ttimezone2=${tzIds[1]}\ttimezone3=${tzIds[2]}\tholiday=${holidayId}\tverifystyle=0`, user_id: userId });

    // --- 3. USERINFO ---
    const cleanName = tenant.name.replace(/[^\w]/g, '');
    const tzMask = generateTZMask(tzIds[0]);
    let extraParams = [];
    if (tenant.punch_limit && tenant.punch_limit > 0) {
      extraParams.push(`ValidCount=${tenant.punch_limit}`);
    }
    const extraString = extraParams.length > 0 ? '\t' + extraParams.join('\t') : '';
    allCommands.push({ device_sn: sn, command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=${grpId}\tTZ=${tzMask}\tPIN2=${pin}${extraString}`, user_id: userId });
    allCommands.push({ device_sn: sn, command: `DATA UPDATE USERINFO PIN=${pin}\tEnabled=1`, user_id: userId });

    // --- 4. BIODATA (fingerprint/face/palm templates) ---
    const templates = await db('biometric_templates').where('tenant_id', tenant.tenant_id);
    for (const tpl of templates) {
      const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
      const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
      const format = tpl.format ? `\tFormat=${tpl.format}` : '';
      const size = tpl.template_data ? `\tSize=${Buffer.from(tpl.template_data, 'base64').length}` : '';
      const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');
      allCommands.push({ device_sn: sn, command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}${size}\tTmp=${tpl.template_data}`, user_id: userId });
    }
  }

  // Single batch insert for ALL commands
  if (allCommands.length > 0) {
    await db('device_commands').insert(allCommands);
  }
  console.log(`[ADMS] Broadcast queued ${allCommands.length} commands for device ${sn}`);
};


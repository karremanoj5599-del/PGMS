const db = require('../../../config/database');
const { findTenantByPin } = require('../../../shared/helpers/tenantLookup');
const { parseATTLOG, parseKeyValueLines, upsertBiometricTemplate } = require('./adms.parser');

// Process attendance log data from device
exports.processAttendanceLogs = async (sn, rawBody, device) => {
  const records = parseATTLOG(rawBody);
  let count = 0;
  const adminUserId = device ? device.user_id : null;

  for (const rec of records) {
    if (!rec.pin || !rec.time) continue;
    const tenant = await findTenantByPin(rec.pin, adminUserId);
    if (!tenant) continue;

    const exists = await db('attendance_logs')
      .where({ tenant_id: tenant.tenant_id, punch_time: rec.time })
      .first();

    if (!exists) {
      await db('attendance_logs').insert({
        tenant_id: tenant.tenant_id,
        punch_time: rec.time,
        status: rec.status,
        verify_type: rec.verify,
        work_code: rec.workcode,
        device_sn: sn,
        user_id: adminUserId
      }).catch(err => console.error('[ADMS] Insert attendance error:', err.message));
      count++;
    }
  }
  return count;
};

// Process OPERLOG / USERINFO data
exports.processUserInfo = async (sn, rawBody, device) => {
  const lines = rawBody.split('\n');
  let count = 0;
  const adminUserId = device ? device.user_id : null;

  for (const line of lines) {
    if (!line.trim() || line.includes('PHOTO')) continue;
    const cleanLine = line.trim();

    // Case A: Fingerprint/Face Template embedded in OPERLOG
    if (cleanLine.startsWith('FP') || cleanLine.startsWith('FACE')) {
      const isFace = cleanLine.startsWith('FACE');
      const fields = {};
      const dataContent = cleanLine.replace(/^(FP|FACE)\s+/i, '').trim();
      dataContent.split(/[\t]+/).forEach(part => {
        const [k, v] = part.split('=');
        if (k) fields[k.toUpperCase()] = (v || '').trim();
      });

      const pin = fields.PIN || fields['PIN='];
      const tmpData = fields.TMP || fields.CONTENT || fields.Tmp;
      const fingerIdx = parseInt(fields.FID || fields.INDEX || '0') || 0;

      if (pin && tmpData) {
        const tenant = await findTenantByPin(pin, adminUserId);
        if (tenant) {
          await upsertBiometricTemplate(tenant.tenant_id, isFace ? 'face' : 'fingerprint', fingerIdx, {
            content: tmpData, algVer: fields.ALGVER, majorVer: fields.MAJORVER,
            minorVer: fields.MINORVER, format: fields.FORMAT, noIndex: fields.FID || fields.INDEX
          }, adminUserId, sn);
          count++;
        }
      }
      continue;
    }

    // Case B: Standard USERINFO / USER update
    const parts = cleanLine.split(/[\t]+| {2,}/);
    const userData = {};
    parts.forEach(p => {
      const part = p.trim();
      if (part.includes('=')) {
        const [key, val] = part.split('=');
        if (key) userData[key.trim().toUpperCase()] = (val || '').trim();
      } else if (part.startsWith('PIN:')) {
        userData.PIN = part.replace('PIN:', '').trim();
      }
    });

    let pin = userData.PIN || userData['PIN='];
    if (!pin && line.includes('PIN=')) {
      const match = line.match(/PIN=([^ \t\n\r]+)/i);
      if (match) pin = match[1];
    }

    if (pin) {
      const pinNum = parseInt(pin);
      const name = userData.NAME || `User ${pin}`;

      let tenant = await findTenantByPin(pin, adminUserId);
      if (!tenant) {
        console.log(`[ADMS] Importing from device: ${name} (PIN/ID: ${pin}) for admin ${adminUserId}`);
        const insertData = {
          name, mobile: '0000000000',
          joining_date: new Date().toISOString().split('T')[0],
          biometric_pin: pin, device_sn: sn,
          status: 'Staying', user_id: adminUserId
        };

        if (!isNaN(pinNum) && pinNum > 0) {
          const existingId = await db('tenants').where('tenant_id', pinNum).first();
          if (!existingId) insertData.tenant_id = pinNum;
        }

        const [inserted] = await db('tenants').insert(insertData).returning('tenant_id');
        const newId = typeof inserted === 'object' ? inserted.tenant_id : inserted;

        if (!isNaN(pinNum)) {
        if (db.client.config.client === 'pg' || db.client.config.client === 'postgresql') {
          await db.raw(`SELECT setval(pg_get_serial_sequence('tenants', 'tenant_id'), max(tenant_id)) FROM tenants`).catch(e => console.error('Sequence Fix Error:', e));
        }
        }

        await db('access_control').insert({ tenant_id: newId, access_granted: true, device_id: device ? device.device_id : null });
        count++;
      } else if (tenant.name.startsWith('User ') && userData.NAME) {
        await db('tenants').where('tenant_id', tenant.tenant_id).update({ name: userData.NAME });
        count++;
      }
    }
  }
  return count;
};

// Process BIODATA templates
exports.processBioData = async (sn, rawBody, device, prefix) => {
  const records = parseKeyValueLines(rawBody, prefix);
  let count = 0;
  const adminUserId = device ? device.user_id : null;

  for (const fields of records) {
    const pin = fields.PIN;
    const content = fields.CONTENT || fields.TMP || fields.DATA;
    if (!pin || !content) continue;

    const bioTypeNum = fields.TYPE || '0';
    let bioType = 'fingerprint';
    if (bioTypeNum === '9') bioType = 'face';
    else if (bioTypeNum === '8') bioType = 'palm';

    const fingerIdx = parseInt(fields.FID || fields.NO || fields.FINGERID || '0') || 0;
    const tenant = await findTenantByPin(pin, adminUserId);

    if (tenant) {
      await upsertBiometricTemplate(tenant.tenant_id, bioType, fingerIdx, {
        content, algVer: fields.ALGVER || fields.ALGORITHMVER,
        majorVer: fields.MAJORVER || fields.MAJOR_VER,
        minorVer: fields.MINORVER || fields.MINOR_VER,
        format: fields.FORMAT, noIndex: fields.NO || fields.FID || fields.FINGERID
      }, adminUserId, sn);
      count++;
    }
  }
  return count;
};

// Process device info/options query response
exports.processDeviceInfo = async (sn, rawBody, device) => {
  const infoFields = {};
  rawBody.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      infoFields[parts[0].trim().replace('~', '')] = parts.slice(1).join('=').trim();
    }
  });

  const updateData = {};
  if (infoFields.FirmVer) updateData.firmware_ver = infoFields.FirmVer;
  if (infoFields.Platform) updateData.platform = infoFields.Platform;
  if (infoFields.UserCount) updateData.user_count = parseInt(infoFields.UserCount) || 0;
  if (infoFields.FPCount) updateData.fp_count = parseInt(infoFields.FPCount) || 0;
  if (infoFields.FaceCount) updateData.face_count = parseInt(infoFields.FaceCount) || 0;
  if (infoFields.TransactionCount || infoFields.AttLogCount) updateData.att_log_count = parseInt(infoFields.TransactionCount || infoFields.AttLogCount) || 0;
  if (infoFields.UserCapacity) updateData.user_capacity = parseInt(infoFields.UserCapacity) || 0;
  if (infoFields.FPCapacity) updateData.fp_capacity = parseInt(infoFields.FPCapacity) || 0;
  if (infoFields.FaceCapacity) updateData.face_capacity = parseInt(infoFields.FaceCapacity) || 0;
  updateData.device_options_json = JSON.stringify(infoFields);
  updateData.info_updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 0 && device) {
    await db('devices').where('device_id', device.device_id).update(updateData).catch(err => {
      console.warn('[ADMS] Could not save device info:', err.message);
    });
  }
  return updateData;
};

const db = require('../../../config/database');
const { findTenantByPin } = require('../../../shared/helpers/tenantLookup');
const { logADMS } = require('../../../middleware/requestLogger');

// Parse ATTLOG lines into attendance records
const parseATTLOG = (rawBody) => {
  const records = [];
  const lines = rawBody.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    // Format: PIN\tTime\tStatus\tVerify\tWorkcode\tReserved
    const parts = line.split('\t');
    if (parts.length >= 2) {
      records.push({
        pin: parts[0]?.trim(),
        time: parts[1]?.trim(),
        status: parts[2]?.trim() || '0',
        verify: parts[3]?.trim() || '0',
        workcode: parts[4]?.trim() || '',
        reserved: parts[5]?.trim() || ''
      });
    }
  }
  return records;
};

// Parse key=value tab-separated lines
const parseKeyValueLines = (rawBody, headerPrefix) => {
  const records = [];
  const lines = rawBody.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    if (headerPrefix && line.trim().toUpperCase() === headerPrefix.toUpperCase()) continue;

    const cleanLine = headerPrefix ? line.replace(new RegExp(`^${headerPrefix}\\s+`, 'i'), '').trim() : line.trim();
    const fields = {};
    cleanLine.split('\t').forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx > 0) {
        const key = part.substring(0, eqIdx).trim().toUpperCase();
        const val = part.substring(eqIdx + 1).trim();
        fields[key] = val;
      }
    });
    if (Object.keys(fields).length > 0) records.push(fields);
  }
  return records;
};

// Upsert a biometric template — single source of truth (was duplicated 5+ times)
const upsertBiometricTemplate = async (tenantId, type, fingerIndex, data, adminUserId, deviceSn) => {
  const existing = await db('biometric_templates').where({
    tenant_id: tenantId, type, finger_index: fingerIndex
  }).first();

  const bioData = {
    template_data: data.content,
    algorithm_ver: data.algVer || (type === 'face' ? '12.0' : '10.0'),
    major_ver: data.majorVer,
    minor_ver: data.minorVer,
    format: data.format,
    no_index: data.noIndex,
    source_device_sn: deviceSn,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    await db('biometric_templates').where('id', existing.id).update(bioData);
  } else {
    await db('biometric_templates').insert({
      tenant_id: tenantId, type, finger_index: fingerIndex,
      ...bioData, user_id: adminUserId
    });
  }
};

module.exports = { parseATTLOG, parseKeyValueLines, upsertBiometricTemplate, findTenantByPin };

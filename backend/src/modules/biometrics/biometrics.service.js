const db = require('../../config/database');
const { syncTenantAccess } = require('../access-control/access.service');

exports.getTemplates = async (tenantId) => {
  return db('biometric_templates').where('tenant_id', tenantId).select('*');
};

exports.broadcast = async (tenantId, userId) => {
  await syncTenantAccess(tenantId);
  return { message: 'Biometric sync queued for all devices' };
};

exports.resync = async (tenantId, userId) => {
  const templates = await db('biometric_templates').where('tenant_id', tenantId);
  if (templates.length === 0) {
    const err = new Error('No biometric templates found for this tenant');
    err.statusCode = 404;
    throw err;
  }

  const tenant = await db('tenants').where('tenant_id', tenantId).first();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  const devices = await db('devices').where({ user_id: userId, adms_status: true });
  const pin = tenant.biometric_pin || tenant.tenant_id.toString();
  let cmdCount = 0;

  for (const device of devices) {
    if (!device.sn) continue;
    for (const tpl of templates) {
      const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
      const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
      const format = tpl.format ? `\tFormat=${tpl.format}` : '';
      const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');

      await db('device_commands').insert({
        device_sn: device.sn,
        command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}\tTmp=${tpl.template_data}`,
        user_id: userId
      });
      cmdCount++;
    }
  }

  return { message: `Re-synced ${templates.length} template(s) to ${devices.length} device(s)`, commands_queued: cmdCount };
};

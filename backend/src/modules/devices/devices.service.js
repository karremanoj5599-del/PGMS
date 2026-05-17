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

exports.syncUser = async (sn, tenantId, userId) => {
  const tenant = await db('tenants').where({ tenant_id: tenantId, user_id: userId }).first();
  if (!tenant) { const err = new Error('Tenant not found'); err.statusCode = 404; throw err; }
  const { syncTenantAccess } = require('../access-control/access.service');
  await syncTenantAccess(tenantId);
  return tenant;
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
  const tenants = await db('tenants').where({ user_id: userId, status: 'Staying' });
  const { syncTenantAccess } = require('../access-control/access.service');
  for (const tenant of tenants) {
    await syncTenantAccess(tenant.tenant_id);
  }
};

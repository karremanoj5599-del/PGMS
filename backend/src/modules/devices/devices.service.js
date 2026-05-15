const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');

exports.getAll = (userId) => db('devices').where('user_id', userId);

exports.create = async (data, userId) => {
  const { sn, name, type } = data;
  if (!sn) { const err = new Error('Device SN required'); err.statusCode = 400; throw err; }
  const existing = await db('devices').where('sn', sn).first();
  if (existing) { const err = new Error('Device SN already registered'); err.statusCode = 400; throw err; }
  const [inserted] = await db('devices').insert({ sn, name: name || sn, type: type || 'attendance', user_id: userId, adms_status: false }).returning('device_id');
  return typeof inserted === 'object' ? inserted.device_id : inserted;
};

exports.update = async (id, data, userId) => {
  await db('devices').where({ device_id: id, user_id: userId }).update({
    name: data.name, sn: data.sn, type: data.type
  });
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

exports.syncUser = async (sn, tenantId, userId) => {
  const tenant = await db('tenants').where({ tenant_id: tenantId, user_id: userId }).first();
  if (!tenant) { const err = new Error('Tenant not found'); err.statusCode = 404; throw err; }
  const { syncTenantAccess } = require('../access-control/access.service');
  await syncTenantAccess(tenantId);
  return tenant;
};

exports.downloadUsers = async (sn) => {
  await db('device_commands').insert({ device_sn: sn, command: 'DATA QUERY USERINFO PIN=\tName=\tPri=\tPasswd=\tCard=\tGrp=\tTZ=\tVerify=\tViceCard=' });
};

exports.syncHistory = async (sn) => {
  await db('device_commands').insert({ device_sn: sn, command: 'DATA QUERY ATTLOG StartTime=\tEndTime=' });
};

exports.queryInfo = async (sn) => {
  await db('device_commands').insert({ device_sn: sn, command: 'INFO' });
};

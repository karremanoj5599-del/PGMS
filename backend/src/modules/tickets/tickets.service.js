const db = require('../../config/database');

exports.getAll = (userId) => {
  return db('tickets')
    .join('tenants', 'tickets.tenant_id', 'tenants.tenant_id')
    .where('tickets.user_id', userId)
    .select('tickets.*', 'tenants.name as tenant_name', 'tenants.mobile as tenant_mobile')
    .orderBy('tickets.created_at', 'desc');
};

exports.update = async (id, data, userId) => {
  await db('tickets').where({ id, user_id: userId }).update({
    status: data.status,
    admin_notes: data.admin_notes,
    updated_at: db.fn.now()
  });
};

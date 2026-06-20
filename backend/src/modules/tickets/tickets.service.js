const db = require('../../config/database');
const activityService = require('../system/activity.service');

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

exports.createPublic = async (data) => {
  const { mobile, floorName, roomNumber, category, description } = data;
  
  // Find tenant by mobile
  const tenant = await db('tenants').where({ mobile }).first();
  if (!tenant) {
    throw new Error('Tenant not found with this mobile number');
  }

  const fullDescription = `[Location: ${floorName}, Room: ${roomNumber}]\n\n${description}`;

  // Insert ticket
  const [idRes] = await db('tickets').insert({
    tenant_id: tenant.tenant_id,
    user_id: tenant.user_id, // Inherit user_id from the tenant
    category,
    description: fullDescription,
    status: 'Pending',
    created_at: db.fn.now(),
    updated_at: db.fn.now()
  }).returning('id');

  const id = typeof idRes === 'object' ? idRes.id : idRes;

  await activityService.logActivity(tenant.user_id, {
    event_type: 'system',
    action: 'created',
    title: 'New Support Ticket',
    description: `A new ${category} ticket was raised by ${tenant.name}.`,
    metadata: { ticket_id: id, tenant_id: tenant.tenant_id }
  });

  return { id };
};

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

exports.createPublic = async (data) => {
  const { mobile, floorName, roomNumber, category, description } = data;
  
  // Find tenant by mobile
  const tenant = await db('tenants').where({ mobile }).first();
  if (!tenant) {
    throw new Error('Tenant not found with this mobile number');
  }

  const fullDescription = `[Location: ${floorName}, Room: ${roomNumber}]\n\n${description}`;

  // Insert ticket
  const [id] = await db('tickets').insert({
    tenant_id: tenant.tenant_id,
    user_id: tenant.user_id, // Inherit user_id from the tenant
    category,
    description: fullDescription,
    status: 'Pending',
    created_at: db.fn.now(),
    updated_at: db.fn.now()
  });

  return { id };
};

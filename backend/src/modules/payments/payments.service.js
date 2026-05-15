const db = require('../../config/database');
const { MONTH_NAMES } = require('../../shared/constants');

exports.getAll = (userId) => {
  return db('payments')
    .leftJoin('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
    .where('payments.user_id', userId)
    .select('payments.*', 'tenants.name as tenant_name');
};

exports.getStatus = async (userId) => {
  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where({ 'tenants.status': 'Staying', 'tenants.user_id': userId })
    .select('tenants.tenant_id', 'tenants.name', 'tenants.expiry_date', 'beds.bed_number', 'rooms.room_number', 'beds.bed_cost', 'beds.advance_amount');

  return Promise.all(tenants.map(async (t) => {
    const lastPay = await db('payments').where({ tenant_id: t.tenant_id, user_id: userId }).orderBy('payment_date', 'desc').first();
    const access = await db('access_control').where('tenant_id', t.tenant_id).first();
    return {
      ...t,
      last_payment_date: lastPay ? lastPay.payment_date : null,
      pending_balance: lastPay ? lastPay.balance : 0,
      access_granted: access ? access.access_granted : false,
      schedule_id: access ? access.schedule_id : 1,
      access_group_id: access ? access.access_group_id : null
    };
  }));
};

exports.create = async (paymentData, userId) => {
  const [inserted] = await db('payments').insert({ ...paymentData, user_id: userId }).returning('payment_id');
  const id = typeof inserted === 'object' ? inserted.payment_id : inserted;
  const payment = await db('payments').where('payment_id', id).first();

  const tenant_id = paymentData.tenant_id;

  // Update access control
  const existingAccess = await db('access_control').where('tenant_id', tenant_id).first();
  if (existingAccess) {
    await db('access_control').where('tenant_id', tenant_id).update({ access_granted: true });
  } else {
    await db('access_control').insert({ tenant_id, access_granted: true });
  }

  // Automatically increase expiry date by 1 month
  const tenant = await db('tenants').where('tenant_id', tenant_id).first();
  if (tenant) {
    let currentExpiry = tenant.expiry_date ? new Date(tenant.expiry_date) : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + 1);
    const newExpiry = currentExpiry.toISOString().split('T')[0];
    await db('tenants').where('tenant_id', tenant_id).update({ expiry_date: newExpiry });
  }

  // Update/Sync Billing Table for this Month
  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  const billing = await db('billing').where({ tenant_id, month: currentMonth, year: currentYear }).first();
  if (billing) {
    const newPaid = (billing.amount_paid || 0) + paymentData.amount_paid;
    const newBalance = Math.max(0, billing.total_due - newPaid);
    await db('billing').where({ id: billing.id }).update({
      amount_paid: newPaid,
      current_balance: newBalance,
      status: newBalance <= 0 ? 'Paid' : 'Partial'
    });
    if (newBalance <= 0) {
      await db('tenants').where('tenant_id', tenant_id).update({ access_status: 'active' });
    }
  }

  return { payment, tenant_id };
};

const db = require('../../config/database');
const { MONTH_NAMES } = require('../../shared/constants');
const activityService = require('../system/activity.service');

exports.getAll = (userId) => {
  return db('payments')
    .leftJoin('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
    .where('payments.user_id', userId)
    .select('payments.*', 'tenants.name as tenant_name');
};

exports.getStatus = async (userId) => {
  if (!userId || isNaN(userId)) {
    return [];
  }

  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where({ 'tenants.status': 'Staying', 'tenants.user_id': userId })
    .select(
      'tenants.tenant_id', 'tenants.name', 'tenants.expiry_date',
      'tenants.custom_rent', 'tenants.custom_advance', 'tenants.discount_amount',
      'beds.bed_number', 'rooms.room_number', 'floors.floor_name', 'beds.bed_cost', 'beds.advance_amount'
    );

  if (tenants.length === 0) return [];

  const tenantIds = tenants.map(t => t.tenant_id);

  // Batch fetch payments in a single query
  const payments = await db('payments')
    .whereIn('tenant_id', tenantIds)
    .where('user_id', userId)
    .orderBy('payment_date', 'desc');

  // Batch fetch access rules in a single query
  const accessRules = await db('access_control')
    .whereIn('tenant_id', tenantIds);

  // Map the latest payment in memory
  const latestPaymentsMap = {};
  for (const pay of payments) {
    if (!latestPaymentsMap[pay.tenant_id]) {
      latestPaymentsMap[pay.tenant_id] = pay;
    }
  }

  // Map access rules in memory
  const accessMap = {};
  for (const access of accessRules) {
    accessMap[access.tenant_id] = access;
  }

  // Combine them in-memory
  return tenants.map((t) => {
    const lastPay = latestPaymentsMap[t.tenant_id];
    const access = accessMap[t.tenant_id];
    
    // Apply custom pricing overrides if set
    const rentVal = t.custom_rent !== null && t.custom_rent !== undefined ? t.custom_rent : (t.bed_cost || 0);
    const advVal = t.custom_advance !== null && t.custom_advance !== undefined ? t.custom_advance : (t.advance_amount || 0);

    // Calculate pending balance based on expiry date
    let pendingBalance = lastPay ? lastPay.balance : 0;
    let carryForward = lastPay ? lastPay.balance : 0;
    
    // If the rent expiry date has passed, they owe for the new month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isExpired = t.expiry_date && new Date(t.expiry_date) < today;

    if (isExpired) {
      if (pendingBalance === 0) {
        pendingBalance = rentVal; // Owe 1 full month
      } else if (pendingBalance > 0) {
        // Owe previous balance + 1 full month
        // (Assuming the UI expects the total owed, though this depends on how billing is handled)
        pendingBalance += rentVal;
      }
    }

    return {
      ...t,
      bed_cost: rentVal,
      advance_amount: advVal,
      last_payment_id: lastPay ? lastPay.payment_id : null,
      last_payment_date: lastPay ? lastPay.payment_date : null,
      pending_balance: pendingBalance,
      carry_forward_balance: carryForward,
      access_granted: access ? access.access_granted : false,
      schedule_id: access ? access.schedule_id : 1,
      access_group_id: access ? access.access_group_id : null
    };
  });
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

  // Log activity and emit SSE
  await activityService.logActivity(userId, {
    event_type: 'payment',
    action: 'created',
    title: 'Payment Received',
    description: `₹${paymentData.amount_paid} received from ${tenant ? tenant.name : 'Unknown Tenant'} via ${paymentData.payment_via || 'Cash'}.`,
    metadata: { payment_id: id, tenant_id }
  });

  return { payment, tenant_id };
};

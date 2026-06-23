const db = require('../../config/database');
const { MONTH_NAMES } = require('../../shared/constants');
const activityService = require('../system/activity.service');

exports.getAll = (userId) => {
  return db('payments')
    .leftJoin('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
    .where('payments.user_id', userId)
    .select('payments.*', 'tenants.name as tenant_name');
};

exports.getMonthlyReport = async (userId, month, year) => {
  if (!userId || isNaN(userId)) return [];

  // Query all beds
  const beds = await db('beds')
    .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', 'floors.floor_id')
    .leftJoin('tenants', function() {
      this.on('beds.bed_id', '=', 'tenants.bed_id')
        .andOn('tenants.status', '=', db.raw("'Staying'"));
    })
    .where('beds.user_id', userId)
    .select(
      'beds.bed_id', 'beds.bed_number', 'beds.bed_cost', 'beds.advance_amount as default_advance',
      'rooms.room_number', 'floors.floor_name',
      'tenants.tenant_id', 'tenants.name as tenant_name', 'tenants.mobile as tenant_mobile',
      'tenants.joining_date', 'tenants.custom_rent', 'tenants.custom_advance'
    );

  if (beds.length === 0) return [];

  const tenantIds = beds.map(b => b.tenant_id).filter(Boolean);

  let billings = [];
  if (tenantIds.length > 0) {
    billings = await db('billing')
      .whereIn('tenant_id', tenantIds)
      .where({ month, year });
  }

  const billingMap = {};
  for (const b of billings) {
    billingMap[b.tenant_id] = b;
  }

  const monthMap = {
    "January": 0, "February": 1, "March": 2, "April": 3,
    "May": 4, "June": 5, "July": 6, "August": 7,
    "September": 8, "October": 9, "November": 10, "December": 11
  };
  const monthIdx = monthMap[month];
  
  // Format local YYYY-MM-DD instead of UTC to avoid timezone shifts
  const monthStr = (monthIdx + 1).toString().padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  
  const end = new Date(year, monthIdx + 1, 0);
  const endDateStr = `${year}-${monthStr}-${end.getDate().toString().padStart(2, '0')}`;

  let payments = [];
  if (tenantIds.length > 0) {
    payments = await db('payments')
      .whereIn('tenant_id', tenantIds)
      .where('payment_date', '>=', startDate)
      .where('payment_date', '<=', endDateStr)
      .orderBy('payment_date', 'desc');
  }

  const paymentsMap = {};
  for (const p of payments) {
    if (!paymentsMap[p.tenant_id]) {
      paymentsMap[p.tenant_id] = { total_paid: 0, latest_date: p.payment_date };
    }
    paymentsMap[p.tenant_id].total_paid += p.amount_paid;
  }

  return beds.map(bed => {
    let tenantId = bed.tenant_id;
    let tenantName = bed.tenant_name;
    let tenantMobile = bed.tenant_mobile;
    let joiningDate = bed.joining_date;
    
    let fixedRent = bed.custom_rent !== null && bed.custom_rent !== undefined ? bed.custom_rent : bed.bed_cost;
    let advance = bed.custom_advance !== null && bed.custom_advance !== undefined ? bed.custom_advance : bed.default_advance;

    // If the tenant joined AFTER the end of the requested month, they were not in this bed during that month
    if (joiningDate && new Date(joiningDate) > end) {
      tenantId = null;
      tenantName = null;
      tenantMobile = null;
      joiningDate = null;
      fixedRent = 0; // Bed was vacant, so no rent owed
      advance = 0;
    }

    const bill = tenantId ? billingMap[tenantId] : null;
    const pay = tenantId ? paymentsMap[tenantId] : null;

    return {
      floor_name: bed.floor_name || 'Unassigned',
      room_number: bed.room_number || 'N/A',
      bed_number: bed.bed_number,
      tenant_id: tenantId,
      tenant_name: tenantName,
      tenant_mobile: tenantMobile,
      joining_date: joiningDate,
      fixed_rent: fixedRent,
      advance: advance,
      previous_month_balance: bill ? bill.previous_balance : 0,
      this_month_rent: bill ? bill.fixed_rent : fixedRent,
      this_month_balance: bill ? bill.current_balance : 0,
      amount_paid: pay ? pay.total_paid : 0,
      paid_date: pay ? pay.latest_date : null
    };
  });
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
    
    let updateData = { expiry_date: newExpiry };
    
    // Also extend access_expiry_date if it was explicitly set
    if (tenant.access_expiry_date) {
      let currentAccessExpiry = new Date(tenant.access_expiry_date);
      currentAccessExpiry.setMonth(currentAccessExpiry.getMonth() + 1);
      updateData.access_expiry_date = currentAccessExpiry;
    }

    await db('tenants').where('tenant_id', tenant_id).update(updateData);
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

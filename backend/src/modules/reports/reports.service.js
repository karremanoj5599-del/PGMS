const db = require('../../config/database');

exports.getStats = async (userId, startDate, endDate) => {
  let payQuery = db('payments').where('user_id', userId);
  if (startDate) payQuery = payQuery.where('payment_date', '>=', startDate);
  if (endDate) payQuery = payQuery.where('payment_date', '<=', endDate);

  const revenue = await payQuery.clone().sum('amount_paid as total').first();

  const activeTenants = await db('tenants').where('user_id', userId);
  let totalPending = 0;
  for (const t of activeTenants) {
    const lastPay = await db('payments').where('tenant_id', t.tenant_id).orderBy('payment_date', 'desc').first();
    if (lastPay) totalPending += lastPay.balance;
    else totalPending += (t.bed_cost || 0) + (t.advance_amount || 0);
  }

  const advance = await db('payments').where({ payment_type: 'Advance', user_id: userId }).sum('amount_paid as total').first();

  const occupancy = await db('beds')
    .where('user_id', userId)
    .select('status')
    .count('bed_id as count')
    .groupBy('status');

  const occObj = { Vacant: 0, Occupied: 0, Maintenance: 0 };
  occupancy.forEach(o => occObj[o.status] = o.count);

  return {
    revenue: revenue.total || 0,
    pending: totalPending || 0,
    advance: advance.total || 0,
    occupancy: occObj
  };
};

exports.getTenantWise = async (userId, filters) => {
  const { startDate, endDate, floor_id, room_id, status, payment_via } = filters;

  let query = db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.user_id', userId);

  if (floor_id) query = query.where('floors.floor_id', floor_id);
  if (room_id) query = query.where('rooms.room_id', room_id);
  if (status) query = query.where('tenants.status', status);

  const tenants = await query.select(
    'tenants.*', 'beds.bed_number', 'beds.bed_cost', 'beds.advance_amount',
    'rooms.room_number', 'rooms.sharing_capacity', 'floors.floor_name'
  );

  return Promise.all(tenants.map(async (t) => {
    let payQuery = db('payments').where({ tenant_id: t.tenant_id, user_id: userId });
    if (startDate) payQuery = payQuery.where('payment_date', '>=', startDate);
    if (endDate) payQuery = payQuery.where('payment_date', '<=', endDate);
    if (payment_via) payQuery = payQuery.where('payment_via', payment_via);

    let lastPayQuery = db('payments').where({ tenant_id: t.tenant_id, user_id: userId });
    if (payment_via) lastPayQuery = lastPayQuery.where('payment_via', payment_via);
    const lastPay = await lastPayQuery.orderBy('payment_date', 'desc').first();

    return {
      ...t,
      last_payment_date: lastPay ? lastPay.payment_date : null,
      last_payment_type: lastPay ? `${lastPay.payment_via} (${lastPay.payment_type})${lastPay.utr_number ? ' - ' + lastPay.utr_number : ''}` : 'N/A',
      present_month_balance: lastPay ? lastPay.balance : 0,
      total_balance: lastPay ? lastPay.balance : 0
    };
  }));
};

exports.getTenantAttendance = async (userId, filters) => {
  const { startDate, endDate, floor_id, room_id, status, tenant_id } = filters;

  let tQuery = db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.user_id', userId);

  if (floor_id) tQuery = tQuery.where('floors.floor_id', floor_id);
  if (room_id) tQuery = tQuery.where('rooms.room_id', room_id);
  if (status) tQuery = tQuery.where('tenants.status', status);
  if (tenant_id) tQuery = tQuery.where('tenants.tenant_id', tenant_id);

  const tenants = await tQuery.select('tenants.tenant_id', 'tenants.name', 'rooms.room_number', 'floors.floor_name');

  let aQuery = db('attendance_logs').whereIn('tenant_id', tenants.map(t => t.tenant_id)).orderBy('punch_time', 'asc');
  if (startDate) aQuery = aQuery.where('punch_time', '>=', startDate + ' 00:00:00');
  if (endDate) aQuery = aQuery.where('punch_time', '<=', endDate + ' 23:59:59');

  const logs = await aQuery.select('*');
  const reportData = [];
  const tenantMap = {};
  tenants.forEach(t => { tenantMap[t.tenant_id.toString()] = t; });

  const grouped = {};
  logs.forEach(log => {
    if (!log.tenant_id) return;
    const tId = log.tenant_id.toString();
    if (!tenantMap[tId]) return;
    const pTime = new Date(log.punch_time);
    if (isNaN(pTime)) return;

    let dateStr;
    if (typeof log.punch_time === 'string') {
      dateStr = log.punch_time.split(' ')[0];
    } else if (log.punch_time instanceof Date) {
      const y = pTime.getFullYear();
      const m = String(pTime.getMonth() + 1).padStart(2, '0');
      const d = String(pTime.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    } else { return; }

    if (!grouped[tId]) grouped[tId] = {};
    if (!grouped[tId][dateStr]) grouped[tId][dateStr] = [];
    grouped[tId][dateStr].push(pTime);
  });

  for (const [tId, datesObj] of Object.entries(grouped)) {
    const tenant = tenantMap[tId];
    if (!tenant) continue;
    for (const [dateStr, punches] of Object.entries(datesObj)) {
      if (punches.length === 0) continue;
      punches.sort((a, b) => a - b);
      reportData.push({
        tenant_name: tenant.name,
        room_number: tenant.room_number || 'N/A',
        floor_name: tenant.floor_name || 'N/A',
        date: dateStr,
        first_punch: punches[0].toISOString(),
        last_punch: punches.length > 1 ? punches[punches.length - 1].toISOString() : null,
        punch_count: punches.length,
        all_punches: punches.map(p => p.toISOString())
      });
    }
  }

  reportData.sort((a, b) => {
    if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
    return a.tenant_name.localeCompare(b.tenant_name);
  });

  return reportData;
};

exports.getTransactions = async (userId, filters) => {
  const { startDate, endDate, payment_via } = filters;
  let query = db('payments')
    .join('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where('payments.user_id', userId)
    .select('payments.*', 'tenants.name as tenant_name', 'rooms.room_number')
    .orderBy('payment_date', 'desc');

  if (startDate) query = query.where('payment_date', '>=', startDate);
  if (endDate) query = query.where('payment_date', '<=', endDate);
  if (payment_via) query = query.where('payments.payment_via', payment_via);

  return query;
};

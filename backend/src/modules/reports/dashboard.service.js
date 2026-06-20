const db = require('../../config/database');
const { MONTH_NAMES } = require('../../shared/constants');

/**
 * Dashboard Charts Data Service
 * Returns aggregated data for revenue trends, occupancy, payment distribution,
 * and recent activity to power the interactive dashboard.
 */

exports.getDashboardCharts = async (userId) => {
  const now = new Date();

  // ── 1. Revenue Trend (Last 6 months) ─────────────────────────────────────
  const revenueTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const result = await db('payments')
      .where('user_id', userId)
      .where('payment_date', '>=', monthStart)
      .where('payment_date', '<', monthEnd)
      .where('amount_paid', '>', 0) // Exclude refunds
      .sum('amount_paid as total')
      .first();

    revenueTrend.push({
      month: MONTH_NAMES[d.getMonth()].substring(0, 3),
      fullMonth: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear(),
      revenue: result?.total || 0
    });
  }

  // ── 2. Occupancy Distribution ─────────────────────────────────────────────
  const beds = await db('beds')
    .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
    .where('rooms.user_id', userId)
    .select('beds.status')
    .count('beds.bed_id as count')
    .groupBy('beds.status');

  const occupancy = { Vacant: 0, Occupied: 0, Maintenance: 0 };
  beds.forEach(b => { occupancy[b.status] = parseInt(b.count) || 0; });
  const totalBeds = Object.values(occupancy).reduce((a, b) => a + b, 0);

  // ── 3. Payment Status Distribution (Current Month) ────────────────────────
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const currentMonthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  const stayingTenants = await db('tenants')
    .where({ status: 'Staying', user_id: userId })
    .count('tenant_id as total')
    .first();

  const paidThisMonth = await db('payments')
    .where('user_id', userId)
    .where('payment_date', '>=', currentMonthStart)
    .where('payment_date', '<', currentMonthEnd)
    .where('payment_type', 'Rent')
    .countDistinct('tenant_id as count')
    .first();

  const totalStaying = parseInt(stayingTenants?.total) || 0;
  const paidCount = parseInt(paidThisMonth?.count) || 0;

  // Overdue: tenants whose expiry_date has passed
  const overdueCount = await db('tenants')
    .where({ status: 'Staying', user_id: userId })
    .where('expiry_date', '<', now.toISOString().split('T')[0])
    .count('tenant_id as count')
    .first();
  const overdue = parseInt(overdueCount?.count) || 0;

  const pendingCount = Math.max(0, totalStaying - paidCount - overdue);

  const paymentDistribution = {
    paid: paidCount,
    pending: pendingCount,
    overdue: overdue
  };

  // ── 4. Collection Metrics (This Month) ────────────────────────────────────
  const thisMonthRevenue = await db('payments')
    .where('user_id', userId)
    .where('payment_date', '>=', currentMonthStart)
    .where('payment_date', '<', currentMonthEnd)
    .where('amount_paid', '>', 0)
    .sum('amount_paid as total')
    .first();

  // Expected rent = sum of all active tenants' bed costs
  const expectedRent = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
    .where({ 'tenants.status': 'Staying', 'tenants.user_id': userId })
    .select(db.raw('SUM(COALESCE(tenants.custom_rent, beds.bed_cost, 0)) as total'))
    .first();

  const expectedTotal = expectedRent?.total || 0;
  const collectedTotal = thisMonthRevenue?.total || 0;
  const collectionRate = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;

  // Upcoming due: tenants whose expiry is within next 7 days
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingDue = await db('tenants')
    .where({ status: 'Staying', user_id: userId })
    .where('expiry_date', '>=', now.toISOString().split('T')[0])
    .where('expiry_date', '<=', nextWeek.toISOString().split('T')[0])
    .count('tenant_id as count')
    .first();

  // ── 5. Recent Activity Feed (Last 15 events) ─────────────────────────────
  const recentPayments = await db('payments')
    .leftJoin('tenants', 'payments.tenant_id', 'tenants.tenant_id')
    .where('payments.user_id', userId)
    .orderBy('payments.payment_id', 'desc')
    .limit(5)
    .select(
      'payments.payment_id as id',
      'tenants.name',
      'payments.amount_paid as amount',
      'payments.payment_type as type',
      'payments.payment_date as date',
      'payments.payment_via'
    );

  const recentTenants = await db('tenants')
    .where('user_id', userId)
    .orderBy('tenant_id', 'desc')
    .limit(5)
    .select('tenant_id as id', 'name', 'joining_date as date', 'status');

  const recentActivity = [];

  recentPayments.forEach(p => {
    recentActivity.push({
      id: `pay-${p.id}`,
      type: 'payment',
      title: `Payment Received`,
      description: `₹${(p.amount || 0).toLocaleString()} ${p.type} from ${p.name || 'Unknown'}`,
      detail: p.payment_via || 'Cash',
      date: p.date,
      icon: 'payment'
    });
  });

  recentTenants.forEach(t => {
    recentActivity.push({
      id: `tenant-${t.id}`,
      type: 'tenant',
      title: t.status === 'Vacated' ? 'Tenant Vacated' : 'New Tenant Added',
      description: `${t.name} was ${t.status === 'Vacated' ? 'vacated' : 'onboarded'}`,
      detail: '',
      date: t.date,
      icon: t.status === 'Vacated' ? 'vacate' : 'tenant'
    });
  });

  // Sort by date desc, take latest 10
  recentActivity.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB - dateA;
  });

  return {
    revenueTrend,
    occupancy: {
      ...occupancy,
      total: totalBeds
    },
    paymentDistribution,
    metrics: {
      revenueThisMonth: collectedTotal,
      expectedRent: expectedTotal,
      collectionRate,
      upcomingDueCount: parseInt(upcomingDue?.count) || 0,
      totalTenants: totalStaying,
      overdueCount: overdue
    },
    recentActivity: recentActivity.slice(0, 10)
  };
};

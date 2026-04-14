const db = require('./db');

async function testStats() {
  try {
    let payQuery = db('payments').where('user_id', 1);
    const revenue = await payQuery.clone().sum('amount_paid as total').first();
    
    const activeTenants = await db('tenants').where('user_id', 1);
    let totalPending = 0;
    for (const t of activeTenants) {
      const lastPay = await db('payments').where('tenant_id', t.tenant_id).orderBy('payment_date', 'desc').first();
      if (lastPay) totalPending += lastPay.balance;
      else totalPending += (t.bed_cost || 0) + (t.advance_amount || 0);
    }
    const pending = { total: totalPending };
    const advance = await db('payments').where({ payment_type: 'Advance', user_id: 1 }).sum('amount_paid as total').first();

    const occupancy = await db('beds')
      .where('user_id', 1)
      .select('status')
      .count('bed_id as count')
      .groupBy('status');

    console.log("Occupancy:", occupancy);
    
    const occObj = { Vacant: 0, Occupied: 0, Maintenance: 0 };
    occupancy.forEach(o => occObj[o.status] = o.count);

    console.log({
      revenue: revenue ? revenue.total : 0,
      pending: pending.total || 0,
      advance: advance ? advance.total : 0,
      occupancy: occObj
    });
  } catch(err) {
    console.error("Stats error:", err);
  }
  process.exit();
}

testStats();

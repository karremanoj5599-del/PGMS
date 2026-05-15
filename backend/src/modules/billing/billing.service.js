const db = require('../../config/database');
const { MONTH_NAMES } = require('../../shared/constants');

exports.generateMonthlyBills = async (userId) => {
  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  const tenants = await db('tenants')
    .join('beds', 'tenants.bed_id', 'beds.bed_id')
    .where('tenants.status', 'Staying')
    .where('tenants.user_id', userId)
    .select('tenants.*', 'beds.bed_cost');

  let count = 0;
  for (const t of tenants) {
    const existing = await db('billing').where({ tenant_id: t.tenant_id, month, year }).first();
    if (!existing) {
      const prevMonth = MONTH_NAMES[now.getMonth() === 0 ? 11 : now.getMonth() - 1];
      const prevYear = now.getMonth() === 0 ? year - 1 : year;
      const lastBill = await db('billing').where({ tenant_id: t.tenant_id, month: prevMonth, year: prevYear }).first();

      const prevBalance = lastBill ? lastBill.current_balance : 0;
      const totalDue = t.bed_cost + prevBalance;
      const accessStatus = totalDue > t.bed_cost ? 'locked' : 'active';
      await db('tenants').where('tenant_id', t.tenant_id).update({ access_status: accessStatus });

      await db('billing').insert({
        tenant_id: t.tenant_id, user_id: userId, month, year,
        fixed_rent: t.bed_cost, previous_balance: prevBalance, total_due: totalDue,
        amount_paid: 0, current_balance: totalDue,
        due_date: new Date(year, now.getMonth(), 5).toISOString().split('T')[0],
        status: 'Unpaid'
      });
      count++;
    }
  }
  return count;
};

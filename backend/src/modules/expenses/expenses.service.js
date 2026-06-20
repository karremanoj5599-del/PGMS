const db = require('../../config/database');

exports.getAll = async (userId, filters = {}) => {
  let query = db('expenses').where('user_id', userId).orderBy('expense_date', 'desc');

  if (filters.category) query = query.where('category', filters.category);
  if (filters.startDate) query = query.where('expense_date', '>=', filters.startDate);
  if (filters.endDate) query = query.where('expense_date', '<=', filters.endDate);

  return query;
};

exports.create = async (expenseData, userId) => {
  const [inserted] = await db('expenses').insert({ ...expenseData, user_id: userId }).returning('expense_id');
  const id = typeof inserted === 'object' ? inserted.expense_id : inserted;
  return db('expenses').where('expense_id', id).first();
};

exports.update = async (id, expenseData, userId) => {
  await db('expenses').where({ expense_id: id, user_id: userId }).update(expenseData);
  return db('expenses').where('expense_id', id).first();
};

exports.remove = async (id, userId) => {
  return db('expenses').where({ expense_id: id, user_id: userId }).del();
};

exports.getSummary = async (userId, startDate, endDate) => {
  let query = db('expenses').where('user_id', userId);
  if (startDate) query = query.where('expense_date', '>=', startDate);
  if (endDate) query = query.where('expense_date', '<=', endDate);

  const byCategory = await query.clone()
    .select('category')
    .sum('amount as total')
    .groupBy('category');

  const totalExpenses = await query.clone().sum('amount as total').first();

  // Get revenue for the same period
  let revenueQuery = db('payments').where('user_id', userId).where('amount_paid', '>', 0);
  if (startDate) revenueQuery = revenueQuery.where('payment_date', '>=', startDate);
  if (endDate) revenueQuery = revenueQuery.where('payment_date', '<=', endDate);
  const totalRevenue = await revenueQuery.sum('amount_paid as total').first();

  const revenue = totalRevenue?.total || 0;
  const expenses = totalExpenses?.total || 0;

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item.total || 0;
      return acc;
    }, {})
  };
};

// Monthly expense trend (last 6 months)
exports.getMonthlyTrend = async (userId) => {
  const now = new Date();
  const trend = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const expenseResult = await db('expenses')
      .where('user_id', userId)
      .where('expense_date', '>=', monthStart)
      .where('expense_date', '<', monthEnd)
      .sum('amount as total')
      .first();

    const revenueResult = await db('payments')
      .where('user_id', userId)
      .where('amount_paid', '>', 0)
      .where('payment_date', '>=', monthStart)
      .where('payment_date', '<', monthEnd)
      .sum('amount_paid as total')
      .first();

    trend.push({
      month: monthNames[d.getMonth()],
      expenses: expenseResult?.total || 0,
      revenue: revenueResult?.total || 0,
      profit: (revenueResult?.total || 0) - (expenseResult?.total || 0)
    });
  }

  return trend;
};

const db = require('../../config/database');

/**
 * Compute payment reminder notifications on-the-fly from tenant expiry dates.
 * 
 * Two tiers:
 *   - "reminder": expiry_date is within the next 7 days (including today)
 *   - "warning":  expiry_date has already passed and rent is still unpaid
 * 
 * Notifications auto-resolve when a payment is recorded because
 * payments.service.create() extends expiry_date by +1 month.
 */
exports.getNotifications = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminderWindowStart = new Date(today);
  const reminderWindowEnd = new Date(today);
  reminderWindowEnd.setDate(reminderWindowEnd.getDate() + 7);

  // Get all "Staying" tenants whose expiry_date is within 7 days OR already past
  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.status', 'Staying')
    .whereNotNull('tenants.expiry_date')
    .where('tenants.expiry_date', '<=', reminderWindowEnd.toISOString().split('T')[0])
    .select(
      'tenants.tenant_id', 'tenants.name', 'tenants.expiry_date',
      'tenants.custom_rent', 'tenants.mobile', 'tenants.email',
      'beds.bed_number', 'beds.bed_cost',
      'rooms.room_number',
      'floors.floor_name'
    );

  if (tenants.length === 0) return [];

  const notifications = tenants.map(t => {
    const expiryDate = new Date(t.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const diffMs = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const monthlyRent = t.custom_rent !== null && t.custom_rent !== undefined
      ? t.custom_rent
      : (t.bed_cost || 0);

    let type, message;

    if (daysRemaining > 0) {
      type = 'reminder';
      message = `${t.name}'s rent expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Collect payment.`;
    } else if (daysRemaining === 0) {
      type = 'warning';
      message = `${t.name}'s rent expires today! Collect payment immediately.`;
    } else {
      type = 'warning';
      const overdueDays = Math.abs(daysRemaining);
      message = `${t.name}'s rent expired ${overdueDays} day${overdueDays !== 1 ? 's' : ''} ago! Payment overdue.`;
    }

    return {
      tenant_id: t.tenant_id,
      name: t.name,
      mobile: t.mobile,
      email: t.email,
      room_number: t.room_number || 'N/A',
      bed_number: t.bed_number || 'N/A',
      floor_name: t.floor_name || '',
      expiry_date: t.expiry_date,
      days_remaining: daysRemaining,
      monthly_rent: monthlyRent,
      type,
      message
    };
  });

  // Sort: warnings first (most overdue at top), then reminders (soonest first)
  notifications.sort((a, b) => {
    if (a.type === 'warning' && b.type !== 'warning') return -1;
    if (a.type !== 'warning' && b.type === 'warning') return 1;
    return a.days_remaining - b.days_remaining;
  });

  return notifications;
};

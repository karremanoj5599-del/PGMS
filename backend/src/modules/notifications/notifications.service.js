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

  const alerts = {
    payments: [],
    access: [],
    staff: [],
    capacity: [],
    system: []
  };

  // 1. PAYMENT ALERTS
  const reminderWindowEnd = new Date(today);
  reminderWindowEnd.setDate(reminderWindowEnd.getDate() + 7);

  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.status', 'Staying')
    .where('tenants.user_id', userId)
    .whereNotNull('tenants.expiry_date')
    .where('tenants.expiry_date', '<=', reminderWindowEnd.toISOString().split('T')[0])
    .select(
      'tenants.tenant_id', 'tenants.name', 'tenants.expiry_date',
      'tenants.custom_rent', 'tenants.mobile',
      'beds.bed_number', 'beds.bed_cost',
      'rooms.room_number',
      'floors.floor_name'
    );

  alerts.payments = tenants.map(t => {
    const expiryDate = new Date(t.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    const diffMs = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const monthlyRent = t.custom_rent !== null && t.custom_rent !== undefined ? t.custom_rent : (t.bed_cost || 0);

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
      id: `pay-${t.tenant_id}`,
      title: 'Payment Due',
      tenant_id: t.tenant_id,
      name: t.name,
      mobile: t.mobile,
      location: t.room_number ? `${t.room_number} (${t.bed_number})` : 'N/A',
      days_remaining: daysRemaining,
      amount: monthlyRent,
      type,
      message
    };
  });

  alerts.payments.sort((a, b) => {
    if (a.type === 'warning' && b.type !== 'warning') return -1;
    if (a.type !== 'warning' && b.type === 'warning') return 1;
    return a.days_remaining - b.days_remaining;
  });

  // 2. ACCESS CONTROL ALERTS (Expired Tenants + Restricted)
  const allStaying = await db('tenants')
    .leftJoin('access_control', 'tenants.tenant_id', 'access_control.tenant_id')
    .where('tenants.status', 'Staying')
    .where('tenants.user_id', userId)
    .select('tenants.tenant_id', 'tenants.name', 'tenants.expiry_date', 'tenants.access_expiry_date', 'access_control.access_granted');

  allStaying.forEach(t => {
    const isExpired = (t.access_expiry_date && new Date(t.access_expiry_date) < new Date()) || 
                      (t.expiry_date && new Date(t.expiry_date) < new Date());
    
    if (isExpired) {
      alerts.access.push({
        id: `acc-exp-${t.tenant_id}`,
        title: 'Access Expired',
        type: 'warning',
        message: `${t.name}'s stay expiry date has passed. Biometric access should be restricted.`
      });
    } else if (t.access_granted === false) {
      alerts.access.push({
        id: `acc-res-${t.tenant_id}`,
        title: 'Access Restricted',
        type: 'reminder',
        message: `${t.name}'s biometric access is currently restricted manually.`
      });
    }
  });

  // 3. STAFF ATTENDANCE ALERTS
  const todayStr = new Date().toISOString().split('T')[0];
  const staff = await db('staff').where('admin_user_id', userId).where('status', 'Active');
  
  for (const s of staff) {
    const punchToday = await db('attendance_logs')
      .where('staff_id', s.staff_id)
      .where('punch_time', '>=', todayStr + ' 00:00:00')
      .first();
    
    if (!punchToday) {
      alerts.staff.push({
        id: `staff-${s.staff_id}`,
        title: 'Staff Absent',
        type: 'warning',
        message: `Staff member ${s.name} hasn't punched in today yet.`
      });
    }
  }

  // 4. CAPACITY ALERTS
  const vacantBeds = await db('beds')
    .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', 'floors.floor_id')
    .where('rooms.user_id', userId)
    .whereNotExists(function() {
      this.select('*').from('tenants')
        .whereRaw('tenants.bed_id = beds.bed_id')
        .andWhere('tenants.status', 'Staying');
    })
    .select('beds.bed_id', 'beds.bed_number', 'rooms.room_number', 'floors.floor_name');

  if (vacantBeds.length > 0) {
    alerts.capacity.push({
      id: `cap-vacant`,
      title: 'Vacant Beds Available',
      type: 'info',
      message: `You currently have ${vacantBeds.length} vacant bed(s) available for new tenants.`
    });
  }

  // 5. SYSTEM / DEVICE ALERTS
  const devices = await db('devices').where('user_id', userId);
  devices.forEach(d => {
    if (!d.adms_status) {
      alerts.system.push({
        id: `dev-${d.sn}`,
        title: 'Device Offline',
        type: 'warning',
        message: `Biometric device ${d.name || d.sn} is currently disconnected or offline.`
      });
    }
  });

  return alerts;
};

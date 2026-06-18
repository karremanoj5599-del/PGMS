const db = require('../../config/database');

exports.getAll = async (userId) => {
  return await db('staff')
    .where('admin_user_id', userId)
    .select(
      'staff.*',
      db.raw('(SELECT COUNT(*) FROM biometric_templates WHERE biometric_templates.staff_id = staff.staff_id) as biometric_count')
    )
    .orderBy('created_at', 'desc');
};

exports.create = async (data, userId) => {
  const [newId] = await db('staff').insert({
    ...data,
    admin_user_id: userId
  }).returning('staff_id');

  const insertId = typeof newId === 'object' ? newId.staff_id : newId;
  return await db('staff').where('staff_id', insertId).first();
};

exports.update = async (id, data, userId) => {
  await db('staff')
    .where({ staff_id: id, admin_user_id: userId })
    .update(data);
  return await db('staff').where('staff_id', id).first();
};

exports.remove = async (id, userId) => {
  return await db('staff')
    .where({ staff_id: id, admin_user_id: userId })
    .del();
};

exports.getAttendance = async (id, userId) => {
  const staff = await db('staff').where({ staff_id: id, admin_user_id: userId }).first();
  const logs = await db('attendance_logs')
    .where({ staff_id: id, admin_user_id: userId })
    .orderBy('punch_time', 'desc');

  if (!staff || !staff.shift_start_time) return logs;

  // Enhance logs with late status
  return logs.map(log => {
    let isLate = false;
    if (log.status === 0 || log.status === '0') { // Check-In
      const punchDate = new Date(log.punch_time);
      const shiftStartTime = new Date(`${punchDate.toISOString().split('T')[0]}T${staff.shift_start_time}`);
      
      // If punch is more than grace time after shift start
      const graceTimeMinutes = staff.shift_grace_time != null ? staff.shift_grace_time : 15;
      if (punchDate.getTime() > shiftStartTime.getTime() + (graceTimeMinutes * 60 * 1000)) {
        isLate = true;
      }
    }
    return { ...log, is_late: isLate };
  });
};

exports.getSummary = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const allStaff = await db('staff').where({ admin_user_id: userId, status: 'Active' });
  const totalStaff = allStaff.length;

  const presentStaffLogs = await db('attendance_logs')
    .where({ admin_user_id: userId, status: 0 })
    .whereNotNull('staff_id')
    .where('punch_time', '>=', `${today}T00:00:00.000Z`);

  const presentStaffIds = new Set(presentStaffLogs.map(l => l.staff_id));
  const presentCount = presentStaffIds.size;

  return { total_staff: totalStaff, present_today: presentCount };
};

exports.setPin = async (id, pin, userId) => {
  return await db('staff')
    .where({ staff_id: id, admin_user_id: userId })
    .update({ biometric_pin: pin });
};

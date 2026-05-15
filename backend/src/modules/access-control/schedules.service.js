const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');
const { DAYS } = require('../../shared/constants');

exports.getSchedules = (userId) => db('access_schedules').where('user_id', userId).select('*');

exports.createSchedule = async (data, userId) => {
  const { name, valid_days, timings } = data;
  const existing = await db('access_schedules').where('user_id', userId).select('timezone_id');
  const usedIds = existing.map(s => s.timezone_id);
  let nextId = 1;
  for (let i = 1; i <= 32; i++) { if (!usedIds.includes(i)) { nextId = i; break; } }

  const row = { name, user_id: userId, valid_days: valid_days || '1111111', timezone_id: nextId,
    start_time: timings?.mon?.start || '08:00', end_time: timings?.mon?.end || '20:00' };
  DAYS.forEach(day => { row[`${day}_start`] = timings?.[day]?.start || '00:00'; row[`${day}_end`] = timings?.[day]?.end || '23:59'; });

  const [id] = await db('access_schedules').insert(row).returning('id');

  const devices = await db('devices').where({ adms_status: true, user_id: userId });
  for (const device of devices) {
    if (!device.sn) continue;
    const dStr = row.valid_days;
    const daysMap = DAYS.map((day, i) => {
      const isActive = dStr[i] === '1';
      return `${day.toUpperCase()}=${isActive ? row[`${day}_start`] + '-' + row[`${day}_end`] : '00:00-00:00'}`;
    }).join('\t');
    await db('device_commands').insert([
      { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${nextId}\t${daysMap}`, user_id: userId },
      { device_sn: device.sn, command: `DATA UPDATE accgroup id=${id}\ttimezone1=${nextId}\ttimezone2=0\ttimezone3=0\tholiday=0\tverifystyle=0`, user_id: userId }
    ]);
  }
  return { id, nextId };
};

exports.deleteSchedule = async (id, userId) => {
  if (id == 1) { const err = new Error('Cannot delete default schedule'); err.statusCode = 400; throw err; }
  await db('access_schedules').where({ id, user_id: userId }).del();
};

exports.resyncAll = async (userId) => {
  const { syncTenantAccess } = require('./access.service');
  const schedules = await db('access_schedules').where('user_id', userId);
  const devices = await db('devices').where('adms_status', true);

  for (const device of devices) {
    if (!device.sn) continue;
    for (const s of schedules) {
      const tzId = s.timezone_id;
      const dStr = s.valid_days || '1111111';
      const crossesMidnight = s.start_time > s.end_time;
      if (crossesMidnight) {
        const daysMap1 = ['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d,i) => `${d}=${dStr[i]?.toString()==='1'?s.start_time+'-23:59':'00:00-00:00'}`).join('\t');
        const daysMap2 = ['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d,i) => `${d}=${dStr[i]?.toString()==='1'?'00:00-'+s.end_time:'00:00-00:00'}`).join('\t');
        await db('device_commands').insert([
          { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId}\t${daysMap1}`, user_id: userId },
          { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId+50}\t${daysMap2}`, user_id: userId }
        ]);
      } else {
        const daysMap = ['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d,i) => `${d}=${dStr[i]?.toString()==='1'?s.start_time+'-'+s.end_time:'00:00-00:00'}`).join('\t');
        await db('device_commands').insert({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId}\t${daysMap}`, user_id: userId });
      }
    }
    const groups = await db('access_groups').where('user_id', userId);
    for (const group of groups) {
      const t1 = await db('access_schedules').where('id', group.timezone1_id || 0).first();
      const t2 = await db('access_schedules').where('id', group.timezone2_id || 0).first();
      const t3 = await db('access_schedules').where('id', group.timezone3_id || 0).first();
      const tzIds = [t1?.timezone_id||0, t2?.timezone_id||0, t3?.timezone_id||0];
      await db('device_commands').insert({ device_sn: device.sn, command: `DATA UPDATE accgroup id=${group.id}\ttimezone1=${tzIds[0]}\ttimezone2=${tzIds[1]}\ttimezone3=${tzIds[2]}\tholiday=0\tverifystyle=0`, user_id: userId });
    }
  }
  const tenants = await db('tenants').where('user_id', userId).select('tenant_id');
  for (const t of tenants) { await syncTenantAccess(t.tenant_id); }
};

exports.getGroups = (userId) => db('access_groups').where('user_id', userId).select('*');
exports.createGroup = async (data, userId) => {
  const [id] = await db('access_groups').insert({ name: data.name, user_id: userId,
    timezone1_id: toNull(data.timezone1_id), timezone2_id: toNull(data.timezone2_id),
    timezone3_id: toNull(data.timezone3_id), holiday_id: toNull(data.holiday_id)
  }).returning('id');
  return id;
};
exports.deleteGroup = (id, userId) => db('access_groups').where({ id, user_id: userId }).del();

exports.getHolidays = (userId) => db('holidays').where('user_id', userId).select('*');
exports.createHoliday = async (data, userId) => {
  const [id] = await db('holidays').insert({ name: data.name, start_date: data.start_date, end_date: data.end_date,
    timezone_id: toNull(data.timezone_id), user_id: userId }).returning('id');
  const devices = await db('devices').where({ user_id: userId, adms_status: true });
  for (const dev of devices) {
    const start = new Date(data.start_date);
    await db('device_commands').insert({ device_sn: dev.sn,
      command: `DATA UPDATE holiday Holiday=${id}\tName=${data.name.replace(/\s+/g,'')}\tTimezone=${data.timezone_id||0}\tMonth=${start.getMonth()+1}\tDay=${start.getDate()}`,
      user_id: userId });
  }
  return id;
};
exports.deleteHoliday = (id, userId) => db('holidays').where({ id, user_id: userId }).del();

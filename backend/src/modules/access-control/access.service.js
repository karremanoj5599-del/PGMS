const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');
const { generateTZMask } = require('../../shared/utils/generateTZMask');
const { DAYS } = require('../../shared/constants');

// Core function: Sync tenant access state to biometric devices
// This is the single source of truth for device command generation
const syncTenantAccess = async (tenant_id) => {
  try {
    const tenant = await db('tenants').where('tenant_id', tenant_id).first();
    if (!tenant) return;

    const access = await db('access_control').where('tenant_id', tenant_id).first();
    const isApproved = access ? !!access.access_granted : false;

    const devices = await db('devices').where({ adms_status: true, user_id: tenant.user_id });
    if (devices.length === 0) return;

    for (const device of devices) {
      if (!device.sn) continue;
      const pin = tenant.biometric_pin || tenant.tenant_id.toString();

      // Clear pending commands for this user on this device
      await db('device_commands')
        .where({ device_sn: device.sn, executed: false })
        .andWhere(function() {
          this.where('command', 'like', `%Pin=${pin}\t%`)
              .orWhere('command', 'like', `%PIN=${pin}\t%`)
              .orWhere('command', 'like', `%PIN2=${pin}%`)
              .orWhere('command', 'like', `%accgroup%`);
        })
        .del();

      let commands = [];
      if (isApproved) {
        let grpId = 1;
        let tzIds = [1, 0, 0];

        if (access && access.access_group_id) {
          const group = await db('access_groups').where({ id: access.access_group_id, user_id: tenant.user_id }).first();
          if (group) {
            grpId = group.id;
            const tzs = [];
            const schedIds = [group.timezone1_id, group.timezone2_id, group.timezone3_id].filter(id => id);

            for (const sid of schedIds) {
              const s = await db('access_schedules').where({ id: sid, user_id: tenant.user_id }).first();
              if (!s) continue;
              const dStr = s.valid_days || '1111111';
              const tid = s.timezone_id;

              const daysMap = DAYS.map((day, i) => {
                const isActive = dStr[i] === '1';
                const start = s[`${day}_start`] || '00:00';
                const end = s[`${day}_end`] || '23:59';
                return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
              }).join('\t');

              commands.push({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tid}\t${daysMap}`, user_id: tenant.user_id });
              tzs.push(tid);
            }
            tzIds = [tzs[0] || 0, tzs[1] || 0, tzs[2] || 0];
          }
        } else {
          const scheduleId = access ? access.schedule_id || 1 : 1;
          const schedule = await db('access_schedules').where({ id: scheduleId, user_id: tenant.user_id }).first();
          if (schedule) {
            grpId = schedule.id;
            const tid = schedule.timezone_id;
            const dStr = schedule.valid_days || '1111111';

            const daysMap = DAYS.map((day, i) => {
              const isActive = dStr[i] === '1';
              const start = schedule[`${day}_start`] || '00:00';
              const end = schedule[`${day}_end`] || '23:59';
              return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
            }).join('\t');

            commands.push({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tid}\t${daysMap}`, user_id: tenant.user_id });
            tzIds = [tid, 0, 0];
          }
        }

        // Queue Group Definition
        let holidayId = 0;
        if (access && access.access_group_id) {
          const group = await db('access_groups').where({ id: access.access_group_id, user_id: tenant.user_id }).first();
          if (group && group.holiday_id) {
            holidayId = group.holiday_id;
            const holiday = await db('holidays').where('id', holidayId).first();
            if (holiday) {
              const hDate = new Date(holiday.start_date);
              commands.push({
                device_sn: device.sn,
                command: `DATA UPDATE holiday Holiday=${holiday.id}\tName=${holiday.name.replace(/\s+/g,'')}\tTimezone=${holiday.timezone_id || 0}\tMonth=${hDate.getMonth()+1}\tDay=${hDate.getDate()}`,
                user_id: tenant.user_id
              });
            }
          }
        }
        commands.push({ device_sn: device.sn, command: `DATA UPDATE accgroup id=${grpId}\ttimezone1=${tzIds[0]}\ttimezone2=${tzIds[1]}\ttimezone3=${tzIds[2]}\tholiday=${holidayId}\tverifystyle=0`, user_id: tenant.user_id });

        // Grant/Update: DATA UPDATE USERINFO
        const cleanName = tenant.name.replace(/[^\w]/g, '');
        const tzMask = generateTZMask(tzIds[0]);

        let extraParams = [];
        if (tenant.access_expiry_date) {
          const d = new Date(tenant.access_expiry_date);
          if (!isNaN(d)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            extraParams.push(`EndDatetime=${yyyy}${mm}${dd}235959`);
          }
        }
        if (tenant.punch_limit && tenant.punch_limit > 0) {
          extraParams.push(`ValidCount=${tenant.punch_limit}`);
        }
        const extraString = extraParams.length > 0 ? '\t' + extraParams.join('\t') : '';

        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=${grpId}\tTZ=${tzMask}\tPIN2=${pin}${extraString}`,
          user_id: tenant.user_id
        });
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE user Pin=${pin}\tEnabled=1`,
          user_id: tenant.user_id
        });

        // Queue Biometric Templates
        const templates = await db('biometric_templates').where({ tenant_id, is_valid: true });
        for (const tpl of templates) {
          const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
          const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
          if (tpl.type === 'fingerprint') {
            commands.push({
              device_sn: device.sn,
              command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=1${major}${minor}\tTmp=${tpl.template_data}`,
              user_id: tenant.user_id
            });
          } else {
            const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '0');
            const format = tpl.format ? `\tFormat=${tpl.format}` : '';
            commands.push({
              device_sn: device.sn,
              command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}\tTmp=${tpl.template_data}`,
              user_id: tenant.user_id
            });
          }
        }
      } else {
        // Restrict: block access
        const cleanName = tenant.name.replace(/[^\w]/g, '');
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=99\tTZ=0000000000000000\tPIN2=${pin}`,
          user_id: tenant.user_id
        });
      }

      if (commands.length > 0) {
        await db('device_commands').insert(commands);
      }
    }
    console.log(`[ADMS] Queued sync for tenant ${tenant_id} as PIN ${tenant.biometric_pin || tenant_id} on ${devices.length} devices`);
  } catch (err) {
    console.error('[ADMS] Failed to sync tenant access:', err.message);
  }
};

// Toggle access for a tenant
const toggleAccess = async (tenantId, accessGranted) => {
  const tid = Number(tenantId);
  const existing = await db('access_control').where('tenant_id', tid).first();
  if (existing) {
    await db('access_control').where('tenant_id', tid).update({ access_granted: !!accessGranted });
  } else {
    await db('access_control').insert({ tenant_id: tid, access_granted: !!accessGranted });
  }
  await syncTenantAccess(tid);
};

// Assign schedule to tenant
const assignSchedule = async (tenantId, scheduleId) => {
  const tid = Number(tenantId);
  const sid = Number(scheduleId);
  const existing = await db('access_control').where('tenant_id', tid).first();
  if (existing) {
    await db('access_control').where('tenant_id', tid).update({ schedule_id: sid });
  } else {
    await db('access_control').insert({ tenant_id: tid, schedule_id: sid, access_granted: true });
  }
  await syncTenantAccess(tid);
};

// Assign access group to tenant
const assignGroup = async (tenantId, groupId) => {
  const tid = Number(tenantId);
  const existing = await db('access_control').where('tenant_id', tid).first();
  if (existing) {
    await db('access_control').where('tenant_id', tid).update({ access_group_id: toNull(groupId) });
  } else {
    await db('access_control').insert({ tenant_id: tid, access_group_id: toNull(groupId), access_granted: true });
  }
  await syncTenantAccess(tid);
};

module.exports = {
  syncTenantAccess,
  toggleAccess,
  assignSchedule,
  assignGroup
};

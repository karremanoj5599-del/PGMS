const db = require('../../config/database');
const { toNull } = require('../../shared/utils/toNull');
const { generateTZMask } = require('../../shared/utils/generateTZMask');
const { DAYS } = require('../../shared/constants');

// ── Throttled Enforcement (Vercel-compatible) ─────────────────────────────────
let lastEnforcementRun = 0;
const ENFORCEMENT_INTERVAL = 15 * 60 * 1000; // 15 minutes

const enforceExpiryRules = async () => {
  const now = Date.now();
  if (now - lastEnforcementRun < ENFORCEMENT_INTERVAL) return; // Throttle
  lastEnforcementRun = now;

  try {
    console.log('[ENFORCE] Running expiry & payment enforcement check...');

    // ── 1. Expiry Date Enforcement ──────────────────────────────────────────
    const tenants = await db('tenants')
      .where('status', 'Staying')
      .select('tenant_id', 'access_expiry_date', 'expiry_date', 'punch_limit', 'biometric_pin', 'user_id');

    let lockedCount = 0;

    for (const tenant of tenants) {
      let shouldLock = false;
      let reason = '';

      // Check expiry dates
      let effectiveExpiry = null;
      if (tenant.access_expiry_date) {
        effectiveExpiry = new Date(tenant.access_expiry_date);
      } else if (tenant.expiry_date) {
        effectiveExpiry = new Date(tenant.expiry_date);
      }

      if (effectiveExpiry && !isNaN(effectiveExpiry)) {
        effectiveExpiry.setHours(23, 59, 59, 999);
        if (effectiveExpiry < new Date()) {
          shouldLock = true;
          reason = `expired on ${effectiveExpiry.toISOString().split('T')[0]}`;
        }
      }

      // Check punch limit
      if (!shouldLock && tenant.punch_limit && tenant.punch_limit > 0) {
        const today = new Date().toISOString().split('T')[0];
        const punches = await db('attendance_logs')
          .where('tenant_id', tenant.tenant_id)
          .andWhere('punch_time', '>=', today + ' 00:00:00')
          .count('* as count')
          .first();
        if (punches && Number(punches.count) >= tenant.punch_limit) {
          shouldLock = true;
          reason = `punch limit reached (${punches.count}/${tenant.punch_limit})`;
        }
      }

      if (shouldLock) {
        const existing = await db('access_control').where('tenant_id', tenant.tenant_id).first();
        if (existing && existing.access_granted === false) continue; // Already locked

        await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
        await syncTenantAccess(tenant.tenant_id, true);
        lockedCount++;
        console.log(`[ENFORCE] Locked tenant ${tenant.tenant_id}: ${reason}`);
      }
    }

    // ── 2. Payment Overdue Enforcement ──────────────────────────────────────
    const stayingTenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .where('tenants.status', 'Staying')
      .select('tenants.tenant_id', 'tenants.user_id');

    for (const tenant of stayingTenants) {
      const lastPayment = await db('payments')
        .where('tenant_id', tenant.tenant_id)
        .orderBy('payment_date', 'desc')
        .first();

      if (lastPayment && lastPayment.balance > 0) {
        const daysSincePay = Math.floor((Date.now() - new Date(lastPayment.payment_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePay > 30) {
          const existing = await db('access_control').where('tenant_id', tenant.tenant_id).first();
          if (existing && existing.access_granted === false) continue;

          await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
          await syncTenantAccess(tenant.tenant_id, true);
          lockedCount++;
          console.log(`[ENFORCE] Locked tenant ${tenant.tenant_id}: payment overdue ${daysSincePay} days`);
        }
      }
    }

    if (lockedCount > 0) {
      console.log(`[ENFORCE] Total tenants locked this run: ${lockedCount}`);
    }
  } catch (err) {
    console.error('[ENFORCE] Enforcement error:', err.message);
  }
};

// Core function: Sync tenant access state to biometric devices
// This is the single source of truth for device command generation
const syncTenantAccess = async (tenant_id, toggleOnly = false) => {
  try {
    const tid = Number(tenant_id);
    const tenant = await db('tenants').where('tenant_id', tid).first();
    if (!tenant) return;

    let access = await db('access_control').where('tenant_id', tid).first();
    if (!access && tenant.status === 'Staying') {
      try {
        await db('access_control').insert({
          tenant_id: tid,
          access_granted: true,
          user_id: tenant.user_id
        });
        access = await db('access_control').where('tenant_id', tid).first();
      } catch (e) {
        console.error('[ADMS] Self-healing access insert failed:', e.message);
      }
    }
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

      if (toggleOnly) {
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=${isApproved ? 1 : 0}`,
          user_id: tenant.user_id
        });
      } else if (!isApproved) {
        // If restricted/blocked, ONLY send the disable command.
        // This keeps templates intact on the device and avoids unnecessary heavy writes.
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=0`,
          user_id: tenant.user_id
        });
      } else {
        // If approved, perform full sync (Timezones, Groups, USERINFO, user Enable=1, BIODATA)
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
        if (tenant.punch_limit && tenant.punch_limit > 0 && isApproved) {
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
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=1`,
          user_id: tenant.user_id
        });

        // ZKTeco ADMS devices clear biometric templates when USERINFO is updated. 
        // We MUST resync the templates immediately after the USERINFO update to prevent them from being lost.
        const templates = await db('biometric_templates').where('tenant_id', tid);
        for (const tpl of templates) {
          const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
          const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
          const format = tpl.format ? `\tFormat=${tpl.format}` : '';
          const size = tpl.template_data ? `\tSize=${Buffer.from(tpl.template_data, 'base64').length}` : '';
          const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');
          commands.push({
            device_sn: device.sn,
            command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}${size}\tTmp=${tpl.template_data}`,
            user_id: tenant.user_id
          });
        }
      }

      if (commands.length > 0) {
        await db('device_commands').insert(commands);
      }
    }
    console.log(`[ADMS] Queued sync for tenant ${tid} as PIN ${tenant.biometric_pin || tid} on ${devices.length} devices`);
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
  await syncTenantAccess(tid, true);
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

const toggleStaffAccess = async (staffId, accessGranted) => {
  const sid = Number(staffId);
  await db('staff').where('staff_id', sid).update({ access_granted: !!accessGranted });
  await syncStaffAccess(sid, true);
};

const syncStaffAccess = async (staff_id, toggleOnly = false) => {
  try {
    const sid = Number(staff_id);
    const staff = await db('staff').where('staff_id', sid).first();
    if (!staff) return;

    const isApproved = !!staff.access_granted && staff.status === 'Active';

    const devices = await db('devices').where({ adms_status: true, user_id: staff.admin_user_id });
    if (devices.length === 0) return;

    for (const device of devices) {
      if (!device.sn) continue;
      const pin = staff.biometric_pin || staff.staff_id.toString();

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

      if (toggleOnly) {
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=${isApproved ? 1 : 0}`,
          user_id: staff.admin_user_id
        });
      } else if (!isApproved) {
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=0`,
          user_id: staff.admin_user_id
        });
      } else {
        // Full sync: Give staff 24/7 access (Group 1, TZ 1)
        const cleanName = staff.name.replace(/[^\w]/g, '');
        const grpId = 1;
        const tzMask = generateTZMask(1);
        
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=${grpId}\tTZ=${tzMask}\tPIN2=${pin}`,
          user_id: staff.admin_user_id
        });
        
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tEnable=1`,
          user_id: staff.admin_user_id
        });

        // Resync biometric templates because updating USERINFO deletes them on the device
        const templates = await db('biometric_templates').where('staff_id', sid);
        for (const tpl of templates) {
          const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
          const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
          const format = tpl.format ? `\tFormat=${tpl.format}` : '';
          const size = tpl.template_data ? `\tSize=${Buffer.from(tpl.template_data, 'base64').length}` : '';
          const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '1');
          commands.push({
            device_sn: device.sn,
            command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}${size}\tTmp=${tpl.template_data}`,
            user_id: staff.admin_user_id
          });
        }
      }

      if (commands.length > 0) {
        await db('device_commands').insert(commands);
      }
    }
    console.log(`[ADMS] Queued sync for staff ${sid} as PIN ${staff.biometric_pin || sid} on ${devices.length} devices`);
  } catch (err) {
    console.error('[ADMS] Failed to sync staff access:', err.message);
  }
};

module.exports = {
  syncTenantAccess,
  toggleAccess,
  assignSchedule,
  assignGroup,
  syncStaffAccess,
  toggleStaffAccess,
  enforceExpiryRules
};

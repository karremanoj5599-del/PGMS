const db = require('../config/database');
const { syncTenantAccess } = require('../modules/access-control/access.service');

const INTERVAL = 60 * 60 * 1000; // Run every hour

const enforceInactivityRules = async () => {
  try {
    const tenants = await db('tenants').where('status', 'Staying').select('tenant_id', 'access_expiry_date', 'punch_limit', 'biometric_pin');

    for (const tenant of tenants) {
      let shouldLock = false;

      // Check expiry date
      if (tenant.access_expiry_date) {
        const expiry = new Date(tenant.access_expiry_date);
        if (!isNaN(expiry) && expiry < new Date()) {
          shouldLock = true;
          console.log(`[JOB] Access expired for tenant ${tenant.tenant_id} (expired: ${tenant.access_expiry_date})`);
        }
      }

      // Check punch limit
      if (tenant.punch_limit && tenant.punch_limit > 0) {
        const today = new Date().toISOString().split('T')[0];
        const punches = await db('attendance_logs')
          .where('tenant_id', tenant.tenant_id)
          .andWhere('punch_time', '>=', today + ' 00:00:00')
          .count('* as count')
          .first();

        if (punches && punches.count >= tenant.punch_limit) {
          shouldLock = true;
          console.log(`[JOB] Punch limit reached for tenant ${tenant.tenant_id} (${punches.count}/${tenant.punch_limit})`);
        }
      }

      if (shouldLock) {
        await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
        await syncTenantAccess(tenant.tenant_id);
      }
    }
  } catch (err) {
    console.error('[JOB] Inactivity enforcement error:', err.message);
  }
};

const start = () => {
  console.log('[JOB] Inactivity enforcer started (interval: 1h)');
  setInterval(enforceInactivityRules, INTERVAL);
};

module.exports = { enforceInactivityRules, start };

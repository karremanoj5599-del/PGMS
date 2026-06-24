const db = require('../config/database');
const { syncTenantAccess } = require('../modules/access-control/access.service');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const INTERVAL = 60 * 60 * 1000; // Run every hour

const checkPaymentStatusAndEnforceAccess = async () => {
  try {
    const tenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .where('tenants.status', 'Staying')
      .select('tenants.*', 'beds.bed_cost', 'beds.advance_amount');

    for (const tenant of tenants) {
      const lastPayment = await db('payments')
        .where('tenant_id', tenant.tenant_id)
        .orderBy('payment_date', 'desc')
        .first();

      if (lastPayment && lastPayment.balance > 0) {
        const daysSincePay = Math.floor((Date.now() - new Date(lastPayment.payment_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePay > 30) {
          await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
          await syncTenantAccess(tenant.tenant_id);
          console.log(`[JOB] Payment overdue — locked access for tenant ${tenant.tenant_id}`);

          const message = `Your access has been revoked due to overdue rent of ${daysSincePay} days. Please pay immediately to restore access.`;

          // Send Expo Push Notification
          if (tenant.expo_push_token && Expo.isExpoPushToken(tenant.expo_push_token)) {
            const messages = [{
              to: tenant.expo_push_token,
              sound: 'default',
              title: 'Access Revoked - Rent Overdue',
              body: message,
              data: { type: 'access' },
            }];
            expo.sendPushNotificationsAsync(messages).catch(err => console.error(`[PUSH MOCK] Failed to send push:`, err));
          }

          // Save to Database Inbox
          await db('notifications').insert({
            user_id: tenant.user_id,
            tenant_id: tenant.tenant_id,
            title: 'Access Revoked - Rent Overdue',
            body: message,
            type: 'access'
          });
        }
      }
    }
  } catch (err) {
    console.error('[JOB] Payment enforcement error:', err.message);
  }
};

const start = () => {
  console.log('[JOB] Payment enforcer started (interval: 1h)');
  setInterval(checkPaymentStatusAndEnforceAccess, INTERVAL);
};

module.exports = { checkPaymentStatusAndEnforceAccess, start };

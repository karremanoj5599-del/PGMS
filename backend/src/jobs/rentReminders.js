const db = require('../config/database');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const INTERVAL = 24 * 60 * 60 * 1000; // Run daily

const sendRentReminders = async () => {
  console.log('[JOB] Starting automated rent reminders (Email/SMS)...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminderWindowEnd = new Date(today);
    reminderWindowEnd.setDate(reminderWindowEnd.getDate() + 7);

    // Find tenants whose expiry is within 7 days, or past due
    const tenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .where('tenants.status', 'Staying')
      .whereNotNull('tenants.expiry_date')
      .where('tenants.expiry_date', '<=', reminderWindowEnd.toISOString().split('T')[0])
      .select('tenants.*', 'beds.bed_cost');

    for (const tenant of tenants) {
      const expiryDate = new Date(tenant.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      const diffMs = expiryDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      const rentAmount = tenant.custom_rent !== null && tenant.custom_rent !== undefined 
        ? tenant.custom_rent 
        : (tenant.bed_cost || 0);

      let message = '';
      if (daysRemaining > 0 && [7, 3, 1].includes(daysRemaining)) {
        message = `Dear ${tenant.name}, your rent of ₹${rentAmount} for PGMS is due in ${daysRemaining} days. Please pay by ${expiryDate.toLocaleDateString()}.`;
      } else if (daysRemaining === 0) {
        message = `Dear ${tenant.name}, your rent of ₹${rentAmount} for PGMS is due TODAY. Please ensure payment is completed.`;
      } else if (daysRemaining < 0 && Math.abs(daysRemaining) % 3 === 0) {
        // Send overdue reminder every 3 days
        message = `URGENT: Dear ${tenant.name}, your rent of ₹${rentAmount} is OVERDUE by ${Math.abs(daysRemaining)} days. Please pay immediately.`;
      }

      if (message) {
        // Send Expo Push Notification
        if (tenant.expo_push_token && Expo.isExpoPushToken(tenant.expo_push_token)) {
          const messages = [{
            to: tenant.expo_push_token,
            sound: 'default',
            title: daysRemaining <= 0 ? 'Urgent: Rent Overdue' : 'Rent Reminder',
            body: message,
            data: { type: 'payment' },
          }];
          
          expo.sendPushNotificationsAsync(messages).catch(err => {
            console.error(`[PUSH MOCK] Failed to send push to ${tenant.expo_push_token}:`, err);
          });
        }

        // Save to Database Inbox
        await db('notifications').insert({
          user_id: tenant.user_id,
          tenant_id: tenant.tenant_id,
          title: daysRemaining <= 0 ? 'Urgent: Rent Overdue' : 'Rent Reminder',
          body: message,
          type: 'payment'
        });

        // Mock SMS Send
        if (tenant.mobile) {
          console.log(`[SMS MOCK] To: ${tenant.mobile} | Msg: ${message}`);
        }
        // Mock Email Send
        if (tenant.email) {
          console.log(`[EMAIL MOCK] To: ${tenant.email} | Subject: Rent Reminder | Body: ${message}`);
        }
      }
    }
  } catch (err) {
    console.error('[JOB] Rent reminder error:', err.message);
  }
};

const start = () => {
  console.log('[JOB] Rent reminders scheduled (interval: 24h)');
  // Run once on startup, then every 24h
  sendRentReminders();
  setInterval(sendRentReminders, INTERVAL);
};

module.exports = { start, sendRentReminders };

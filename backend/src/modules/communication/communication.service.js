const db = require('../../config/database');

const CHANNELS = ['sms', 'whatsapp', 'voicecall'];
const TRIGGER_TYPES = ['rent_reminder', 'rent_overdue'];

// ─── Global Settings ─────────────────────────────────────────────────────────

/**
 * Get all global communication settings for a user.
 * Returns a structured object: { sms: { rent_reminder: true, rent_overdue: false }, ... }
 */
exports.getSettings = async (userId) => {
  const rows = await db('communication_settings').where('user_id', userId);

  const settings = {};
  for (const ch of CHANNELS) {
    settings[ch] = {};
    for (const tt of TRIGGER_TYPES) {
      const row = rows.find(r => r.channel === ch && r.trigger_type === tt);
      settings[ch][tt] = row ? !!row.enabled : false;
    }
  }
  return settings;
};

/**
 * Upsert global communication settings.
 * @param {number} userId
 * @param {Object} settings — e.g. { sms: { rent_reminder: true, rent_overdue: false }, ... }
 */
exports.updateSettings = async (userId, settings) => {
  for (const ch of CHANNELS) {
    if (!settings[ch]) continue;
    for (const tt of TRIGGER_TYPES) {
      if (settings[ch][tt] === undefined) continue;

      const existing = await db('communication_settings')
        .where({ user_id: userId, channel: ch, trigger_type: tt })
        .first();

      if (existing) {
        await db('communication_settings')
          .where({ setting_id: existing.setting_id })
          .update({ enabled: !!settings[ch][tt], updated_at: db.fn.now() });
      } else {
        await db('communication_settings').insert({
          user_id: userId,
          channel: ch,
          trigger_type: tt,
          enabled: !!settings[ch][tt]
        });
      }
    }
  }

  return exports.getSettings(userId);
};

// ─── Per-Tenant Preferences ──────────────────────────────────────────────────

/**
 * Get communication preferences for a specific tenant.
 * Returns: { sms: 'global', whatsapp: 'on', voicecall: 'off' }
 */
exports.getTenantPreferences = async (userId, tenantId) => {
  const rows = await db('tenant_comm_preferences')
    .where({ user_id: userId, tenant_id: tenantId });

  const prefs = {};
  for (const ch of CHANNELS) {
    const row = rows.find(r => r.channel === ch);
    prefs[ch] = row ? row.override : 'global';
  }
  return prefs;
};

/**
 * Upsert per-tenant communication preferences.
 * @param {Object} prefs — e.g. { sms: 'global', whatsapp: 'on', voicecall: 'off' }
 */
exports.updateTenantPreferences = async (userId, tenantId, prefs) => {
  for (const ch of CHANNELS) {
    if (prefs[ch] === undefined) continue;
    const override = ['global', 'on', 'off'].includes(prefs[ch]) ? prefs[ch] : 'global';

    const existing = await db('tenant_comm_preferences')
      .where({ tenant_id: tenantId, channel: ch })
      .first();

    if (existing) {
      await db('tenant_comm_preferences')
        .where({ pref_id: existing.pref_id })
        .update({ override, updated_at: db.fn.now() });
    } else {
      await db('tenant_comm_preferences').insert({
        tenant_id: tenantId,
        user_id: userId,
        channel: ch,
        override
      });
    }
  }
  return exports.getTenantPreferences(userId, tenantId);
};

// ─── Communication Queue ─────────────────────────────────────────────────────

/**
 * Get the communication queue for a user, with optional filters.
 */
exports.getQueue = async (userId, filters = {}) => {
  let query = db('communication_queue')
    .leftJoin('tenants', 'communication_queue.tenant_id', 'tenants.tenant_id')
    .where('communication_queue.user_id', userId)
    .select(
      'communication_queue.*',
      'tenants.name as tenant_name',
      'tenants.mobile as tenant_mobile'
    )
    .orderBy('communication_queue.created_at', 'desc');

  if (filters.status) {
    query = query.where('communication_queue.status', filters.status);
  }
  if (filters.channel) {
    query = query.where('communication_queue.channel', filters.channel);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  return query;
};

/**
 * Process (send) queue items — mark as sent + return action links.
 * @param {number[]} queueIds — array of queue_id values
 */
exports.processQueue = async (userId, queueIds) => {
  const items = await db('communication_queue')
    .leftJoin('tenants', 'communication_queue.tenant_id', 'tenants.tenant_id')
    .whereIn('communication_queue.queue_id', queueIds)
    .where('communication_queue.user_id', userId)
    .where('communication_queue.status', 'pending')
    .select('communication_queue.*', 'tenants.name as tenant_name', 'tenants.mobile as tenant_mobile');

  const results = [];

  for (const item of items) {
    const cleanPhone = (item.recipient || '').replace(/\D/g, '');
    let actionUrl = null;

    if (item.channel === 'whatsapp') {
      actionUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(item.message_text)}`;
    } else if (item.channel === 'voicecall') {
      actionUrl = `tel:${item.recipient}`;
    } else if (item.channel === 'sms') {
      // Mock SMS — in production, call a real SMS API here
      console.log(`[SMS SEND] To: ${item.recipient} | Msg: ${item.message_text}`);
      actionUrl = `sms:${item.recipient}?body=${encodeURIComponent(item.message_text)}`;
    }

    // Mark as sent
    await db('communication_queue')
      .where('queue_id', item.queue_id)
      .update({ status: 'sent', sent_at: db.fn.now() });

    // Also log in message_logs
    await db('message_logs').insert({
      user_id: userId,
      tenant_id: item.tenant_id,
      channel: item.channel,
      recipient: cleanPhone,
      message_text: item.message_text,
      status: 'sent'
    });

    results.push({
      queue_id: item.queue_id,
      tenant_name: item.tenant_name,
      channel: item.channel,
      action_url: actionUrl,
      status: 'sent'
    });
  }

  return results;
};

/**
 * Generate rent reminder/overdue queue entries for all users with communication enabled.
 * Can be called by the daily job or manually from the admin panel.
 */
exports.generateRentReminders = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // 1. Get this user's global settings
  const globalSettings = await exports.getSettings(userId);

  // Collect all active channels for each trigger type
  const activeChannels = {
    rent_reminder: CHANNELS.filter(ch => globalSettings[ch]?.rent_reminder),
    rent_overdue: CHANNELS.filter(ch => globalSettings[ch]?.rent_overdue)
  };

  if (activeChannels.rent_reminder.length === 0 && activeChannels.rent_overdue.length === 0) {
    return { generated: 0, message: 'No channels are enabled. Enable at least one channel in settings.' };
  }

  // 2. Find tenants with upcoming/overdue rent
  const reminderWindowEnd = new Date(today);
  reminderWindowEnd.setDate(reminderWindowEnd.getDate() + 7);

  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
    .where('tenants.status', 'Staying')
    .where('tenants.user_id', userId)
    .whereNotNull('tenants.expiry_date')
    .whereNotNull('tenants.mobile')
    .where('tenants.mobile', '!=', '')
    .select('tenants.tenant_id', 'tenants.name', 'tenants.mobile', 'tenants.expiry_date', 'tenants.custom_rent', 'beds.bed_cost');

  let generated = 0;

  for (const tenant of tenants) {
    const expiryDate = new Date(tenant.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    const diffMs = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const rentAmount = tenant.custom_rent !== null && tenant.custom_rent !== undefined
      ? tenant.custom_rent
      : (tenant.bed_cost || 0);

    let message = '';
    let triggerType = '';

    // Rent reminders: 7, 3, 1, 0 days before expiry
    if (daysRemaining > 0 && [7, 3, 1].includes(daysRemaining)) {
      message = `Dear ${tenant.name}, your rent of ₹${rentAmount} is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please pay by ${expiryDate.toLocaleDateString()}.`;
      triggerType = 'rent_reminder';
    } else if (daysRemaining === 0) {
      message = `Dear ${tenant.name}, your rent of ₹${rentAmount} is due TODAY. Please ensure payment is completed immediately.`;
      triggerType = 'rent_reminder';
    }
    // Overdue reminders: every 3 days after expiry
    else if (daysRemaining < 0 && Math.abs(daysRemaining) % 3 === 0) {
      message = `URGENT: Dear ${tenant.name}, your rent of ₹${rentAmount} is OVERDUE by ${Math.abs(daysRemaining)} days. Please pay immediately to avoid access restrictions.`;
      triggerType = 'rent_overdue';
    }

    if (!message || !triggerType) continue;

    // 3. Get per-tenant preferences
    const tenantPrefs = await exports.getTenantPreferences(userId, tenant.tenant_id);

    // 4. For each active channel, create a queue entry
    const channelsForTrigger = activeChannels[triggerType] || [];

    for (const channel of channelsForTrigger) {
      // Check per-tenant override
      const override = tenantPrefs[channel] || 'global';
      if (override === 'off') continue; // Explicitly disabled for this tenant

      // Check if already queued for today
      const existing = await db('communication_queue')
        .where({
          user_id: userId,
          tenant_id: tenant.tenant_id,
          channel,
          scheduled_date: todayStr
        })
        .whereIn('status', ['pending', 'sent'])
        .first();

      if (existing) continue; // Skip duplicate

      await db('communication_queue').insert({
        user_id: userId,
        tenant_id: tenant.tenant_id,
        channel,
        message_text: message,
        recipient: tenant.mobile,
        trigger_type: triggerType,
        status: 'pending',
        scheduled_date: todayStr
      });

      generated++;
    }
  }

  return { generated, message: `Generated ${generated} communication queue entries.` };
};

const db = require('../../config/database');

/**
 * Service to handle system activity logs and SSE events.
 */

// Basic in-memory store of connected SSE clients
// Map of userId -> Set of Response objects
const clients = new Map();

exports.addClient = (userId, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);

  res.on('close', () => {
    clients.get(userId).delete(res);
    if (clients.get(userId).size === 0) {
      clients.delete(userId);
    }
  });
};

/**
 * Emit an event to all connected clients for a user
 */
exports.emitToUser = (userId, eventName, data) => {
  if (clients.has(userId)) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients.get(userId)) {
      res.write(payload);
    }
  }
};

/**
 * Create an activity log and optionally emit it via SSE
 */
exports.logActivity = async (userId, data, emitSse = true) => {
  const { event_type, action, title, description, metadata } = data;

  try {
    const [inserted] = await db('activity_logs').insert({
      user_id: userId,
      event_type,
      action,
      title,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null
    }).returning('*');

    const log = typeof inserted === 'object' ? inserted : await db('activity_logs').where('log_id', inserted).first();

    if (emitSse) {
      this.emitToUser(userId, 'activity', log);
    }

    return log;
  } catch (err) {
    console.error('Failed to save activity log:', err);
  }
};

/**
 * Get all activity logs for a user with optional filters
 */
exports.getLogs = async (userId, filters = {}) => {
  let query = db('activity_logs')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(filters.limit || 50);

  if (filters.event_type) query = query.where('event_type', filters.event_type);
  if (filters.action) query = query.where('action', filters.action);

  return query;
};

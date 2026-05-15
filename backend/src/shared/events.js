const EventEmitter = require('events');

/**
 * Global event bus for the backend.
 * Used to broadcast real-time events (like ADMS punches) to SSE clients.
 */
const eventBus = new EventEmitter();

// Optional: Increase max listeners if many users are connected simultaneously
eventBus.setMaxListeners(100);

module.exports = eventBus;

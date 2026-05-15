const eventBus = require('../../shared/events');

/**
 * SSE (Server-Sent Events) handler for real-time monitoring.
 * Streams events from the global event bus to the connected client.
 */
exports.stream = (req, res) => {
  const userId = req.userId; // Extracted by auth middleware
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Keep-alive heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Listener for 'punch' events
  const onPunch = (data) => {
    // Basic multi-tenant isolation: Only send events belonging to this admin user
    // data.admin_user_id should match the userId of the connected admin
    if (!userId || data.admin_user_id === userId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  eventBus.on('punch', onPunch);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off('punch', onPunch);
    res.end();
  });
};

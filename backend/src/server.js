const app = require('./app');
const config = require('./config');

// ── Register Background Jobs ─────────────────────────────────────────────────
if (!config.isVercel) {
  const paymentEnforcer = require('./jobs/paymentEnforcer');
  const inactivityEnforcer = require('./jobs/inactivityEnforcer');
  paymentEnforcer.start();
  inactivityEnforcer.start();
}

// ── Start HTTP Server ────────────────────────────────────────────────────────
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('close', () => {
  console.log('Server closed');
});

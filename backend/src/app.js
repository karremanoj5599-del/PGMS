const express = require('express');
const cors = require('cors');

// Middleware
const { extractUser } = require('./middleware/auth');
const { admsDebugLogger } = require('./middleware/requestLogger');
const { globalErrorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(cors());

// ADMS Protocol Raw Body Fix: Devices often send plain text with urlencoded headers
app.use('/iclock', express.text({ type: '*/*', limit: '50mb' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['text/*', 'application/octet-stream'], limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Public Routes ────────────────────────────────────────────────────────────
app.use('/api/public/tickets', require('./modules/tickets/tickets.public.routes'));

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(admsDebugLogger);
app.use(extractUser);

// ── Access Enforcement (Vercel-compatible, replaces setInterval jobs) ────────
const { enforceExpiryRules } = require('./modules/access-control/access.service');
app.use('/api', async (req, res, next) => {
  // Fire-and-forget: don't block the request
  if (req.userId) {
    enforceExpiryRules().catch(err => console.error('[ENFORCE-MW] Error:', err.message));
  }
  next();
});

// ── Feature Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',                require('./modules/auth/auth.routes'));
app.use('/api/floors',              require('./modules/floors/floors.routes'));
app.use('/api/rooms',               require('./modules/rooms/rooms.routes'));
app.use('/api/beds',                require('./modules/beds/beds.routes'));
app.use('/api/tenants',             require('./modules/tenants/tenants.routes'));
app.use('/api/payments',            require('./modules/payments/payments.routes'));
app.use('/api/access-control',      require('./modules/access-control/access.routes'));
app.use('/api/access-schedules',    require('./modules/access-control/schedules.routes'));
app.use('/api/access-groups',       require('./modules/access-control/groups.routes'));
app.use('/api/holidays',            require('./modules/access-control/holidays.routes'));
app.use('/api/devices',             require('./modules/devices/devices.routes'));
app.use('/api/biometric-templates', require('./modules/biometrics/biometrics.routes'));
app.use('/api/reports',             require('./modules/reports/reports.routes'));
app.use('/api/licenses',            require('./modules/licenses/licenses.routes'));
app.use('/api/admin',               require('./modules/billing/billing.routes'));
app.use('/api/admin',               require('./modules/tickets/tickets.routes'));
app.use('/api/tenant',              require('./modules/tenant-app/tenant-app.routes'));
app.use('/api/events',              require('./modules/events/events.routes'));
app.use('/api/notifications',       require('./modules/notifications/notifications.routes'));
app.use('/api/system',              require('./modules/system/system.routes'));
app.use('/api/staff',               require('./modules/staff/staff.routes'));

// ── ADMS Protocol (Device Communication) ─────────────────────────────────────
require('./modules/devices/adms/adms.routes')(app);

// ── Unknown device polls ─────────────────────────────────────────────────────
const devController = require('./modules/devices/devices.controller');
app.get('/api/admin/unknown-polls', devController.unknownPolls);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('PGMS Backend is running'));

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(globalErrorHandler);

// Export for Vercel serverless function
module.exports = app;

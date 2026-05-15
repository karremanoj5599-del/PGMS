const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { tenantAuth } = require('../../middleware/tenantAuth');

// Auth
router.post('/auth/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ error: 'Mobile and password are required' });
  try {
    const tenant = await db('tenants').where('mobile', mobile).first();
    if (!tenant) return res.status(401).json({ error: 'Invalid credentials' });
    if (!tenant.password_hash) return res.status(403).json({ error: 'Mobile access not enabled. Contact admin.' });
    const isValid = await bcrypt.compare(password, tenant.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, token: tenant.tenant_id.toString(), tenant: { id: tenant.tenant_id, name: tenant.name, mobile: tenant.mobile, user_id: tenant.user_id } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/auth/update-pin', tenantAuth, async (req, res) => {
  const { oldPin, newPin } = req.body;
  if (!oldPin || !newPin) return res.status(400).json({ error: 'Old and new PIN required' });
  try {
    const isValid = await bcrypt.compare(oldPin, req.tenant.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect old PIN' });
    const hashed = await bcrypt.hash(newPin, 10);
    await db('tenants').where('tenant_id', req.tenant.tenant_id).update({ password_hash: hashed, biometric_pin: newPin });
    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) { res.status(500).json({ error: 'Failed to update PIN' }); }
});

// Dashboard
router.get('/dashboard', tenantAuth, async (req, res) => {
  try {
    const tenant = await db('tenants').leftJoin('beds', 'tenants.bed_id', 'beds.bed_id').leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
      .where('tenants.tenant_id', req.tenant.tenant_id)
      .select('tenants.*', 'beds.bed_number', 'beds.bed_cost', 'beds.advance_amount', 'rooms.room_number', 'rooms.sharing_capacity').first();

    const latestBilling = await db('billing').where('tenant_id', req.tenant.tenant_id).orderBy('year', 'desc').orderBy('month', 'desc').first();
    const totalPaidThisYear = await db('payments').where('tenant_id', req.tenant.tenant_id)
      .whereRaw(db.client.config.client === 'pg' ? "EXTRACT(YEAR FROM payment_date) = ?" : "strftime('%Y', payment_date) = ?",
        [db.client.config.client === 'pg' ? new Date().getFullYear() : new Date().getFullYear().toString()])
      .sum('amount_paid as total').first();

    const latestPayment = await db('payments').where('tenant_id', req.tenant.tenant_id).orderBy('payment_date', 'desc').orderBy('payment_id', 'desc').first();
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date();
    const realBalance = latestPayment ? latestPayment.balance : ((tenant.bed_cost||0) + (tenant.advance_amount||0));
    let calcDue = (tenant.bed_cost||0) + (tenant.advance_amount||0);
    if (latestPayment) calcDue = latestPayment.amount_paid + latestPayment.balance;

    res.json({
      success: true,
      tenant: { ...tenant, id: tenant.tenant_id, room: tenant.room_number||'—', bed: tenant.bed_number||'—', sharing: `${tenant.sharing_capacity||0} Sharing`, total_paid_this_year: totalPaidThisYear.total||0 },
      billing: { month: latestBilling?.month||monthNames[now.getMonth()], year: latestBilling?.year||now.getFullYear(), fixed_rent: tenant.bed_cost||(latestPayment?calcDue:0), previous_balance: latestBilling?.previous_balance||0, total_due: latestBilling?.total_due||calcDue, amount_paid: latestBilling?.amount_paid||(latestPayment?latestPayment.amount_paid:0), current_balance: realBalance }
    });
  } catch (err) { console.error('Dashboard Error:', err); res.status(500).json({ error: 'Failed to fetch dashboard' }); }
});

// Payments
router.get('/payments/billing', tenantAuth, async (req, res) => {
  try {
    let history = await db('billing').where('tenant_id', req.tenant.tenant_id).orderBy('year', 'desc').orderBy('month', 'desc');
    const latestPayment = await db('payments').where('tenant_id', req.tenant.tenant_id).orderBy('payment_date', 'desc').orderBy('payment_id', 'desc').first();
    const tenant = await db('tenants').leftJoin('beds', 'tenants.bed_id', 'beds.bed_id').where('tenants.tenant_id', req.tenant.tenant_id).select('beds.bed_cost', 'beds.advance_amount').first();

    if (history.length === 0 && tenant) {
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const now = new Date();
      const calcDue = latestPayment ? (latestPayment.amount_paid + latestPayment.balance) : ((tenant.bed_cost||0) + (tenant.advance_amount||0));
      history = [{ month: monthNames[now.getMonth()], year: now.getFullYear(), fixed_rent: tenant.bed_cost||(latestPayment?calcDue:0), previous_balance: 0, total_due: calcDue, amount_paid: latestPayment?latestPayment.amount_paid:0, current_balance: latestPayment?latestPayment.balance:calcDue }];
    } else if (history.length > 0 && latestPayment) {
      history[0].current_balance = latestPayment.balance;
      history[0].total_due = (history[0].total_due||0)||(latestPayment.amount_paid + latestPayment.balance);
      history[0].amount_paid = history[0].total_due - latestPayment.balance;
    }
    res.json({ success: true, history });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch billing history' }); }
});

router.get('/payments/history', tenantAuth, async (req, res) => {
  try {
    const history = await db('payments').where('tenant_id', req.tenant.tenant_id).orderBy('payment_date', 'desc');
    const monthNames = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
    const formatted = history.map(p => { const d = new Date(p.payment_date); return { ...p, id: p.payment_id, amount: p.amount_paid, month: monthNames[d.getMonth()+1], year: d.getFullYear(), payment_method: p.payment_via||'Cash', transaction_id: p.utr_number||'', created_at: p.payment_date }; });
    res.json({ success: true, history: formatted });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch payment history' }); }
});

// Tickets
router.get('/tickets', tenantAuth, async (req, res) => {
  try { res.json({ success: true, tickets: await db('tickets').where('tenant_id', req.tenant.tenant_id).orderBy('created_at', 'desc') }); } catch (err) { res.status(500).json({ error: 'Failed to fetch tickets' }); }
});

router.post('/tickets', tenantAuth, async (req, res) => {
  const { category, description } = req.body;
  if (!category || !description) return res.status(400).json({ error: 'Missing details' });
  try {
    const [inserted] = await db('tickets').insert({ tenant_id: req.tenant.tenant_id, category, description, user_id: req.tenant.user_id, status: 'Pending' }).returning('id');
    const id = typeof inserted === 'object' ? inserted.id : inserted;
    const ticket = await db('tickets').where('id', id).first();
    res.json({ success: true, message: 'Ticket created', ticket });
  } catch (err) { res.status(500).json({ error: 'Failed to create ticket' }); }
});

// Logs
router.get('/logs', tenantAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit)||50;
    const offset = parseInt(req.query.offset)||0;
    res.json({ success: true, logs: await db('attendance_logs').where('tenant_id', req.tenant.tenant_id).orderBy('punch_time', 'desc').limit(limit).offset(offset) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch logs' }); }
});

module.exports = router;

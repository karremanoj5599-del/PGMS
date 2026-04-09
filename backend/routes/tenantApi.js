const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// --- Middleware ---
const tenantAuth = async (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    return res.status(401).json({ error: 'Access denied. Missing tenant identifier.' });
  }

  try {
    const tenant = await db('tenants').where('tenant_id', tenantId).first();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant record not found.' });
    }
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('Tenant Auth Error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// --- Auth Routes ---

/**
 * POST /api/tenant/auth/login
 */
router.post('/auth/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile and password are required' });
  }

  try {
    const tenant = await db('tenants').where('mobile', mobile).first();
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!tenant.password_hash) {
      return res.status(403).json({ error: 'Mobile access not enabled. Contact admin.' });
    }

    const isValid = await bcrypt.compare(password, tenant.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: tenant.tenant_id.toString(),
      tenant: {
        id: tenant.tenant_id,
        name: tenant.name,
        mobile: tenant.mobile,
        user_id: tenant.user_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/tenant/auth/update-pin
 */
router.put('/auth/update-pin', tenantAuth, async (req, res) => {
  const { oldPin, newPin } = req.body;
  if (!oldPin || !newPin) {
    return res.status(400).json({ error: 'Old and new PIN required' });
  }

  try {
    const isValid = await bcrypt.compare(oldPin, req.tenant.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect old PIN' });

    const hashedPassword = await bcrypt.hash(newPin, 10);
    await db('tenants')
      .where('tenant_id', req.tenant.tenant_id)
      .update({ password_hash: hashedPassword, biometric_pin: newPin });

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

// --- Dashboard ---

router.get('/dashboard', tenantAuth, async (req, res) => {
  try {
    const tenant = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
      .where('tenants.tenant_id', req.tenant.tenant_id)
      .select(
        'tenants.*',
        'beds.bed_number',
        'beds.bed_cost',
        'beds.advance_amount',
        'rooms.room_number',
        'rooms.sharing_capacity'
      )
      .first();

    const latestBilling = await db('billing')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .first();

    const totalPaidThisYear = await db('payments')
      .where('tenant_id', req.tenant.tenant_id)
      .whereRaw(
        db.client.config.client === 'pg'
          ? "EXTRACT(YEAR FROM payment_date) = ?"
          : "strftime('%Y', payment_date) = ?",
        [db.client.config.client === 'pg' ? new Date().getFullYear() : new Date().getFullYear().toString()]
      )
      .sum('amount_paid as total')
      .first();

    // Get the absolute latest source of truth for balance: the latest payment record
    const latestPayment = await db('payments')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('payment_date', 'desc')
      .orderBy('payment_id', 'desc')
      .first();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    // Determine the real current balance
    const realBalance = latestPayment ? latestPayment.balance : ((tenant.bed_cost || 0) + (tenant.advance_amount || 0));
    
    // Calculate total starting due (resilient to deleted beds)
    let calculatedTotalDue = (tenant.bed_cost || 0) + (tenant.advance_amount || 0);
    if (latestPayment) {
      calculatedTotalDue = latestPayment.amount_paid + latestPayment.balance;
    }

    // Fallback billing if none exists yet, but override with realBalance
    const billing = {
      month: latestBilling ? latestBilling.month : currentMonth,
      year: latestBilling ? latestBilling.year : currentYear,
      fixed_rent: tenant.bed_cost || (latestPayment ? (latestPayment.amount_paid + latestPayment.balance) : 0),
      previous_balance: latestBilling ? latestBilling.previous_balance : 0,
      total_due: latestBilling ? latestBilling.total_due : calculatedTotalDue,
      amount_paid: latestBilling ? latestBilling.amount_paid : (latestPayment ? latestPayment.amount_paid : 0),
      current_balance: realBalance
    };

    res.json({
      success: true,
      tenant: {
        ...tenant,
        id: tenant.tenant_id,
        room: tenant.room_number || '—',
        bed: tenant.bed_number || '—',
        sharing: `${tenant.sharing_capacity || 0} Sharing`,
        total_paid_this_year: totalPaidThisYear.total || 0
      },
      billing: billing
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// --- Payments ---

router.get('/payments/billing', tenantAuth, async (req, res) => {
  try {
    let history = await db('billing')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('year', 'desc')
      .orderBy('month', 'desc');

    const latestPayment = await db('payments')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('payment_date', 'desc')
      .orderBy('payment_id', 'desc')
      .first();

    const tenant = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .where('tenants.tenant_id', req.tenant.tenant_id)
      .select('beds.bed_cost', 'beds.advance_amount')
      .first();

    // DEBUG LOG FILE
    const debugPath = path.join(__dirname, '..', 'debug_payment.log');
    const logData = `
[DEBUG] /payments/billing for Tenant ${req.tenant.tenant_id}
[DEBUG] Time: ${new Date().toISOString()}
[DEBUG] DB Type: ${db.client.config.client}
[DEBUG] History Length: ${history.length}
[DEBUG] Latest Payment: ${latestPayment ? JSON.stringify(latestPayment) : 'NOT FOUND'}
[DEBUG] Bed Data: ${tenant ? JSON.stringify(tenant) : 'TENANT ROW NOT FOUND'}
--------------------------------------------------\n`;
    fs.appendFileSync(debugPath, logData);

    if (history.length === 0 && tenant) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const now = new Date();
      
      const calcTotalDue = latestPayment 
        ? (latestPayment.amount_paid + latestPayment.balance)
        : ((tenant.bed_cost || 0) + (tenant.advance_amount || 0));

      history = [{
        month: monthNames[now.getMonth()],
        year: now.getFullYear(),
        fixed_rent: tenant.bed_cost || (latestPayment ? calcTotalDue : 0),
        previous_balance: 0,
        total_due: calcTotalDue,
        amount_paid: latestPayment ? latestPayment.amount_paid : 0,
        current_balance: latestPayment ? latestPayment.balance : calcTotalDue
      }];
    } else if (history.length > 0 && latestPayment) {
      // Sync the very latest balance to the current record
      history[0].current_balance = latestPayment.balance;
      history[0].total_due = (history[0].total_due || 0) || (latestPayment.amount_paid + latestPayment.balance);
      history[0].amount_paid = history[0].total_due - latestPayment.balance;
    }

    // LOG FINAL RESPONSE
    fs.appendFileSync(debugPath, `[DEBUG] Final Response History: ${JSON.stringify(history)}\n`);

    res.json({ success: true, history });
  } catch (err) {
    console.error('Fetch Billing Error:', err);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

router.get('/payments/history', tenantAuth, async (req, res) => {
  try {
    const history = await db('payments')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('payment_date', 'desc');

    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const formattedHistory = history.map(p => {
      const date = new Date(p.payment_date);
      return {
        ...p,
        id: p.payment_id,
        amount: p.amount_paid,
        month: monthNames[date.getMonth() + 1],
        year: date.getFullYear(),
        payment_method: p.payment_via || 'Cash',
        transaction_id: p.utr_number || '',
        created_at: p.payment_date
      };
    });

    res.json({ success: true, history: formattedHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

router.post('/payments/record', tenantAuth, async (req, res) => {
  const { amount, month, year, payment_method, transaction_id } = req.body;
  try {
    // 1. Record the payment
    const [insertedPayment] = await db('payments').insert({
      tenant_id: req.tenant.tenant_id,
      amount_paid: amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'Tenant-App',
      payment_via: payment_method || 'UPI',
      utr_number: transaction_id || '',
      user_id: req.tenant.user_id,
      balance: 0 
    }).returning('payment_id');
    const id = typeof insertedPayment === 'object' ? insertedPayment.payment_id : insertedPayment;

    // 2. Sync with Billing Table
    const billing = await db('billing').where({ tenant_id: req.tenant.tenant_id, month, year }).first();
    if (billing) {
      const newPaid = (billing.amount_paid || 0) + amount;
      const newBalance = Math.max(0, billing.total_due - newPaid);
      
      await db('billing').where({ id: billing.id }).update({
        amount_paid: newPaid,
        current_balance: newBalance,
        status: newBalance <= 0 ? 'Paid' : 'Partial'
      });

      // 3. Auto-restore Access if paid
      if (newBalance <= 0) {
        await db('tenants').where('tenant_id', req.tenant.tenant_id).update({ access_status: 'active' });
        // Trigger hardware sync
        await syncTenantAccess(req.tenant.tenant_id);
      }
    }

    res.json({ success: true, message: 'Payment recorded and access updated', paymentId: id });
  } catch (err) {
    console.error('Mobile Payment Record Error:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// --- Tickets ---

router.get('/tickets', tenantAuth, async (req, res) => {
  try {
    const tickets = await db('tickets')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('created_at', 'desc');
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.post('/tickets', tenantAuth, async (req, res) => {
  const { category, description } = req.body;
  if (!category || !description) return res.status(400).json({ error: 'Missing details' });

  try {
    const [insertedTicket] = await db('tickets').insert({
      tenant_id: req.tenant.tenant_id,
      category,
      description,
      user_id: req.tenant.user_id,
      status: 'Pending'
    }).returning('id');
    
    const id = typeof insertedTicket === 'object' ? insertedTicket.id : insertedTicket;
    const ticket = await db('tickets').where('id', id).first();
    res.json({ success: true, message: 'Ticket created', ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// --- Logs ---

router.get('/logs', tenantAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const logs = await db('attendance_logs')
      .where('tenant_id', req.tenant.tenant_id)
      .orderBy('punch_time', 'desc')
      .limit(limit)
      .offset(offset);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;

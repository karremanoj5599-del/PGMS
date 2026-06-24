const PDFDocument = require('pdfkit');
const db = require('../../config/database');

/**
 * Generate a branded PDF receipt for a payment.
 * Returns a readable stream (pipe to res).
 */
exports.generateReceipt = async (paymentId, userId) => {
  // Fetch payment with tenant + bed + room details
  const payment = await db('payments')
    .leftJoin('tenants', 'payments.tenant_id', 'tenants.tenant_id')
    .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', 'floors.floor_id')
    .where('payments.payment_id', paymentId)
    .where('payments.user_id', userId)
    .select(
      'payments.*',
      'tenants.name as tenant_name',
      'tenants.mobile as tenant_mobile',
      'tenants.email as tenant_email',
      'beds.bed_number',
      'beds.bed_cost',
      'rooms.room_number',
      'floors.floor_name'
    )
    .first();

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Fetch the admin/owner info
  const user = await db('users').where('user_id', userId).first();
  const ownerName = user?.display_name || user?.email || 'PG Admin';
  const pgName = user?.pg_name || 'PGMS';
  const pgAddress = user?.pg_address || '';
  const pgContact = user?.pg_contact || '';
  const pgSubText = pgAddress ? `${pgAddress}${pgContact ? ` • ${pgContact}` : ''}` : 'Paying Guest Management System';

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Receipt #${payment.payment_id}`,
      Author: `${pgName} - Management System`
    }
  });

  // Colors for premium look
  const primaryColor = '#4f46e5';
  const textDark = '#1e293b';
  const textMuted = '#64748b';
  const textLight = '#94a3b8';
  const borderColor = '#e2e8f0';
  
  // Format currency without rupee symbol to avoid Helvetica encoding issues
  const formatCurrency = (amt) => `Rs. ${Number(amt || 0).toLocaleString()}`;

  // ── Header ──────────────────────────────────────────────────────────────
  let y = 50;
  
  // Left side: PG Details
  doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold')
    .text(pgName, 50, y, { width: 300 });
  y += 26;
  doc.fontSize(10).fillColor(textMuted).font('Helvetica')
    .text(pgSubText, 50, y, { width: 300 });
  
  // Right side: RECEIPT title
  doc.fontSize(20).fillColor(textLight).font('Helvetica-Bold')
    .text('PAYMENT RECEIPT', doc.page.width - 300, 50, { width: 250, align: 'right' });
  doc.fontSize(10).fillColor(textDark).font('Helvetica')
    .text(`Receipt No: #${String(payment.payment_id).padStart(5, '0')}`, doc.page.width - 300, 75, { width: 250, align: 'right' });
  doc.fontSize(10).fillColor(textMuted).font('Helvetica')
    .text(`Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, doc.page.width - 300, 90, { width: 250, align: 'right' });

  y = 130;

  // ── Divider ─────────────────────────────────────────────────────────────
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(primaryColor).lineWidth(2).stroke();
  y += 20;

  // ── Info Row: Billed To & Payment Info ──────────────────────────────────
  doc.fontSize(10).fillColor(textMuted).font('Helvetica-Bold').text('BILLED TO:', 50, y);
  doc.fontSize(10).fillColor(textMuted).font('Helvetica-Bold').text('PAYMENT INFO:', 320, y);
  
  y += 18;
  
  // Billed To Details
  doc.fontSize(12).fillColor(textDark).font('Helvetica-Bold').text(payment.tenant_name || 'N/A', 50, y);
  doc.fontSize(10).fillColor(textDark).font('Helvetica').text(`Room ${payment.room_number || 'N/A'} — Bed ${payment.bed_number || 'N/A'}`, 50, y + 16);
  doc.fontSize(10).fillColor(textDark).font('Helvetica').text(payment.tenant_mobile || 'N/A', 50, y + 32);
  
  // Payment Info Details
  doc.fontSize(10).fillColor(textDark).font('Helvetica')
     .text(`Method: `, 320, y)
     .font('Helvetica-Bold').text(payment.payment_via || 'Cash', 380, y);
     
  doc.font('Helvetica').text(`Type: `, 320, y + 16)
     .font('Helvetica-Bold').text(payment.payment_type || 'Rent', 380, y + 16);
     
  if (payment.utr_number) {
    doc.font('Helvetica').text(`Ref/UTR: `, 320, y + 32)
       .font('Helvetica-Bold').text(payment.utr_number, 380, y + 32);
  }

  y += 70;

  // ── Payment Breakdown Table ───────────────────────────────────────────
  // Table header
  doc.rect(50, y, doc.page.width - 100, 30).fill(primaryColor);
  doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text('DESCRIPTION', 65, y + 10);
  doc.text('AMOUNT', doc.page.width - 180, y + 10, { width: 115, align: 'right' });
  y += 30;

  // Table rows
  const rows = [];
  
  if (payment.rent_charged) {
    rows.push(['Monthly Rent Charged', formatCurrency(payment.rent_charged)]);
  } else {
    rows.push(['Monthly Rent', formatCurrency(payment.bed_cost)]);
  }

  rows.push([`Amount Paid (${payment.payment_type || 'Rent'})`, formatCurrency(payment.amount_paid)]);
  
  if (payment.balance > 0) {
    rows.push(['Outstanding Balance', formatCurrency(payment.balance)]);
  }

  rows.forEach(([desc, amount], idx) => {
    if (idx % 2 === 0) {
      doc.rect(50, y, doc.page.width - 100, 28).fill('#f8fafc');
    }
    doc.fontSize(10).fillColor(textDark).font('Helvetica').text(desc, 65, y + 9);
    doc.fontSize(10).fillColor(textDark).font('Helvetica-Bold').text(amount, doc.page.width - 180, y + 9, { width: 115, align: 'right' });
    y += 28;
  });

  // Table Bottom Border
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(1).stroke();
  
  // Total row
  y += 15;
  doc.rect(doc.page.width - 250, y, 200, 35).fill('#f1f5f9');
  doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('TOTAL PAID', doc.page.width - 240, y + 11);
  doc.fontSize(14).text(formatCurrency(payment.amount_paid), doc.page.width - 160, y + 10, { width: 100, align: 'right' });
  y += 50;

  // Balance info
  if (payment.balance > 0) {
    doc.fontSize(11).fillColor('#ef4444').font('Helvetica-Bold');
    doc.text(`Remaining Balance: ${formatCurrency(payment.balance)}`, doc.page.width - 250, y, { width: 200, align: 'right' });
    y += 25;
  } else {
    doc.fontSize(11).fillColor('#10b981').font('Helvetica-Bold');
    doc.text('✓ Payment Complete — No balance due', 50, y);
    y += 25;
  }

  y += 20;

  // ── Footer ──────────────────────────────────────────────────────────────
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(0.5).stroke();
  y += 15;

  doc.fontSize(8).fillColor(textMuted).font('Helvetica');
  doc.text('This is a computer-generated receipt. No signature required.', 50, y, { align: 'center', width: doc.page.width - 100 });
  y += 15;
  doc.text(`Generated by PGMS • Managed by ${ownerName}`, 50, y, { align: 'center', width: doc.page.width - 100 });
  y += 12;
  doc.text(`Receipt ID: PAY-${String(payment.payment_id).padStart(5, '0')} • ${new Date().toISOString()}`, 50, y, { align: 'center', width: doc.page.width - 100 });

  doc.end();
  return doc;
};

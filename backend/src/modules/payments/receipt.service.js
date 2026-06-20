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

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Receipt #${payment.payment_id}`,
      Author: 'PGMS - Paying Guest Management System'
    }
  });

  const primaryColor = '#4f46e5';
  const textDark = '#1e293b';
  const textMuted = '#64748b';
  const borderColor = '#e2e8f0';

  // ── Header ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

  doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold')
    .text('PGMS', 50, 35);
  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
    .text('Paying Guest Management System', 50, 65);
  
  // Receipt label on right
  doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold')
    .text('PAYMENT RECEIPT', doc.page.width - 250, 35, { width: 200, align: 'right' });
  doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
    .text(`#${String(payment.payment_id).padStart(5, '0')}`, doc.page.width - 250, 55, { width: 200, align: 'right' });

  let y = 145;

  // ── Receipt Info Row ────────────────────────────────────────────────────
  doc.fontSize(9).fillColor(textMuted).font('Helvetica');
  doc.text('Date:', 50, y);
  doc.fillColor(textDark).font('Helvetica-Bold');
  doc.text(new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 120, y);

  doc.fillColor(textMuted).font('Helvetica');
  doc.text('Payment Via:', 300, y);
  doc.fillColor(textDark).font('Helvetica-Bold');
  doc.text(payment.payment_via || 'Cash', 380, y);

  y += 20;

  doc.fillColor(textMuted).font('Helvetica');
  doc.text('Type:', 50, y);
  doc.fillColor(textDark).font('Helvetica-Bold');
  doc.text(payment.payment_type || 'Rent', 120, y);

  if (payment.utr_number) {
    doc.fillColor(textMuted).font('Helvetica');
    doc.text('UTR/Ref:', 300, y);
    doc.fillColor(textDark).font('Helvetica-Bold');
    doc.text(payment.utr_number, 380, y);
  }

  y += 35;

  // ── Divider ─────────────────────────────────────────────────────────────
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(1).stroke();
  y += 20;

  // ── Tenant Details ────────────────────────────────────────────────────
  doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold')
    .text('TENANT DETAILS', 50, y);
  y += 20;

  const detailsData = [
    ['Name', payment.tenant_name || 'N/A'],
    ['Mobile', payment.tenant_mobile || 'N/A'],
    ['Room / Bed', `Room ${payment.room_number || 'N/A'} — Bed ${payment.bed_number || 'N/A'}`],
    ['Floor', payment.floor_name || 'N/A']
  ];

  if (payment.tenant_email) {
    detailsData.push(['Email', payment.tenant_email]);
  }

  detailsData.forEach(([label, value]) => {
    doc.fontSize(9).fillColor(textMuted).font('Helvetica').text(label, 50, y);
    doc.fontSize(9).fillColor(textDark).font('Helvetica-Bold').text(value, 180, y);
    y += 18;
  });

  y += 15;

  // ── Payment Breakdown Table ───────────────────────────────────────────
  doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold')
    .text('PAYMENT BREAKDOWN', 50, y);
  y += 20;

  // Table header
  doc.rect(50, y, doc.page.width - 100, 28).fill('#f1f5f9');
  doc.fontSize(9).fillColor(textMuted).font('Helvetica-Bold');
  doc.text('Description', 60, y + 8);
  doc.text('Amount', doc.page.width - 150, y + 8, { width: 100, align: 'right' });
  y += 28;

  // Table rows
  const rows = [];
  
  if (payment.rent_charged) {
    rows.push(['Monthly Rent Charged', `₹${Number(payment.rent_charged).toLocaleString()}`]);
  } else {
    rows.push(['Monthly Rent', `₹${Number(payment.bed_cost || 0).toLocaleString()}`]);
  }

  rows.push([`Amount Paid (${payment.payment_type || 'Rent'})`, `₹${Number(payment.amount_paid || 0).toLocaleString()}`]);
  
  if (payment.balance > 0) {
    rows.push(['Outstanding Balance', `₹${Number(payment.balance).toLocaleString()}`]);
  }

  rows.forEach(([desc, amount], idx) => {
    if (idx % 2 === 0) {
      doc.rect(50, y, doc.page.width - 100, 25).fill('#fafbfc');
    }
    doc.fontSize(9).fillColor(textDark).font('Helvetica').text(desc, 60, y + 7);
    doc.fontSize(9).fillColor(textDark).font('Helvetica-Bold').text(amount, doc.page.width - 150, y + 7, { width: 100, align: 'right' });
    y += 25;
  });

  // Total row
  y += 5;
  doc.rect(50, y, doc.page.width - 100, 35).fill(primaryColor);
  doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text('TOTAL PAID', 60, y + 10);
  doc.text(`₹${Number(payment.amount_paid || 0).toLocaleString()}`, doc.page.width - 150, y + 10, { width: 100, align: 'right' });
  y += 50;

  // Balance info
  if (payment.balance > 0) {
    doc.fontSize(10).fillColor('#ef4444').font('Helvetica-Bold');
    doc.text(`Remaining Balance: ₹${Number(payment.balance).toLocaleString()}`, 50, y);
    y += 20;
  } else {
    doc.fontSize(10).fillColor('#10b981').font('Helvetica-Bold');
    doc.text('✓ Payment Complete — No balance due', 50, y);
    y += 20;
  }

  y += 30;

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

// Shared helper: find a tenant by biometric PIN or tenant_id
// This pattern was repeated 10+ times across the codebase
const db = require('../../config/database');

/**
 * Find a tenant by either biometric_pin or tenant_id for a given admin user
 * @param {string|number} pin - The PIN from the biometric device
 * @param {number} adminUserId - The admin user_id for multi-tenant isolation
 * @returns {Promise<object|undefined>} The tenant record or undefined
 */
const findTenantByPin = async (pin, adminUserId) => {
  if (!pin) return undefined;
  
  const numericPinStr = pin.toString().replace(/\D/g, '');
  const numericPin = numericPinStr ? Number(numericPinStr) : null;

  // 1. Try exact match first (fast path)
  let tenant = await db('tenants')
    .where({ user_id: adminUserId })
    .where(builder => {
      builder.where('biometric_pin', pin)
        .orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
    })
    .first();

  if (tenant) return tenant;

  // 2. Fallback: match by extracting purely numeric digits (handles prefixes like HY0069 -> 69)
  if (numericPin !== null && !isNaN(numericPin)) {
    const tenants = await db('tenants')
      .where({ user_id: adminUserId })
      .whereNotNull('biometric_pin');

    for (const t of tenants) {
      const dbNumericStr = t.biometric_pin.replace(/\D/g, '');
      if (dbNumericStr && Number(dbNumericStr) === numericPin) {
        return t;
      }
    }
  }

  return undefined;
};

const findStaffByPin = async (pin, adminUserId) => {
  if (!pin) return undefined;
  
  const numericPinStr = pin.toString().replace(/\D/g, '');
  const numericPin = numericPinStr ? Number(numericPinStr) : null;

  // 1. Try exact match first
  let staff = await db('staff')
    .where({ admin_user_id: adminUserId })
    .where(builder => {
      builder.where('biometric_pin', pin)
        .orWhere('staff_id', isNaN(pin) ? -1 : Number(pin));
    })
    .first();

  if (staff) return staff;

  // 2. Fallback
  if (numericPin !== null && !isNaN(numericPin)) {
    const staffMembers = await db('staff')
      .where({ admin_user_id: adminUserId })
      .whereNotNull('biometric_pin');

    for (const s of staffMembers) {
      const dbNumericStr = s.biometric_pin.replace(/\D/g, '');
      if (dbNumericStr && Number(dbNumericStr) === numericPin) {
        return s;
      }
    }
  }

  return undefined;
};

module.exports = { findTenantByPin, findStaffByPin };

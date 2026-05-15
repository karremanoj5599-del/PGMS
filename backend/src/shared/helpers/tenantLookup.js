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
  return db('tenants')
    .where({ user_id: adminUserId })
    .where(builder => {
      builder.where('biometric_pin', pin)
        .orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
    })
    .first();
};

module.exports = { findTenantByPin };

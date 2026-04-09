const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');

const OFFLINE_GRACE_DAYS = 30;
const SECRET_KEY = process.env.JWT_SECRET || 'pgms_secret_key_2026';

/**
 * Generates a secure, formatted 25-char key (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).
 */
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 25; i++) {
        key += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return key.match(/.{1,5}/g).join('-');
}

/**
 * Creates a JWT-like token for the client for offline checks.
 */
function createActivationToken(licenseId, fingerprint) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + OFFLINE_GRACE_DAYS);
    
    return jwt.sign(
        { 
            sub: licenseId, 
            fp: fingerprint,
            type: 'activation'
        }, 
        SECRET_KEY, 
        { expiresIn: `${OFFLINE_GRACE_DAYS}d` }
    );
}

/**
 * Issues a new license for a user.
 */
async function issueLicense(email, productId = 'PGMS-PRO', maxActivations = 1, durationMonths = 12, maxTenants = 50) {
    const user = await db('users').where('email', email).first();
    if (!user) throw new Error('User not found');

    const licenseKey = generateLicenseKey();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const [license] = await db('licenses').insert({
        license_key: licenseKey,
        user_id: user.user_id,
        product_id: productId,
        expires_at: expiresAt,
        max_activations: maxActivations,
        max_tenants: maxTenants
    }).returning('*');

    return license;
}

/**
 * Validates and activates a license for a hardware fingerprint.
 */
async function activateLicense(licenseKey, email, fingerprint, ipAddress) {
    const license = await db('licenses')
        .join('users', 'licenses.user_id', 'users.user_id')
        .where('licenses.license_key', licenseKey)
        .where('users.email', email)
        .select('licenses.*')
        .first();

    if (!license) throw new Error('Invalid license key or email');
    if (license.status !== 'active') throw new Error(`License is ${license.status}`);
    if (new Date(license.expires_at) < new Date()) throw new Error('License has expired');

    let fingerprints = license.hardware_fingerprints || [];
    if (typeof fingerprints === 'string') fingerprints = JSON.parse(fingerprints);

    if (!fingerprints.includes(fingerprint)) {
        if (fingerprints.length >= license.max_activations) {
            throw new Error('Maximum activations reached');
        }
        
        fingerprints.push(fingerprint);
        await db('licenses')
            .where('id', license.id)
            .update({
                hardware_fingerprints: JSON.stringify(fingerprints),
                activation_count: fingerprints.length
            });
    }

    // Sync with users table for backward compatibility
    await db('users')
        .where('user_id', license.user_id)
        .update({
            is_activated: true,
            license_key: licenseKey,
            license_expiry: license.expires_at
        });

    // Log the activation
    await db('activation_logs').insert({
        license_id: license.id,
        fingerprint: fingerprint,
        ip_address: ipAddress,
        action: 'activate'
    });

    const token = createActivationToken(license.id, fingerprint);

    return {
        status: 'activated',
        license_expiry: license.expires_at,
        activation_token: token,
        offline_grace_days: OFFLINE_GRACE_DAYS
    };
}

/**
 * Validates a license (periodic online check).
 */
async function validateLicense(licenseKey, email, fingerprint) {
    const license = await db('licenses')
        .join('users', 'licenses.user_id', 'users.user_id')
        .where('licenses.license_key', licenseKey)
        .where('users.email', email)
        .select('licenses.*')
        .first();

    if (!license || license.status !== 'active' || new Date(license.expires_at) < new Date()) {
        throw new Error('License no longer valid');
    }

    let fingerprints = license.hardware_fingerprints || [];
    if (typeof fingerprints === 'string') fingerprints = JSON.parse(fingerprints);

    if (!fingerprints.includes(fingerprint)) {
        throw new Error('Device not authorized');
    }

    return { status: 'valid', expires_at: license.expires_at };
}

module.exports = {
    issueLicense,
    activateLicense,
    validateLicense,
    generateLicenseKey
};

const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const licenseService = require('../licenses/licenses.service');

exports.register = async (email, password) => {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await db('users').where('email', trimmedEmail).first();
  if (existingUser) {
    const err = new Error('User already exists');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const activationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 3);

  const [inserted] = await db('users').insert({
    email: trimmedEmail,
    password: hashedPassword,
    activation_code: activationCode,
    trial_expiry: trialExpiry.toISOString(),
    is_activated: false
  }).returning('*');

  const user = inserted.user_id ? inserted : await db('users').where('user_id', inserted).first();
  return user;
};

exports.login = async (email, password) => {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    const err = new Error('Missing credentials');
    err.statusCode = 400;
    throw err;
  }

  const user = await db('users').where('email', trimmedEmail).first();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const now = new Date();
  let status = 'active';
  let message = 'Access granted';

  if (!user.is_activated) {
    if (new Date(user.trial_expiry) < now) {
      status = 'expired';
      message = 'Trial period has ended. Please activate with a license key.';
    } else {
      status = 'trial';
      message = 'Software is in trial period (3 days).';
    }
  } else if (user.license_expiry && new Date(user.license_expiry) < now) {
    status = 'expired';
    message = 'License has expired. Please renew your license.';
  }

  return {
    user_id: user.user_id,
    email: user.email,
    status,
    message,
    trial_expiry: user.trial_expiry,
    license_expiry: user.license_expiry,
    is_activated: user.is_activated,
    activation_code: user.activation_code
  };
};

exports.activate = async (email, licenseKey, hardwareFingerprint, ip) => {
  return licenseService.activateLicense(licenseKey, email, hardwareFingerprint, ip);
};

exports.validate = async (email, licenseKey, hardwareFingerprint) => {
  return licenseService.validateLicense(licenseKey, email, hardwareFingerprint);
};

exports.claimLicense = async (email, activationCode) => {
  const user = await db('users').where({ email, activation_code: activationCode }).first();
  if (!user) {
    const err = new Error('Invalid activation code or email');
    err.statusCode = 404;
    throw err;
  }

  let license = await db('licenses').where('user_id', user.user_id).first();
  if (!license) {
    license = await licenseService.issueLicense(email);
  }

  return {
    message: 'License claimed successfully',
    license_key: license.license_key,
    expires_at: license.expires_at,
    status: license.status
  };
};

exports.updateProfile = async (email, displayName) => {
  if (!email || !displayName) {
    const err = new Error('Email and display name are required');
    err.statusCode = 400;
    throw err;
  }

  const user = await db('users').where({ email }).first();
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [updated] = await db('users')
    .where({ email })
    .update({ display_name: displayName })
    .returning('*');

  // Handle SQLite (returning array of objects) vs PostgreSQL
  const updatedUser = typeof updated === 'number' 
    ? await db('users').where({ email }).first() 
    : updated;

  return {
    message: 'Profile updated successfully',
    display_name: updatedUser.display_name
  };
};

exports.updatePassword = async (email, currentPassword, newPassword) => {
  if (!email || !currentPassword || !newPassword) {
    const err = new Error('Email, current password, and new password are required');
    err.statusCode = 400;
    throw err;
  }

  const user = await db('users').where({ email }).first();
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const err = new Error('Incorrect current password');
    err.statusCode = 401;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db('users').where({ email }).update({ password: hashedPassword });

  return {
    message: 'Password updated successfully'
  };
};

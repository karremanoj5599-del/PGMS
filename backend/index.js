// ─── FIX for AggregateError [ETIMEDOUT] on Indian Networks (Jio/Airtel) ──────
// Node.js 18/20+ resolves DNS for both IPv4 + IPv6 simultaneously.
// Indian ISPs block/drop IPv6, causing both to fail → AggregateError.
// Must be conditional to avoid breaking Vercel Serverless environment.
if (process.env.VERCEL !== '1') {
  require('dns').setDefaultResultOrder('ipv4first');
}
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const licenseService = require('./licenseService');

const app = express();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/*' }));
app.use(express.urlencoded({ extended: true }));

const EventEmitter = require('events');
const eventBus = new EventEmitter();

// Helper to convert empty strings or 'null' strings to real null for DB
const toNull = (val) => (val === '' || val === 'null' || val === undefined) ? null : val;

// Helper to generate a 16-hex character TZ bitmask string (64 bits)
const generateTZMask = (tzId) => {
  if (!tzId || tzId <= 0) return "0000000000000000";
  // BigInt for 64-bit mask (ZKTeco ADMS style)
  // tzId is 1-indexed. Bit $n-1$ corresponds to Timezone $n$.
  // We use 0000000000000001 for TZ 1 (Little Endian bytes if read as 8-byte array, but usually ADMS treats it as hex mask)
  // Actually, based on previous successes, 0000000100000000 was used for TZ 1. 
  // This implies byte 4 (out of 8) is 01. 
  // Let's stick to a simpler mask that handles the first 32 TZs reliably.
  let mask = BigInt(1) << BigInt(tzId - 1);
  return mask.toString(16).padStart(16, '0').toUpperCase();
};

// NEW: Helper to sync tenant access state to biometric devices
// NEW: Helper to sync tenant access state to biometric devices
const syncTenantAccess = async (tenant_id) => {
  try {
    const tenant = await db('tenants').where('tenant_id', tenant_id).first();
    if (!tenant) return;

    const access = await db('access_control').where('tenant_id', tenant_id).first();
    const isApproved = access ? !!access.access_granted : false;
    
    // Devices must be filtered by the tenant's admin (user_id)
    const devices = await db('devices').where({ adms_status: true, user_id: tenant.user_id });
    if (devices.length === 0) return;

    for (const device of devices) {
      if (!device.sn) continue;
      const pin = tenant.biometric_pin || tenant.tenant_id.toString();

      // NEW: Clear any pending (executed=0) commands for this specific user on this device
      // to prevent queue bloating if sync is triggered multiple times.
      await db('device_commands')
        .where({ device_sn: device.sn, executed: false })
        .andWhere(function() {
          this.where('command', 'like', `%Pin=${pin}\t%`)
              .orWhere('command', 'like', `%PIN=${pin}\t%`)
              .orWhere('command', 'like', `%PIN2=${pin}%`)
              .orWhere('command', 'like', `%accgroup%`); // Groups are also tenant-linked in our context
        })
        .del();
      
      let commands = [];
      if (isApproved) {
        let grpId = 1;
        let tzIds = [1, 0, 0];

        // 1. Determine Access Group and Timezones
        if (access && access.access_group_id) {
          const group = await db('access_groups').where({ id: access.access_group_id, user_id: tenant.user_id }).first();
          if (group) {
            grpId = group.id;
            const tzs = [];
            const schedIds = [group.timezone1_id, group.timezone2_id, group.timezone3_id].filter(id => id);
            
            for (const sid of schedIds) {
              const s = await db('access_schedules').where({ id: sid, user_id: tenant.user_id }).first();
              if (!s) continue;
              
              const dStr = s.valid_days || '1111111';
              const tid = s.timezone_id;

              const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
              const daysMap = days.map((day, i) => {
                const isActive = dStr[i] === '1';
                const start = s[`${day}_start`] || '00:00';
                const end = s[`${day}_end`] || '23:59';
                return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
              }).join('\t');
              
              commands.push({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tid}\t${daysMap}`, user_id: tenant.user_id });
              tzs.push(tid);
            }
            // Fill tzIds (up to 3)
            tzIds = [tzs[0] || 0, tzs[1] || 0, tzs[2] || 0];
          }
        } else {
          // Fallback to legacy single schedule
          const scheduleId = access ? access.schedule_id || 1 : 1;
          const schedule = await db('access_schedules').where({ id: scheduleId, user_id: tenant.user_id }).first();
          if (schedule) {
            grpId = schedule.id; 
            const tid = schedule.timezone_id;
            const dStr = schedule.valid_days || '1111111';
            
            const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const daysMap = days.map((day, i) => {
              const isActive = dStr[i] === '1';
              const start = schedule[`${day}_start`] || '00:00';
              const end = schedule[`${day}_end`] || '23:59';
              return `${day.toUpperCase()}=${isActive ? start + '-' + end : '00:00-00:00'}`;
            }).join('\t');

            commands.push({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tid}\t${daysMap}`, user_id: tenant.user_id });
            tzIds = [tid, 0, 0];
          }
        }

        // 2. Queue Group Definition
        let holidayId = 0;
        if (access && access.access_group_id) {
            const group = await db('access_groups').where({ id: access.access_group_id, user_id: tenant.user_id }).first();
            if (group && group.holiday_id) {
                holidayId = group.holiday_id;
                // Ensure the holiday definition is also pushed to the machine
                const holiday = await db('holidays').where('id', holidayId).first();
                if (holiday) {
                    const hDate = new Date(holiday.start_date);
                    commands.push({
                        device_sn: device.sn,
                        command: `DATA UPDATE holiday Holiday=${holiday.id}\tName=${holiday.name.replace(/\s+/g,'')}\tTimezone=${holiday.timezone_id || 0}\tMonth=${hDate.getMonth()+1}\tDay=${hDate.getDate()}`,
                        user_id: tenant.user_id
                    });
                }
            }
        }
        commands.push({ device_sn: device.sn, command: `DATA UPDATE accgroup id=${grpId}\ttimezone1=${tzIds[0]}\ttimezone2=${tzIds[1]}\ttimezone3=${tzIds[2]}\tholiday=${holidayId}\tverifystyle=0`, user_id: tenant.user_id });

        // 3. Grant/Update: DATA UPDATE USERINFO
        const cleanName = tenant.name.replace(/[^\w]/g, '');
        // Use biometric_pin if it exists, otherwise use tenant_id
        const pin = tenant.biometric_pin || tenant.tenant_id.toString();
        
        const tzMask = generateTZMask(tzIds[0]);
        
        let extraParams = [];
        if (tenant.access_expiry_date) {
            const d = new Date(tenant.access_expiry_date);
            if (!isNaN(d)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                extraParams.push(`EndDatetime=${yyyy}${mm}${dd}235959`);
            }
        }
        if (tenant.punch_limit && tenant.punch_limit > 0) {
            extraParams.push(`ValidCount=${tenant.punch_limit}`);
        }
        const extraString = extraParams.length > 0 ? '\t' + extraParams.join('\t') : '';

        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=${grpId}\tTZ=${tzMask}\tPIN2=${pin}${extraString}`,
          user_id: tenant.user_id
        });
        // Re-enable user on device (in case previously disabled)
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE user Pin=${pin}\tEnabled=1`,
          user_id: tenant.user_id
        });

        // 4. Queue Biometric Templates (Fingerprints, Face)
        const templates = await db('biometric_templates').where({ tenant_id, is_valid: true });
        for (const tpl of templates) {
          if (tpl.type === 'fingerprint') {
            const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
            const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
            // Use BIODATA format for fingerprints as well, since device rejected FPTMP
            commands.push({
              device_sn: device.sn,
              command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=1${major}${minor}\tTmp=${tpl.template_data}`,
              user_id: tenant.user_id
            });
          } else {
            const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '0');
            const major = tpl.major_ver ? `\tMajorVer=${tpl.major_ver}` : '';
            const minor = tpl.minor_ver ? `\tMinorVer=${tpl.minor_ver}` : '';
            const format = tpl.format ? `\tFormat=${tpl.format}` : '';
            
            commands.push({
              device_sn: device.sn,
              command: `DATA UPDATE BIODATA Pin=${pin}\tNo=0\tIndex=${tpl.finger_index}\tValid=1\tDuress=0\tType=${bioType}${major}${minor}${format}\tTmp=${tpl.template_data}`,
              user_id: tenant.user_id
            });
          }
        }

      } else {
        // Restrict: Disable user on device (keeps data, blocks access)
        // Some devices ignore 'Enabled=0'. The foolproof way is to set their TimeZone mask to 0 
        // and assign them to an invalid group so the door never opens.
        const cleanName = tenant.name.replace(/[^\w]/g, '');
        const pin = tenant.biometric_pin || tenant.tenant_id.toString();
        
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPass=\tCard=\tGrp=99\tTZ=0000000000000000\tPIN2=${pin}`,
          user_id: tenant.user_id
        });
      }

      if (commands.length > 0) {
        await db('device_commands').insert(commands);
      }
    }
    console.log(`[ADMS] Queued sync for tenant ${tenant_id} as PIN ${tenant.biometric_pin || tenant_id} on ${devices.length} devices`);
  } catch (err) {
    console.error('[ADMS] Failed to sync tenant access:', err.message);
  }
};

// NEW: Automated Payment-Based Access Enforcement
// NEW: Automated Payment-Based Access Enforcement
const checkPaymentStatusAndEnforceAccess = async () => {
  try {
    const tenants = await db('tenants')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .select('tenants.tenant_id', 'tenants.name', 'tenants.user_id', 'beds.bed_cost');
    for (const tenant of tenants) {
      // Calculate balance (simplified, as used in Payments.jsx)
      const lastPayment = await db('payments').where({ tenant_id: tenant.tenant_id, user_id: tenant.user_id }).orderBy('payment_date', 'desc').first();
      const pendingBalance = lastPayment ? lastPayment.balance : (tenant.bed_cost || 0);
      
      // RULE: If balance >= 1.2x monthly rent (grace 20%), auto-deny access
      if (pendingBalance >= (tenant.bed_cost * 1.2) && tenant.bed_cost > 0) {
        const access = await db('access_control').where('tenant_id', tenant.tenant_id).first();
        if (access && access.access_granted) {
          console.log(`[GUARD] Auto-locking tenant ${tenant.name} (${tenant.tenant_id}) due to balance ₹${pendingBalance}`);
          await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
          await syncTenantAccess(tenant.tenant_id);
          eventBus.emit('punch', { 
            admin_user_id: tenant.user_id,
            user_id: tenant.name, 
            punch_time: 'AUTO-LOCKED (Overdue)', 
            device_sn: 'SYSTEM' 
          });
        }
      }
    }
  } catch (err) {
    console.error('[GUARD] Error checking payments:', err.message);
  }
};

// ONLY run intervals if we are running as a standalone server (not on Vercel)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  // Run the guard every 30 minutes
  setInterval(checkPaymentStatusAndEnforceAccess, 30 * 60 * 1000);
  // Run once on startup after 10s
  setTimeout(checkPaymentStatusAndEnforceAccess, 10000);
}

const enforceInactivityRules = async () => {
  try {
    const devices = await db('devices').where('adms_status', true);
    for (const device of devices) {
      if (!device || !device.sn) continue;
      
      const globalSettings = await db('device_settings').where({ device_id: null, user_id: device.user_id }).first();
      if (!globalSettings || (!globalSettings.auto_block_enabled && !globalSettings.auto_delete_enabled)) continue;

      const tenants = await db('tenants').where('user_id', device.user_id);
      
      for (const tenant of tenants) {
        const lastPunch = await db('attendance_logs')
          .where({ tenant_id: tenant.tenant_id, device_sn: device.sn })
          .orderBy('punch_time', 'desc').first();
          
        let daysInactive = 0;
        if (lastPunch) {
           const logDate = new Date(lastPunch.punch_time);
           daysInactive = (Date.now() - logDate.getTime()) / (1000 * 3600 * 24);
        } else {
           if (tenant.joining_date) {
               daysInactive = (Date.now() - new Date(tenant.joining_date).getTime()) / (1000 * 3600 * 24);
           }
        }
        
        if (globalSettings.auto_delete_enabled && daysInactive >= globalSettings.auto_delete_days) {
            console.log(`[EXPIRY] Auto-restricting tenant ${tenant.name} on device ${device.sn} (${Math.round(daysInactive)} days)`);
            await db('device_commands').insert({
                device_sn: device.sn,
                command: `DATA UPDATE user Pin=${tenant.biometric_pin || tenant.tenant_id}\tEnabled=0`,
                user_id: tenant.user_id
            });
            await db('access_control').where('tenant_id', tenant.tenant_id).update({ access_granted: false });
        } 
        else if (globalSettings.auto_block_enabled && daysInactive >= globalSettings.auto_block_days) {
            console.log(`[EXPIRY] Auto-blocking tenant ${tenant.name} on device ${device.sn} (${Math.round(daysInactive)} days)`);
            await db('device_commands').insert({
                device_sn: device.sn,
                command: `DATA UPDATE USERINFO PIN=${tenant.tenant_id}\tName=${tenant.name.replace(/[^\w]/g, '')}\tPri=0\tPass=\tCard=\tGrp=0\tTZ=0\tPIN2=${tenant.tenant_id}`,
                user_id: tenant.user_id
            });
        }
      }
    }
  } catch(err) {
    console.error('[EXPIRY] Error enforcing inactivity rules:', err.message);
  }
};
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  setInterval(enforceInactivityRules, 12 * 60 * 60 * 1000); // 12 hours
  setTimeout(enforceInactivityRules, 15000); // Run on startup
}
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  if (req.url.toLowerCase().includes('iclock')) {
    console.log(`[ADMS DEBUG] ${req.method} ${req.url}`);
    
    if (process.env.VERCEL !== '1') {
      // Log basic info to the file too, just in case
      const now = new Date().toISOString();
      const logMsg = `[${now}] DEBUG: ${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\n-------------------\n`;
      try {
        fs.appendFileSync(path.join(__dirname, 'adms_packets.log'), logMsg);
      } catch (err) {
        // Silently fail on read-only FS
      }
    }
  }
  next();
});

// Multi-tenant Middleware
const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  
  if (req.url.includes('/api/events')) {
    console.log(`[AUTH DEBUG] URL: ${req.url}, Query: ${JSON.stringify(req.query)}, Header: ${req.headers['x-user-id']}`);
  }

  if (!userId && !req.path.startsWith('/api/auth') && !req.path.startsWith('/iclock')) {
    console.warn(`[AUTH] Missing x-user-id for ${req.path}`);
  }
  req.userId = userId ? parseInt(userId) : null;
  next();
};

app.use(extractUser);

// Helper to log ADMS traffic to file
const logADMS = (req, msg, data = '') => {
  // Disable local file logging on Vercel (read-only filesystem)
  if (process.env.VERCEL === '1') {
    const dataStr = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';
    console.log(`[ADMS] ${req.method} ${req.url} - ${msg} ${dataStr.substring(0, 500)}`);
    return;
  }
  const logPath = path.join(__dirname, 'adms_packets.log');
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}\n${msg}\n${data ? 'Data: ' + data.substring(0, 500) + '\n' : ''}-------------------\n`;
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('[ADMS] Failed to write log:', err.message);
  }
  console.log(logEntry);
};

// Tenant App API (Mobile)
const tenantApi = require('./routes/tenantApi');
app.use('/api/tenant', tenantApi);

// Authentication & Licensing
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existingUser = await db('users').where('email', trimmedEmail).first();
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const activationCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char code
  
  // Set trial expiry to 3 days from now
  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 3);

  try {
    const [inserted] = await db('users').insert({
      email: trimmedEmail,
      password: hashedPassword,
      activation_code: activationCode,
      trial_expiry: trialExpiry.toISOString(),
      is_activated: false
    }).returning('*');

    const user = inserted.user_id ? inserted : await db('users').where('user_id', inserted).first();

    res.json({ 
      user_id: user.user_id, 
      email: user.email, 
      activation_code: user.activation_code, 
      trial_expiry: user.trial_expiry,
      message: 'Account created successfully. 3-day trial started.'
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'System Error: Failed to save user to database.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await db('users').where('email', trimmedEmail).first();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  // Check trial/license status
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

    res.json({ 
      user: { 
        user_id: user.user_id,
        email: user.email, 
        status, 
        message, 
        trial_expiry: user.trial_expiry, 
        license_expiry: user.license_expiry,
        is_activated: user.is_activated,
        activation_code: user.activation_code
      } 
    });
  } catch (err) {
    console.error('[LOGIN DEBUG] Error in login:', err);
    return res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});


// Floors
app.get('/api/floors', async (req, res) => {
  const floors = await db('floors').where('user_id', req.userId);
  res.json(floors);
});

app.post('/api/floors', async (req, res) => {
  const { floor_name } = req.body;
  if (!floor_name) return res.status(400).json({ error: 'Floor name is required' });

  // Bulk Support: Comma separated list
  const floorNames = floor_name.split(',').map(n => n.trim()).filter(n => n);
  
  try {
    const results = [];
    for (const name of floorNames) {
      // Check if floor exists for this user
      const existing = await db('floors').where({ floor_name: name, user_id: req.userId }).first();
      if (!existing) {
        const [inserted] = await db('floors').insert({ floor_name: name, user_id: req.userId }).returning('floor_id');
        const id = typeof inserted === 'object' ? inserted.floor_id : inserted;
        results.push({ floor_id: id, floor_name: name });
      }
    }
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Floor(s) already exist or no valid names provided' });
    }

    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} floors`, floors: results });
  } catch (err) {
    console.error('Floor Creation Error:', err);
    res.status(500).json({ error: 'Failed to add floor(s)' });
  }
});

app.put('/api/floors/:id', async (req, res) => {
  const { id } = req.params;
  const { floor_name } = req.body;
  try {
    await db('floors').where({ floor_id: id, user_id: req.userId }).update({ floor_name });
    const floor = await db('floors').where('floor_id', id).first();
    res.json(floor);
  } catch (err) {
    console.error('Floor Update Error:', err);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

app.delete('/api/floors/:id', async (req, res) => {
  const idStr = req.params.id;
  console.log('DELETE /api/floors/:id raw param:', idStr);
  const id = Number(idStr);
  
  if (isNaN(id)) {
    console.warn('Invalid Floor ID received:', idStr);
    return res.status(400).json({ error: 'Invalid Floor ID' });
  }

  try {
    const rooms = await db('rooms').where({ floor_id: id, user_id: req.userId }).first();
    if (rooms) {
      console.warn(`Cannot delete floor ${id}: has rooms`);
      return res.status(400).json({ error: 'Cannot delete floor with existing rooms' });
    }
    
    const count = await db('floors').where({ floor_id: id, user_id: req.userId }).del();
    console.log(`Deleted ${count} floor with ID ${id}`);
    if (count === 0) {
      return res.status(404).json({ error: 'Floor ID ' + id + ' not found' });
    }
    
    res.json({ message: 'Floor deleted successfully' });
  } catch (err) {
    console.error('Delete Floor Error:', err);
    res.status(500).json({ error: 'Failed to delete floor: ' + (err.message || 'Unknown error') });
  }
});

// License Endpoints
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'pgms_admin_secret_2026';

const isAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'];
  if (apiKey === ADMIN_API_KEY) {
    return next();
  }
  res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

app.get('/api/licenses', isAdmin, async (req, res) => {
  try {
    const licenses = await db('licenses')
      .join('users', 'licenses.user_id', 'users.user_id')
      .select('licenses.*', 'users.email')
      .orderBy('licenses.created_at', 'desc');
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

app.post('/api/licenses', isAdmin, async (req, res) => {
  const { email, product_id, max_activations, duration_months, max_tenants } = req.body;
  try {
    const license = await licenseService.issueLicense(email, product_id, max_activations, duration_months, max_tenants);
    res.json(license);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Alias for client compatibility
app.post('/api/activate', async (req, res) => {
  const { email, license_key, hardware_fingerprint } = req.body;
  try {
    const result = await licenseService.activateLicense(
      license_key, 
      email, 
      hardware_fingerprint, 
      req.ip
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/activate', async (req, res) => {
  const { email, license_key, hardware_fingerprint } = req.body;
  try {
    const result = await licenseService.activateLicense(
      license_key, 
      email, 
      hardware_fingerprint, 
      req.ip
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/validate', async (req, res) => {
  const { email, license_key, hardware_fingerprint } = req.body;
  try {
    const result = await licenseService.validateLicense(license_key, email, hardware_fingerprint);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Claim License using an Activation Code
 * This endpoint allows users to exchange their registration activation_code for a license_key.
 */
app.post('/api/auth/claim-license', async (req, res) => {
  const { email, activation_code } = req.body;
  
  if (!email || !activation_code) {
    return res.status(400).json({ error: 'Email and activation code are required' });
  }

  try {
    const user = await db('users').where({ email, activation_code }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid activation code or email' });
    }

    // Check if user already has a license
    let license = await db('licenses').where('user_id', user.user_id).first();
    
    if (!license) {
      // Issue a new license
      license = await licenseService.issueLicense(email);
    }

    res.json({
      message: 'License claimed successfully',
      license_key: license.license_key,
      expires_at: license.expires_at,
      status: license.status
    });
  } catch (error) {
    console.error('Claim License Error:', error);
    res.status(500).json({ error: 'Failed to claim license: ' + error.message });
  }
});
app.get('/api/rooms', async (req, res) => {
  const rooms = await db('rooms')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('rooms.user_id', req.userId)
    .select('rooms.*', 'floors.floor_name');
  res.json(rooms);
});

app.post('/api/rooms', async (req, res) => {
  const { floor_id, room_number, sharing_capacity } = req.body;
  if (!room_number) return res.status(400).json({ error: 'Room number is required' });

  // Bulk Support: List (101, 102) or Range (101-110)
  const parseRoomBatch = (input) => {
    if (input.includes('-')) {
      const [start, end] = input.split('-').map(s => parseInt(s.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());
      }
    }
    return input.split(',').map(r => r.trim()).filter(r => r);
  };

  const roomNumbers = parseRoomBatch(room_number.toString());
  
  try {
    const results = [];
    for (const num of roomNumbers) {
      const existing = await db('rooms').where({ room_number: num, floor_id, user_id: req.userId }).first();
      if (!existing) {
        const [inserted] = await db('rooms').insert({
          floor_id: toNull(floor_id),
          room_number: num,
          sharing_capacity: sharing_capacity || 1,
          user_id: req.userId
        }).returning('room_id');
        const id = typeof inserted === 'object' ? inserted.room_id : inserted;
        results.push({ room_id: id, room_number: num });
      }
    }
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Room(s) already exist or invalid input' });
    }

    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} rooms`, rooms: results });
  } catch (err) {
    console.error('Room Creation Error:', err);
    res.status(500).json({ error: 'Failed to add room(s)' });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Room ID' });
  const { floor_id, room_number, sharing_capacity } = req.body;
  try {
    await db('rooms').where({ room_id: id, user_id: req.userId }).update({
      floor_id: toNull(floor_id),
      room_number,
      sharing_capacity
    });
    const room = await db('rooms').where('room_id', id).first();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    console.error('Update Room Error:', err);
    res.status(500).json({ error: 'Failed to update room: ' + (err.message || 'Unknown error') });
  }
});

// Beds
app.get('/api/beds', async (req, res) => {
  const beds = await db('beds')
    .join('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('tenants', 'beds.bed_id', '=', 'tenants.bed_id')
    .where('beds.user_id', req.userId)
    .select(
      'beds.*', 
      'rooms.room_number',
      'tenants.name as tenant_name',
      'tenants.mobile as tenant_mobile',
      'tenants.joining_date as tenant_joining_date',
      'tenants.photo as tenant_photo',
      'tenants.tenant_id'
    );
  res.json(beds);
});

app.get('/api/beds/vacant', async (req, res) => {
  const beds = await db('beds')
    .join('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where({ 'beds.status': 'Vacant', 'beds.user_id': req.userId })
    .select('beds.*', 'rooms.room_number');
  res.json(beds);
});

app.post('/api/beds', async (req, res) => {
  const { room_id, bed_number, bed_cost, daily_cost, weekly_cost, advance_amount } = req.body;
  if (!room_id) return res.status(400).json({ error: 'Room ID is required' });
  if (!bed_number) return res.status(400).json({ error: 'Bed number/label is required' });

  // Bulk Support: List ("A, B"), Numeric Range ("1-6"), Char Range ("A-F"), or Count ("6")
  const parseBedBatch = (input) => {
    const s = input.toString().trim();
    // 1. Numeric Range: 1-6
    if (s.includes('-') && /^\d+-\d+$/.test(s)) {
      const [start, end] = s.split('-').map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());
    }
    // 2. Char Range: A-D
    if (s.includes('-') && /^[A-Z]-[A-Z]$/i.test(s)) {
      const [start, end] = s.toUpperCase().split('-').map(c => c.charCodeAt(0));
      return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
    }
    // 3. Simple Count: 6 (creates 1 to 6)
    if (/^\d+$/.test(s) && parseInt(s) <= 20) {
      return Array.from({ length: parseInt(s) }, (_, i) => (i + 1).toString());
    }
    // 4. Comma List
    return s.split(',').map(b => b.trim()).filter(b => b);
  };

  const bedLabels = parseBedBatch(bed_number);
  const room = await db('rooms').where({ room_id, user_id: req.userId }).first();
  if (!room) return res.status(404).json({ error: 'Room not found' });

  try {
    const results = [];
    for (const label of bedLabels) {
      // Check current capacity
      const bedCount = await db('beds').where('room_id', room_id).count('bed_id as count').first();
      if (bedCount.count >= room.sharing_capacity) {
        break; // Stop if capacity reached
      }

      const existing = await db('beds').where({ room_id, bed_number: label, user_id: req.userId }).first();
      if (!existing) {
        const [inserted] = await db('beds').insert({
          room_id: toNull(room_id),
          bed_number: label,
          bed_cost: toNull(bed_cost) || 0,
          daily_cost: toNull(daily_cost) || 0,
          weekly_cost: toNull(weekly_cost) || 0,
          advance_amount: toNull(advance_amount) || 0,
          status: 'Vacant',
          user_id: req.userId
        }).returning('bed_id');
        const id = typeof inserted === 'object' ? inserted.bed_id : inserted;
        results.push({ bed_id: id, bed_number: label });
      }
    }
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Bed(s) already exist or room capacity reached' });
    }

    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} beds`, beds: results });
  } catch (err) {
    console.error('Bed Creation Error:', err);
    res.status(500).json({ error: 'Failed to add bed(s)' });
  }
});

// Delete Bed
app.delete('/api/beds/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Bed ID' });

  try {
    const bed = await db('beds').where({ bed_id: id, user_id: req.userId }).first();
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    if (bed.status === 'Occupied') return res.status(400).json({ error: 'Cannot delete an occupied bed' });

    await db('beds').where({ bed_id: id, user_id: req.userId }).del();
    res.json({ message: 'Bed deleted successfully' });
  } catch (err) {
    console.error('Delete Bed Error:', err);
    res.status(500).json({ error: 'Failed to delete bed: ' + (err.message || 'Unknown error') });
  }
});

app.put('/api/beds/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Bed ID' });
  const { bed_number, bed_cost, daily_cost, weekly_cost, advance_amount, status } = req.body;
  
  try {
    await db('beds').where({ bed_id: id, user_id: req.userId }).update({
      bed_number,
      bed_cost: toNull(bed_cost),
      daily_cost: toNull(daily_cost),
      weekly_cost: toNull(weekly_cost),
      advance_amount: toNull(advance_amount),
      status: status || 'Vacant'
    });
    
    const bed = await db('beds').where('bed_id', id).first();
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    res.json(bed);
  } catch (err) {
    console.error('Update Bed Error:', err);
    res.status(500).json({ error: 'Failed to update bed: ' + (err.message || 'Unknown error') });
  }
});

// Delete Room
app.delete('/api/rooms/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Room ID' });

  try {
    const occupiedBeds = await db('beds').where('room_id', id).andWhere('status', 'Occupied').first();
    if (occupiedBeds) return res.status(400).json({ error: 'Cannot delete a room with occupied beds' });

    const count = await db('rooms').where('room_id', id).del();
    if (count === 0) return res.status(404).json({ error: 'Room not found' });
    
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Delete Room Error:', err);
    res.status(500).json({ error: 'Failed to delete room: ' + (err.message || 'Unknown error') });
  }
});

// Tenants
app.get('/api/tenants', async (req, res) => {
  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.user_id', req.userId)
    .select(
      'tenants.*', 
      'beds.bed_number', 
      'rooms.room_number', 
      'rooms.room_id',
      'floors.floor_name',
      'floors.floor_id',
      db.raw(`(SELECT COUNT(*) FROM biometric_templates WHERE biometric_templates.tenant_id = tenants.tenant_id AND biometric_templates.is_valid = true) as biometric_count`)
    );
  res.json(tenants);
});

app.delete('/api/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const tenant = await db('tenants').where('tenant_id', id).first();
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  // If tenant has a bed, free it up
  if (tenant.bed_id) {
    await db('beds').where('bed_id', tenant.bed_id).update({ status: 'Vacant' });
  }

  await db('tenants').where('tenant_id', id).del();
  res.json({ message: 'Tenant deleted successfully' });
});

// Bulk Delete Tenants
app.post('/api/tenants/bulk-delete', async (req, res) => {
  const { ids } = req.body; // Array of tenant_ids
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  try {
    const tenants = await db('tenants').whereIn('tenant_id', ids);
    
    // Free up beds
    const bedIds = tenants.map(t => t.bed_id).filter(id => id);
    if (bedIds.length > 0) {
      await db('beds').whereIn('bed_id', bedIds).update({ status: 'Vacant' });
    }

    // Queue DELETE USER commands for devices
    const devices = await db('devices').where({ adms_status: true, user_id: req.userId });
    for (const tenant of tenants) {
      const pin = tenant.biometric_pin || tenant.tenant_id.toString();
      for (const dev of devices) {
        await db('device_commands').insert({
          device_sn: dev.sn,
          command: `DELETE USER PIN=${pin}`,
          executed: false,
          user_id: req.userId
        });
      }
    }

    await db('tenants').whereIn('tenant_id', ids).del();
    await db('tenants').whereIn('tenant_id', ids).andWhere('user_id', req.userId).del();
    res.json({ message: `Successfully deleted ${ids.length} tenants and queued device cleanup.` });
  } catch (err) {
    console.error('Bulk Delete Error:', err);
    res.status(500).json({ error: 'Failed to perform bulk delete' });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const oldTenant = await db('tenants').where({ tenant_id: id, user_id: req.userId }).first();
    if (!oldTenant) return res.status(404).json({ error: 'Tenant not found' });
    
    await db('tenants').where({ tenant_id: id, user_id: req.userId }).update(req.body);

    if (req.body.bed_id !== undefined && req.body.bed_id !== oldTenant.bed_id) {
      if (oldTenant.bed_id) await db('beds').where({ bed_id: oldTenant.bed_id, user_id: req.userId }).update({ status: 'Vacant' });
      if (req.body.bed_id) await db('beds').where({ bed_id: req.body.bed_id, user_id: req.userId }).update({ status: 'Occupied' });
    }

    const tenant = await db('tenants').where('tenant_id', id).first();
    // Sync if expiry or punch rules might have changed
    if (req.body.access_expiry_date !== undefined || req.body.punch_limit !== undefined) {
      await syncTenantAccess(id);
    }
    
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Instant Revoke Access
app.post('/api/tenants/:id/revoke', async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await db('tenants').where({ tenant_id: id, user_id: req.userId }).first();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // 1. Lock local access and tenant app
    await db('access_control').where('tenant_id', id).update({ access_granted: false });
    await db('tenants').where('tenant_id', id).update({ access_status: 'locked' }); // Lock PGMS app access
    
    // 2. Immediately restrict on devices
    const devices = await db('devices').where({ adms_status: true, user_id: req.userId });
    const cleanName = tenant.name.replace(/[^\w]/g, '');
    for (const dev of devices) {
      if (dev.sn) {
        await db('device_commands').insert({
          device_sn: dev.sn,
          command: `DATA UPDATE user Pin=${tenant.biometric_pin || id}\tEnabled=0`,
          user_id: req.userId
        });
      }
    }
    
    res.json({ message: 'User access instantly revoked from biometric readers and tenant app.' });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Reports & Analytics
app.get('/api/reports/stats', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Financial stats
  let payQuery = db('payments').where('user_id', req.userId);
  if (startDate) payQuery = payQuery.where('payment_date', '>=', startDate);
  if (endDate) payQuery = payQuery.where('payment_date', '<=', endDate);

  const revenue = await payQuery.clone().sum('amount_paid as total').first();

  // For pending, we need the latest balance per tenant
  const activeTenants = await db('tenants').where('user_id', req.userId);
  let totalPending = 0;
  for (const t of activeTenants) {
    const lastPay = await db('payments').where('tenant_id', t.tenant_id).orderBy('payment_date', 'desc').first();
    if (lastPay) totalPending += lastPay.balance;
    else totalPending += (t.bed_cost || 0) + (t.advance_amount || 0);
  }

  const pending = { total: totalPending };
  const advance = await db('payments').where({ payment_type: 'Advance', user_id: req.userId }).sum('amount_paid as total').first();

  // Occupancy stats
  const occupancy = await db('beds')
    .where('user_id', req.userId)
    .select('status')
    .count('bed_id as count')
    .groupBy('status');

  const occObj = { Vacant: 0, Occupied: 0, Maintenance: 0 };
  occupancy.forEach(o => occObj[o.status] = o.count);

  res.json({
    revenue: revenue.total || 0,
    pending: pending.total || 0,
    advance: advance.total || 0,
    occupancy: occObj
  });
});

app.get('/api/reports/tenant-wise', async (req, res) => {
  const { startDate, endDate, floor_id, room_id, status, payment_via } = req.query;

  let query = db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
    .where('tenants.user_id', req.userId);

  if (floor_id) query = query.where('floors.floor_id', floor_id);
  if (room_id) query = query.where('rooms.room_id', room_id);
  if (status) query = query.where('tenants.status', status);

  const tenants = await query.select(
    'tenants.*',
    'beds.bed_number',
    'beds.bed_cost',
    'beds.advance_amount',
    'rooms.room_number',
    'rooms.sharing_capacity',
    'floors.floor_name'
  );

  // For each tenant, fetch payment summary
  const reportData = await Promise.all(tenants.map(async (t) => {
    let payQuery = db('payments').where({ tenant_id: t.tenant_id, user_id: req.userId });
    if (startDate) payQuery = payQuery.where('payment_date', '>=', startDate);
    if (endDate) payQuery = payQuery.where('payment_date', '<=', endDate);
    if (payment_via) payQuery = payQuery.where('payment_via', payment_via);

    const paySum = await payQuery.clone().select(
      db.raw('MAX(payment_date) as last_payment_date'),
      db.raw('SUM(amount_paid) as total_paid')
    ).first();

    let lastPayQuery = db('payments').where({ tenant_id: t.tenant_id, user_id: req.userId });
    if (payment_via) lastPayQuery = lastPayQuery.where('payment_via', payment_via);
    const lastPay = await lastPayQuery.orderBy('payment_date', 'desc').first();

    return {
      ...t,
      last_payment_date: lastPay ? lastPay.payment_date : null,
      last_payment_type: lastPay ? `${lastPay.payment_via} (${lastPay.payment_type})${lastPay.utr_number ? ' - ' + lastPay.utr_number : ''}` : 'N/A',
      present_month_balance: lastPay ? lastPay.balance : 0,
      total_balance: lastPay ? lastPay.balance : 0
    };
  }));

  res.json(reportData);
});

app.get('/api/reports/tenant-attendance', async (req, res) => {
  const { startDate, endDate, floor_id, room_id, status } = req.query;

  try {
    let tQuery = db('tenants')
      .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
      .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
      .leftJoin('floors', 'rooms.floor_id', '=', 'floors.floor_id')
      .where('tenants.user_id', req.userId);

    if (floor_id) tQuery = tQuery.where('floors.floor_id', floor_id);
    if (room_id) tQuery = tQuery.where('rooms.room_id', room_id);
    if (status) tQuery = tQuery.where('tenants.status', status);

    const tenants = await tQuery.select(
      'tenants.tenant_id',
      'tenants.name',
      'rooms.room_number',
      'floors.floor_name'
    );

    let aQuery = db('attendance_logs').whereIn('tenant_id', tenants.map(t => t.tenant_id)).orderBy('punch_time', 'asc');
    if (startDate) aQuery = aQuery.where('punch_time', '>=', startDate + ' 00:00:00');
    if (endDate) aQuery = aQuery.where('punch_time', '<=', endDate + ' 23:59:59');

    const logs = await aQuery.select('*');

    const reportData = [];
    
    // Create a map of tenant_id string to tenant object for quick lookup
    const tenantMap = {};
    tenants.forEach(t => {
      tenantMap[t.tenant_id.toString()] = t;
    });

    // Group logs by tenant_id -> date -> punches
    const grouped = {};
    
    logs.forEach(log => {
      if (!log.tenant_id) return;
      
      const tId = log.tenant_id.toString();
      if (!tenantMap[tId]) return; // Only include if it matches our active filtered tenants
      
      // parse date (Y-M-D) from punch_time
      const pTime = new Date(log.punch_time);
      if (isNaN(pTime)) return;
      
      // Offset to local string or simple substring if formatted uniformly (eSSL ADMS sends "YYYY-MM-DD HH:mm:ss")
      let dateStr;
      if (typeof log.punch_time === 'string') {
        dateStr = log.punch_time.split(' ')[0];
      } else if (log.punch_time instanceof Date) {
        // adjust for local timezone if needed, but ISOString with split 'T' is usually fine for day-wise grouping
        const y = pTime.getFullYear();
        const m = String(pTime.getMonth() + 1).padStart(2, '0');
        const d = String(pTime.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      } else {
        return;
      }
      
      if (!grouped[tId]) grouped[tId] = {};
      if (!grouped[tId][dateStr]) grouped[tId][dateStr] = [];
      
      grouped[tId][dateStr].push(pTime);
    });

    for (const [tId, datesObj] of Object.entries(grouped)) {
      const tenant = tenantMap[tId];
      if (!tenant) continue;

      for (const [dateStr, punches] of Object.entries(datesObj)) {
        if (punches.length === 0) continue;
        
        punches.sort((a, b) => a - b);
        const firstPunch = punches[0];
        const lastPunch = punches[punches.length - 1];

        reportData.push({
          tenant_name: tenant.name,
          room_number: tenant.room_number || 'N/A',
          floor_name: tenant.floor_name || 'N/A',
          date: dateStr,
          first_punch: firstPunch.toISOString(),
          last_punch: punches.length > 1 ? lastPunch.toISOString() : null, // keep null if only 1 punch
          punch_count: punches.length,
          all_punches: punches.map(p => p.toISOString())
        });
      }
    }

    // Sort reportData by date desc, then tenant name
    reportData.sort((a, b) => {
      if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
      return a.tenant_name.localeCompare(b.tenant_name);
    });

    res.json(reportData);
  } catch (err) {
    console.error('Tenant Attendance Report Error:', err);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

app.get('/api/reports/transactions', async (req, res) => {
  const { startDate, endDate, payment_via } = req.query;
  let query = db('payments')
    .join('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where('payments.user_id', req.userId)
    .select(
      'payments.*',
      'tenants.name as tenant_name',
      'rooms.room_number'
    )
    .orderBy('payment_date', 'desc');

  if (startDate) query = query.where('payment_date', '>=', startDate);
  if (endDate) query = query.where('payment_date', '<=', endDate);
  if (payment_via) query = query.where('payments.payment_via', payment_via);

  const transactions = await query;
  res.json(transactions);
});

// Payments & Access Control
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await db('payments')
      .leftJoin('tenants', 'payments.tenant_id', '=', 'tenants.tenant_id')
      .where('payments.user_id', req.userId)
      .select('payments.*', 'tenants.name as tenant_name');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.get('/api/payments/status', async (req, res) => {
  const tenants = await db('tenants')
    .leftJoin('beds', 'tenants.bed_id', '=', 'beds.bed_id')
    .leftJoin('rooms', 'beds.room_id', '=', 'rooms.room_id')
    .where({ 'tenants.status': 'Staying', 'tenants.user_id': req.userId })
    .select('tenants.tenant_id', 'tenants.name', 'tenants.expiry_date', 'beds.bed_number', 'rooms.room_number', 'beds.bed_cost', 'beds.advance_amount');

  const data = await Promise.all(tenants.map(async (t) => {
    const lastPay = await db('payments').where({ tenant_id: t.tenant_id, user_id: req.userId }).orderBy('payment_date', 'desc').first();
    const access = await db('access_control').where('tenant_id', t.tenant_id).first();
    
    return {
      ...t,
      last_payment_date: lastPay ? lastPay.payment_date : null,
      pending_balance: lastPay ? lastPay.balance : 0,
      access_granted: access ? access.access_granted : false,
      schedule_id: access ? access.schedule_id : 1,
      access_group_id: access ? access.access_group_id : null
    };
  }));
  res.json(data);
});

app.post('/api/payments', async (req, res) => {
  try {
    const [inserted] = await db('payments').insert({ ...req.body, user_id: req.userId }).returning('payment_id');
    const id = typeof inserted === 'object' ? inserted.payment_id : inserted;
    const payment = await db('payments').where('payment_id', id).first();
    
    const tenant_id = req.body.tenant_id;
    const existingAccess = await db('access_control').where('tenant_id', tenant_id).first();
    if (existingAccess) {
      await db('access_control').where('tenant_id', tenant_id).update({ access_granted: true });
    } else {
      await db('access_control').insert({ tenant_id, access_granted: true });
    }

    // Trigger hardware sync
    await syncTenantAccess(tenant_id);

    // Automatically increase expiry date by 1 month
    const tenant = await db('tenants').where('tenant_id', tenant_id).first();
    if (tenant) {
      let currentExpiry = tenant.expiry_date ? new Date(tenant.expiry_date) : new Date();
      currentExpiry.setMonth(currentExpiry.getMonth() + 1);
      const newExpiry = currentExpiry.toISOString().split('T')[0];
      await db('tenants').where('tenant_id', tenant_id).update({ expiry_date: newExpiry });
    }

    // Update/Sync Billing Table for this Month
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    const billing = await db('billing').where({ tenant_id, month: currentMonth, year: currentYear }).first();
    if (billing) {
      const newPaid = (billing.amount_paid || 0) + req.body.amount_paid;
      const newBalance = Math.max(0, billing.total_due - newPaid);
      await db('billing').where({ id: billing.id }).update({
        amount_paid: newPaid,
        current_balance: newBalance,
        status: newBalance <= 0 ? 'Paid' : 'Partial'
      });

      // Restore access if fully paid
      if (newBalance <= 0) {
        await db('tenants').where('tenant_id', tenant_id).update({ access_status: 'active' });
      }
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

app.put('/api/access-control/:tenant_id', async (req, res) => {
  const { tenant_id } = req.params;
  const { access_granted } = req.body;

  const tid = Number(tenant_id);
  const existingAccess = await db('access_control').where('tenant_id', tid).first();
  if (existingAccess) {
    await db('access_control').where('tenant_id', tid).update({ access_granted: !!access_granted });
  } else {
    await db('access_control').insert({ tenant_id: tid, access_granted: !!access_granted });
  }

  // Trigger hardware sync
  await syncTenantAccess(tid);

  res.json({ message: 'Access updated manually and synced to hardware' });
});

app.get('/api/access-schedules', async (req, res) => {
  try {
    const schedules = await db('access_schedules').where('user_id', req.userId).select('*');
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.post('/api/access-schedules', async (req, res) => {
  try {
    const { name, valid_days, timings } = req.body;
    
    // Find next available timezone_id (bits 1-32)
    const existing = await db('access_schedules').where('user_id', req.userId).select('timezone_id');
    const usedIds = existing.map(s => s.timezone_id);
    let nextId = 1;
    for (let i = 1; i <= 32; i++) {
       if(!usedIds.includes(i)) { nextId = i; break; }
    }

    const data = {
      name,
      user_id: req.userId,
      valid_days: valid_days || '1111111',
      timezone_id: nextId,
      start_time: timings?.mon?.start || '08:00',
      end_time: timings?.mon?.end || '20:00'
    };

    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    days.forEach(day => {
      data[`${day}_start`] = timings?.[day]?.start || '00:00';
      data[`${day}_end`] = timings?.[day]?.end || '23:59';
    });

    const [id] = await db('access_schedules').insert(data).returning('id');

    // Sync TimeZone and Access Group ONLY to the current user's active devices
    const devices = await db('devices').where({ adms_status: true, user_id: req.userId });
    for (const device of devices) {
      if (device.sn) {
        const dStr = data.valid_days;
        const daysMap = days.map((day, i) => {
          const isActive = dStr[i] === '1';
          return `${day.toUpperCase()}=${isActive ? data[`${day}_start`] + '-' + data[`${day}_end`] : '00:00-00:00'}`;
        }).join('\t');

        await db('device_commands').insert([
          { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${nextId}\t${daysMap}`, user_id: req.userId },
          { device_sn: device.sn, command: `DATA UPDATE accgroup id=${id}\ttimezone1=${nextId}\ttimezone2=0\ttimezone3=0\tholiday=0\tverifystyle=0`, user_id: req.userId }
        ]);
      }
    }

    res.json({ id, message: 'Schedule created and synced to devices' });
  } catch (err) {
    console.error('Create Schedule Error:', err);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

app.delete('/api/access-schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id == 1) return res.status(400).json({ error: 'Cannot delete default schedule' });
    await db('access_schedules').where({ id, user_id: req.userId }).del();
    res.json({ message: 'Sync command queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue sync' });
  }
});

// Access Groups
app.get('/api/access-groups', async (req, res) => {
  try {
    const groups = await db('access_groups').where('user_id', req.userId).select('*');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch access groups' });
  }
});

app.post('/api/access-groups', async (req, res) => {
  try {
    const { name, timezone1_id, timezone2_id, timezone3_id, holiday_id } = req.body;
    const [id] = await db('access_groups').insert({
      name,
      user_id: req.userId,
      timezone1_id: toNull(timezone1_id),
      timezone2_id: toNull(timezone2_id),
      timezone3_id: toNull(timezone3_id),
      holiday_id: toNull(holiday_id)
    }).returning('id');
    res.json({ id, message: 'Access Group created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create access group' });
  }
});

app.delete('/api/access-groups/:id', async (req, res) => {
  try {
    await db('access_groups').where({ id: req.params.id, user_id: req.userId }).del();
    res.json({ message: 'Access Group deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete access group' });
  }
});

// Holidays
app.get('/api/holidays', async (req, res) => {
  try {
    const holidays = await db('holidays').where('user_id', req.userId).select('*');
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

app.post('/api/holidays', async (req, res) => {
  try {
    const { name, start_date, end_date, timezone_id } = req.body;
    const [id] = await db('holidays').insert({
      name, 
      start_date, 
      end_date, 
      timezone_id: toNull(timezone_id), 
      user_id: req.userId
    }).returning('id');
    
    // Sync to ONLY current user devices
    const devices = await db('devices').where({ user_id: req.userId, adms_status: true });
    for (const dev of devices) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      
      await db('device_commands').insert({
        device_sn: dev.sn,
        command: `DATA UPDATE holiday Holiday=${id}\tName=${name.replace(/\s+/g,'')}\tTimezone=${timezone_id || 0}\tMonth=${start.getMonth()+1}\tDay=${start.getDate()}`,
        user_id: req.userId
      });
    }

    res.json({ id, message: 'Holiday created and synced' });
  } catch (err) {
    console.error('Holiday create error:', err);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

app.delete('/api/holidays/:id', async (req, res) => {
  try {
    await db('holidays').where({ id: req.params.id, user_id: req.userId }).del();
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

app.put('/api/access-control/:tenant_id/group', async (req, res) => {
  try {
    const tid = Number(req.params.tenant_id);
    const gid = Number(req.body.access_group_id);
    
    if (isNaN(tid) || (req.body.access_group_id !== null && isNaN(gid))) {
      return res.status(400).json({ error: 'Invalid Tenant or Group ID' });
    }

    const existing = await db('access_control').where('tenant_id', tid).first();
    if (existing) {
      await db('access_control').where('tenant_id', tid).update({ access_group_id: toNull(req.body.access_group_id) });
    } else {
      await db('access_control').insert({ tenant_id: tid, access_group_id: toNull(req.body.access_group_id), access_granted: true });
    }
    
    await syncTenantAccess(tid);
    res.json({ message: 'Access Group assigned and synced' });
  } catch (err) {
    console.error('Group Assign Error:', err);
    res.status(500).json({ error: 'Failed to assign access group' });
  }
});

// Bulk Sync Users to Device
app.post('/api/devices/bulk-sync', async (req, res) => {
  const { tenant_ids } = req.body;
  if (!tenant_ids || !Array.isArray(tenant_ids)) return res.status(400).json({ error: 'Invalid tenant IDs' });

  try {
    const tenants = await db('tenants').whereIn('tenant_id', tenant_ids).andWhere('user_id', req.userId);
    const devices = await db('devices').where({ adms_status: true, user_id: req.userId });
    
    if (devices.length === 0) return res.status(400).json({ error: 'No active ADMS devices found' });

    for (const tenant of tenants) {
      await syncTenantAccess(tenant.tenant_id);
    }

    res.json({ message: `Queued sync commands for ${tenant_ids.length} tenants.` });
  } catch (err) {
    console.error('Bulk Sync Error:', err);
    res.status(500).json({ error: 'Failed to perform bulk sync' });
  }
});

// Re-sync ALL timezone definitions and access groups to all devices
app.post('/api/access-schedules/resync-all', async (req, res) => {
  try {
    const schedules = await db('access_schedules').where('user_id', req.userId);
    const devices = await db('devices').where('adms_status', true);
    let commandCount = 0;

    for (const device of devices) {
      if (!device.sn) continue;

      // 1. Re-sync all Schedules (Timezones)
      for (const s of schedules) {
        const tzId = s.timezone_id;
        const dStr = s.valid_days || '1111111';
        const crossesMidnight = s.start_time > s.end_time;

        if (crossesMidnight) {
          const daysMap1 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => `${d}=${dStr[i]?.toString() === '1' ? s.start_time + '-23:59' : '00:00-00:00'}`).join('\t');
          const daysMap2 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => `${d}=${dStr[i]?.toString() === '1' ? '00:00-' + s.end_time : '00:00-00:00'}`).join('\t');
          await db('device_commands').insert([
            { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId}\t${daysMap1}`, user_id: req.userId },
            { device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId + 50}\t${daysMap2}`, user_id: req.userId }
          ]);
        } else {
          const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => `${d}=${dStr[i]?.toString() === '1' ? s.start_time + '-' + s.end_time : '00:00-00:00'}`).join('\t');
          await db('device_commands').insert({ device_sn: device.sn, command: `DATA UPDATE timezone TimezoneId=${tzId}\t${daysMap}`, user_id: req.userId });
        }
      }

      // 2. Re-sync all Access Groups
      const groups = await db('access_groups').where('user_id', req.userId);
      for (const group of groups) {
          const t1 = await db('access_schedules').where('id', group.timezone1_id || 0).first();
          const t2 = await db('access_schedules').where('id', group.timezone2_id || 0).first();
          const t3 = await db('access_schedules').where('id', group.timezone3_id || 0).first();
          const tzIds = [t1?.timezone_id || 0, t2?.timezone_id || 0, t3?.timezone_id || 0];
          await db('device_commands').insert({ device_sn: device.sn, command: `DATA UPDATE accgroup id=${group.id}\ttimezone1=${tzIds[0]}\ttimezone2=${tzIds[1]}\ttimezone3=${tzIds[2]}\tholiday=0\tverifystyle=0`, user_id: req.userId });
      }
    }

    // 3. Re-sync all Tenant User Assignments
    const tenants = await db('tenants').where('user_id', req.userId).select('tenant_id');
    for (const t of tenants) {
        await syncTenantAccess(t.tenant_id);
    }

    res.json({ message: `Successfully queued re-sync commands for all devices.` });
  } catch (err) {
    console.error('[ADMS RESYNC] Error:', err.message);
    res.status(500).json({ error: 'Failed to re-sync schedules' });
  }
});

app.put('/api/access-control/:tenant_id/schedule', async (req, res) => {
  try {
    const tid = Number(req.params.tenant_id);
    const sid = Number(req.body.schedule_id);
    
    if (isNaN(tid) || isNaN(sid)) {
      return res.status(400).json({ error: 'Invalid Tenant or Schedule ID' });
    }

    const existing = await db('access_control').where('tenant_id', tid).first();
    if (existing) {
      await db('access_control').where('tenant_id', tid).update({ schedule_id: sid });
    } else {
      await db('access_control').insert({ tenant_id: tid, schedule_id: sid, access_granted: true });
    }
    
    await syncTenantAccess(tid);
    res.json({ message: 'Schedule assigned and synced to device' });
  } catch (err) {
    console.error('Schedule Assign Error:', err);
    res.status(500).json({ error: 'Failed to assign schedule' });
  }
});

app.post('/api/tenants', async (req, res) => {
  const { initial_payment, ...tenantData } = req.body;
  try {
    // Sanitize integer fields - PostgreSQL rejects '' for integer columns
    const sanitized = {
      ...tenantData,
      tenant_id: toNull(tenantData.tenant_id) ? Number(tenantData.tenant_id) : undefined,
      bed_id: toNull(tenantData.bed_id) ? Number(tenantData.bed_id) : null,
      user_id: req.userId
    };
    // Remove tenant_id if undefined (let DB auto-increment)
    if (sanitized.tenant_id === undefined) delete sanitized.tenant_id;
    // Convert empty strings to null for optional text fields
    if (sanitized.expiry_date === '') sanitized.expiry_date = null;
    if (sanitized.occupation === '') sanitized.occupation = null;

    const [inserted] = await db('tenants').insert(sanitized).returning('tenant_id');
    const id = typeof inserted === 'object' ? inserted.tenant_id : inserted;
    
    // If bed assigned, update bed status
    if (sanitized.bed_id) {
      await db('beds').where({ bed_id: sanitized.bed_id, user_id: req.userId }).update({ status: 'Occupied' });
    }
    
    // Auto-approve access and sync to device
    await db('access_control').insert({ 
      tenant_id: id, 
      access_granted: true,
      user_id: req.userId 
    });
    
    // Record initial payment if marked as paid
    if (initial_payment === 'Paid' && sanitized.bed_id) {
      const bed = await db('beds').where('bed_id', sanitized.bed_id).first();
      if (bed) {
        // Calculate total (Rent + Advance for Permanent, or pre-calculated for Guest)
        let amount = bed.bed_cost + bed.advance_amount;
        if (tenantData.tenant_type === 'Guest') {
          const start = new Date(tenantData.joining_date);
          const end = new Date(tenantData.expiry_date);
          const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
          amount = days * (bed.daily_cost || 0);
        }

        await db('payments').insert({
          tenant_id: id,
          payment_date: new Date().toISOString().split('T')[0],
          amount_paid: amount,
          balance: 0,
          payment_type: 'Advance+Rent',
          user_id: req.userId
        });
      }
    }

    await syncTenantAccess(id);
    
    const tenant = await db('tenants').where('tenant_id', id).first();
    res.json(tenant);
  } catch (err) {
    console.error('Tenant Creation Error:', err);
    res.status(500).json({ error: 'Failed to add tenant: ' + (err.message || 'Unknown error') });
  }
});

// Devices
app.get('/api/devices', async (req, res) => {
  const devices = await db('devices').where('user_id', req.userId).select('*');
  res.json(devices);
});

app.post('/api/devices', async (req, res) => {
  try {
    const { device_name, ip_address, port, machine_id, sn, comm_key, adms_status } = req.body;
    
    // Enforce unique SN across all users
    if (sn) {
      const existing = await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).first();
      if (existing) {
        return res.status(400).json({ error: 'Device with this Serial Number is already registered in the system.' });
      }
    }

    const [device] = await db('devices').insert({ 
      device_name,
      ip_address,
      port: port || 4370,
      machine_id: machine_id || 1,
      sn: toNull(sn),
      comm_key: comm_key || '0',
      adms_status: !!adms_status,
      user_id: req.userId 
    }).returning('*');
    res.json(device);
  } catch (err) {
    console.error('Add Device Error:', err);
    res.status(500).json({ error: 'Failed to add device' });
  }
});

app.put('/api/devices/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });
  const { device_name, ip_address, port, machine_id, sn, comm_key, adms_status } = req.body;
  try {
    // Enforce unique SN across all users (excluding current device)
    if (sn) {
      const existing = await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).whereNot('device_id', id).first();
      if (existing) {
        return res.status(400).json({ error: 'Device with this Serial Number is already registered by another user.' });
      }
    }

    const [device] = await db('devices').where({ device_id: id, user_id: req.userId }).update({
      device_name,
      ip_address,
      port: port || 4370,
      machine_id: machine_id || 1,
      sn: toNull(sn),
      comm_key: comm_key || '0',
      adms_status: !!adms_status
    }).returning('*');
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    console.error('Update Device Error:', err);
    res.status(500).json({ error: 'Failed to update device: ' + (err.message || 'Unknown error') });
  }
});

app.delete('/api/devices/:id', async (req, res) => {
  await db('devices').where('device_id', req.params.id).del();
  res.json({ message: 'Device deleted successfully' });
});

app.post('/api/devices/sync-user', async (req, res) => {
  const { tenant_id, target_device_sn } = req.body;
  try {
    const tenant = await db('tenants').where('tenant_id', tenant_id).first();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    // Find all active devices that support ADMS
    let devicesQuery = db('devices').where({ adms_status: true, user_id: req.userId });
    if (target_device_sn) {
      devicesQuery = devicesQuery.whereRaw('LOWER(sn) = ?', [target_device_sn.toLowerCase()]);
    }
    const devices = await devicesQuery;
    let count = 0;
    
    for (const device of devices) {
      if (device.sn) {
        // ZKTeco ADMS FORMAT: C:<id>:DATA UPDATE USERINFO PIN=...
        const command = `DATA UPDATE USERINFO PIN=${tenant.tenant_id}\tName=${tenant.name.replace(/\s+/g, '')}\tPri=0\tPass=\tCard=\tGrp=1\tTZ=0000000100000000\tPIN2=${tenant.tenant_id}`;
        
        await db('device_commands').insert({
          device_sn: device.sn,
          command: command,
          user_id: req.userId || tenant.user_id
        });
        count++;
      }
    }
    res.json({ message: count > 0 ? `Queued sync command to ${count} devices.` : `No active ADMS devices with SN configured.` });
  } catch (err) {
    console.error('Sync User Error:', err);
    res.status(500).json({ error: 'Failed to queue sync command' });
  }
});

// Device Settings
// Global Access Settings route
app.get('/api/system/access-options', async (req, res) => {
  try {
    let settings = await db('device_settings').where({ device_id: null, user_id: req.userId }).first();
    if (!settings) {
      const [inserted] = await db('device_settings').insert({ device_id: null, user_id: req.userId }).returning('*');
      settings = inserted.id ? inserted : await db('device_settings').where('id', inserted).first();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global settings' });
  }
});

app.put('/api/system/access-options', async (req, res) => {
  const { 
    lock_delay, sensor_type, door_mode, anti_passback,
    expire_action, auto_block_enabled, auto_block_days, auto_delete_enabled, auto_delete_days
  } = req.body;
  try {
    let settings = await db('device_settings').where({ device_id: null, user_id: req.userId }).first();
    if (!settings) {
       await db('device_settings').insert({ device_id: null, user_id: req.userId });
    }
    await db('device_settings').where({ device_id: null, user_id: req.userId }).update({
      lock_delay, sensor_type, door_mode, anti_passback,
      expire_action, auto_block_enabled, auto_block_days, auto_delete_enabled, auto_delete_days
    });
    
    // Sync to ALL user devices via Command Queue
    const devices = await db('devices').where({ user_id: req.userId, adms_status: true });
    for(const device of devices){
        if (device && device.sn) {
          await db('device_commands').insert({
            device_sn: device.sn,
            command: `DATA UPDATE options LockDelay=${lock_delay || 5}\tExpireAction=${expire_action || 0}`,
            user_id: req.userId
          });
        }
    }

    const updated = await db('device_settings').where({ device_id: null, user_id: req.userId }).first();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update global settings' });
  }
});

// Remote Device Control (Unlock, Lock, Hold Open, Alarm Cancel)
app.post('/api/devices/:id/control', async (req, res) => {
  const id = Number(req.params.id);
  const action = req.body.action || 'unlock';
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });
  
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found or not configured' });
    
    const commandMap = {
      'unlock':       'ACUNLOCK',                     // Proven to work on this device
      'lock':         'ACUNLOCK CLOSE',                // Force lock
      'hold_open':    'ACUNLOCK OPEN',                 // Hold door open
      'alarm_cancel': 'ACALARM',                       // Cancel alarm
    };
    
    const commandStr = commandMap[action] || commandMap['unlock'];
    
    await db('device_commands').insert({
      device_sn: device.sn,
      command: commandStr,
      user_id: req.userId
    });
    
    const labels = { unlock: 'Unlock (5s)', lock: 'Force Lock', hold_open: 'Hold Open', alarm_cancel: 'Cancel Alarm' };
    res.json({ message: `Queued: ${labels[action] || action}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send remote command' });
  }
});

// Maintenance Commands (eTimeTrackLite style)
app.post('/api/devices/:id/reboot', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    await db('device_commands').insert({ device_sn: device.sn, command: 'REBOOT', user_id: req.userId });
    res.json({ message: 'Reboot command queued' });
  } catch (err) { res.status(500).json({ error: 'Failed to queue reboot' }); }
});

app.post('/api/devices/:id/clear-logs', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    await db('device_commands').insert({ device_sn: device.sn, command: 'CLEAR LOG', user_id: req.userId });
    res.json({ message: 'Clear logs command queued' });
  } catch (err) { res.status(500).json({ error: 'Failed to queue clear logs' }); }
});

app.post('/api/devices/:id/sync-time', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    const d = new Date();
    const serverTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    await db('device_commands').insert({ device_sn: device.sn, command: `SET OPTIONS Time=${serverTime}`, user_id: req.userId });
    res.json({ message: 'Time sync command queued' });
  } catch (err) { res.status(500).json({ error: 'Failed to queue time sync' }); }
});

// Delete specific user from device hardware
app.post('/api/devices/:id/delete-user', async (req, res) => {
  const id = Number(req.params.id);
  const { pin } = req.body;
  if (isNaN(id) || !pin) return res.status(400).json({ error: 'Device ID and PIN are required' });
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    await db('device_commands').insert([
      { device_sn: device.sn, command: `DATA DELETE user Pin=${pin}`, user_id: req.userId },
      { device_sn: device.sn, command: `DATA DELETE templatev10 Pin=${pin}`, user_id: req.userId },
      { device_sn: device.sn, command: `DATA DELETE BIODATA Pin=${pin}`, user_id: req.userId }
    ]);
    res.json({ message: `Queued: Delete user PIN=${pin} + all biometrics from device` });
  } catch (err) { res.status(500).json({ error: 'Failed to queue delete user' }); }
});

// Factory reset — clear ALL data from device (requires confirmation token)
app.post('/api/devices/:id/clear-all-data', async (req, res) => {
  const id = Number(req.params.id);
  const { confirmToken } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });
  if (confirmToken !== 'RESET') return res.status(400).json({ error: 'Type "RESET" to confirm factory reset' });
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    await db('device_commands').insert({ device_sn: device.sn, command: 'CLEAR DATA', user_id: req.userId });
    res.json({ message: '⚠️ Factory reset command queued. ALL users, templates, and logs will be erased from the device.' });
  } catch (err) { res.status(500).json({ error: 'Failed to queue factory reset' }); }
});

// Query device info (firmware, user count, capacity, etc.)
app.post('/api/devices/:id/query-info', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    // CHECK forces the device to re-sync all data including user counts
    await db('device_commands').insert({ device_sn: device.sn, command: 'CHECK', user_id: req.userId });
    res.json({ message: 'Device check command queued. Device will re-report its status.' });
  } catch (err) { res.status(500).json({ error: 'Failed to queue info query' }); }
});

// Set hardware options (Volume, Language, DateFormat, DoorSensor, etc.)
app.post('/api/devices/:id/set-options', async (req, res) => {
  const id = Number(req.params.id);
  const options = req.body; // { Volume: 5, DateFormat: 0, Language: 0, ... }
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });
  
  // Build SET OPTIONS string from provided key-value pairs
  const validKeys = ['Volume', 'DateFormat', 'Language', 'DoorSensorType', 'AntiPassback', 'LockDelay', 'ComPwd', 'FaceFunOn', 'FingerFunOn'];
  const pairs = [];
  for (const key of validKeys) {
    if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
      pairs.push(`${key}=${options[key]}`);
    }
  }
  
  if (pairs.length === 0) return res.status(400).json({ error: 'No valid options provided' });
  
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found' });
    await db('device_commands').insert({ device_sn: device.sn, command: `SET OPTIONS ${pairs.join(',')}`, user_id: req.userId });
    res.json({ message: `Queued: SET OPTIONS ${pairs.join(', ')}` });
  } catch (err) { res.status(500).json({ error: 'Failed to queue set options' }); }
});

// Device Test Connection — checks if device is reachable
app.get('/api/devices/:id/test', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });

  const device = await db('devices').where('device_id', id).first();
  if (!device) return res.status(404).json({ error: 'Device not found' });

  // 1. For ADMS (Push) devices, check if they checked in recently
  if (device.adms_status && device.last_seen) {
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffSeconds = Math.abs(now - lastSeen) / 1000;

    // If seen in last 2 minutes, consider it online
    if (diffSeconds < 120) {
       return res.json({ 
         status: 'online', 
         message: `ADMS Active (Last Seen: ${lastSeen.toLocaleTimeString()})`, 
         ip: device.ip_address,
         last_seen: device.last_seen 
       });
    }
  }

  if (!device.ip_address) return res.status(400).json({ error: 'No IP address configured' });

  // 2. Fallback to direct HTTP fetch (standard Pull mode)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`http://${device.ip_address}/`, { signal: controller.signal });
    clearTimeout(timeout);
    res.json({ status: 'online', message: `Device responded with HTTP ${response.status}`, ip: device.ip_address });
  } catch (err) {
    let msg = `Device unreachable at ${device.ip_address}: ${err.message}`;
    if (device.adms_status) {
      msg += '. Note: Push devices may not respond to direct pings.';
    }
    res.json({ status: 'offline', message: msg, ip: device.ip_address });
  }
});

// Get attendance logs
app.get('/api/attendance-logs', async (req, res) => {
  const { device_sn, startDate, endDate } = req.query;
  // We filter by user_id to ensure the admin only sees their own logs
  let query = db('attendance_logs').where('admin_user_id', req.userId).orderBy('punch_time', 'desc').limit(200);
  if (device_sn) query = query.where('device_sn', device_sn);
  if (startDate) query = query.where('punch_time', '>=', startDate);
  if (endDate) query = query.where('punch_time', '<=', endDate);
  const logs = await query;
  res.json(logs);
});

app.post('/api/devices/:id/download-users', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    if (device.sn) {
      // Queue commands to download USERINFO + fingerprint templates + biometric data
      await db('device_commands').insert([
        {
          device_sn: device.sn,
          command: `DATA QUERY USERINFO`,
          user_id: req.userId
        },
        {
          device_sn: device.sn,
          command: `DATA QUERY BIODATA Type=1`,
          user_id: req.userId
        },
        {
          device_sn: device.sn,
          command: `DATA QUERY BIODATA Type=9`,
          user_id: req.userId
        },
        {
          device_sn: device.sn,
          command: `CHECK`,
          user_id: req.userId
        }
      ]);
      res.json({ message: 'Download queued: Forced device sync (CHECK command)' });
    } else {
      res.status(400).json({ error: 'Device SN not configured' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue command' });
  }
});

// Sync History Endpoint
// ── Biometric Templates API ──────────────────────────────────────────

// List all biometric templates for the current user's tenants
app.get('/api/biometric-templates', async (req, res) => {
  try {
    const templates = await db('biometric_templates')
      .join('tenants', 'biometric_templates.tenant_id', 'tenants.tenant_id')
      .where('biometric_templates.user_id', req.userId)
      .select(
        'biometric_templates.*',
        'tenants.name as tenant_name',
        'tenants.biometric_pin'
      )
      .orderBy('biometric_templates.updated_at', 'desc');
    res.json(templates);
  } catch (err) {
    console.error('[BIOMETRIC] Failed to fetch templates:', err.message);
    res.status(500).json({ error: 'Failed to fetch biometric templates' });
  }
});

// Broadcast ALL saved templates to a specific device (for setting up new devices)
app.post('/api/devices/:id/broadcast-templates', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid Device ID' });

  try {
    const device = await db('devices').where({ device_id: id, user_id: req.userId }).first();
    if (!device || !device.sn) return res.status(404).json({ error: 'Device not found or SN not configured' });

    // Fetch all valid templates for this admin's tenants
    const templates = await db('biometric_templates')
      .where({ user_id: req.userId, is_valid: true });

    if (templates.length === 0) {
      return res.json({ message: 'No biometric templates found to broadcast.', count: 0 });
    }

    const commands = [];
    for (const tpl of templates) {
      const tenant = await db('tenants').where('tenant_id', tpl.tenant_id).first();
      if (!tenant) continue;
      const pin = tenant.biometric_pin || tenant.tenant_id.toString();

      if (tpl.type === 'fingerprint') {
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE FPTMP PIN=${pin}\tFID=${tpl.finger_index}\tSize=${tpl.template_data.length}\tValid=1\tTMP=${tpl.template_data}`,
          user_id: req.userId
        });
      } else {
        const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '0');
        commands.push({
          device_sn: device.sn,
          command: `DATA UPDATE BIODATA PIN=${pin}\tType=${bioType}\tSize=${tpl.template_data.length}\tContent=${tpl.template_data}`,
          user_id: req.userId
        });
      }
    }

    if (commands.length > 0) {
      await db('device_commands').insert(commands);
    }

    console.log(`[BIOMETRIC] Broadcasted ${commands.length} templates to device ${device.sn} (${device.device_name})`);
    res.json({ message: `Queued ${commands.length} biometric template(s) to ${device.device_name}.`, count: commands.length });
  } catch (err) {
    console.error('[BIOMETRIC] Broadcast error:', err.message);
    res.status(500).json({ error: 'Failed to broadcast templates' });
  }
});

// Resync all biometrics for a specific tenant across all (or specific) devices
app.post('/api/tenants/:id/resync-biometrics', async (req, res) => {
  const tenantId = Number(req.params.id);
  const { target_device_sn } = req.body || {};
  if (isNaN(tenantId)) return res.status(400).json({ error: 'Invalid tenant ID' });

  try {
    const tenant = await db('tenants').where({ tenant_id: tenantId, user_id: req.userId }).first();
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const templates = await db('biometric_templates')
      .where({ tenant_id: tenantId, is_valid: true });

    if (templates.length === 0) {
      return res.json({ message: `No biometric templates found for ${tenant.name}.`, count: 0 });
    }

    let devicesQuery = db('devices').where({ adms_status: true, user_id: req.userId });
    if (target_device_sn) {
      devicesQuery = devicesQuery.whereRaw('LOWER(sn) = ?', [target_device_sn.toLowerCase()]);
    }
    const devices = await devicesQuery;
    
    if (devices.length === 0) {
      return res.json({ message: 'No active ADMS devices found matching criteria.', count: 0 });
    }

    const pin = tenant.biometric_pin || tenant.tenant_id.toString();
    const commands = [];

    for (const device of devices) {
      if (!device.sn) continue;
      for (const tpl of templates) {
        if (tpl.type === 'fingerprint') {
          commands.push({
            device_sn: device.sn,
            command: `DATA UPDATE FPTMP PIN=${pin}\tFID=${tpl.finger_index}\tSize=${tpl.template_data.length}\tValid=1\tTMP=${tpl.template_data}`,
            user_id: req.userId
          });
        } else {
          const bioType = tpl.type === 'face' ? '9' : (tpl.type === 'palm' ? '8' : '0');
          commands.push({
            device_sn: device.sn,
            command: `DATA UPDATE BIODATA PIN=${pin}\tType=${bioType}\tSize=${tpl.template_data.length}\tContent=${tpl.template_data}`,
            user_id: req.userId
          });
        }
      }
    }

    if (commands.length > 0) {
      await db('device_commands').insert(commands);
    }

    console.log(`[BIOMETRIC] Resynced ${templates.length} template(s) for tenant ${tenant.name} across ${devices.length} device(s)`);
    res.json({ 
      message: `Resynced ${templates.length} biometric(s) for ${tenant.name} to ${devices.length} device(s).`, 
      count: commands.length 
    });
  } catch (err) {
    console.error('[BIOMETRIC] Resync error:', err.message);
    res.status(500).json({ error: 'Failed to resync biometrics' });
  }
});

app.get('/api/devices/sync-history', async (req, res) => {
  try {
    const history = await db('device_commands')
      .where('user_id', req.userId)
      .orderBy('created_at', 'desc')
      .limit(100);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

// SSE endpoint for real-time punch events
app.get('/api/events', (req, res) => {
  const targetUserId = req.query.user_id ? parseInt(req.query.user_id) : null;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const onPunch = (data) => {
    // data should contain { admin_user_id, tenant_name, punch_time, device_sn }
    if (!targetUserId || data.admin_user_id === targetUserId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  eventBus.on('punch', onPunch);

  req.on('close', () => {
    eventBus.removeListener('punch', onPunch);
  });
});

// ==========================================
// ADMS Protocol Endpoints (eSSL Biometric)
// ==========================================
// These are the endpoints your eSSL device must push to.
// Configure the device ADMS server URL as: http://<YOUR_PC_IP>:5000

// ADMS Handshake — Flexible route to handle case-insensitivity or trailing slashes
// ADMS Handshake & Data Push — Flexible route to handle case-insensitivity or trailing slashes
app.all(/iclock\/cdata/i, async (req, res) => {
  const { SN, sn: snLowerParam, table } = req.query;
  const sn = (SN || snLowerParam || req.headers['x-device-sn'] || req.headers['sn'] || '').trim();
  
  if (!sn) {
    console.warn(`[ADMS] cdata hit without SN. Path: ${req.path}`);
    return res.status(200).send('OK\r\n'); // Still send OK so device doesn't retry infinitely
  }
  const logPath = path.join(__dirname, 'adms_packets.log');

  if (req.method === 'GET') {
    let deviceStatus = 'NOT FOUND';
    if (sn) {
      const existing = await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).first();
      if (existing) {
        deviceStatus = `FOUND (ID: ${existing.device_id}, User: ${existing.user_id})`;
        await db('devices').where('device_id', existing.device_id).update({ 
          adms_status: true, 
          last_seen: new Date().toISOString()
        }).catch(err => fs.appendFileSync(logPath, `[DB ERROR] ${err.message}\n`));
      }
    }
    logADMS(req, `HANDSHAKE (REGEXP) - SN: ${sn} - Status: ${deviceStatus}`);

    res.set('Content-Type', 'text/plain');
    const d = new Date();
    const serverTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    const resp = [
      `GET OPTION FROM: ${sn}`,
      `ATTLOGStamp=9999`,
      `OPERLOGStamp=9999`,
      `ATTPHOTOStamp=0`,
      `FPStamp=0`,
      `UserCount=0`,
      `FPCount=0`,
      `BioDataStamp=0`,
      `BioPhotoStamp=0`,
      `TransFlag=1111111111`,
      `Realtime=1`,
      `Encrypt=0`,
      `TransInterval=1`,
      `TransTimes=00:00;23:59`,
      `ErrorDelay=30`,
      `Delay=10`,
      `ServerTime=${serverTime}`,
      ``
    ].join('\r\n');
    res.set('Content-Type', 'text/plain');
    return res.send(resp + '\n');
  }

  // POST handling (Data Push)
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  try {
    const snLower = sn.toLowerCase();
    const device = await db('devices').whereRaw('LOWER(sn) = ?', [snLower]).first();
    const adminUserId = device ? device.user_id : null;
    logADMS(req, `DATA PUSH - SN: ${sn} (User: ${adminUserId}) - Table: ${table}`, rawBody);

    // Handle ATTLOG (Attendance Logs)
    if (table === 'ATTLOG' || (rawBody && (rawBody.includes('ATTLOG') || rawBody.includes('\t')))) {
      const lines = rawBody.split('\n');
      let count = 0;
      const adminUserId = device ? device.user_id : null;
      
      for (const line of lines) {
        if (!line.trim() || line.includes('ATTLOG')) continue;
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const pin = parts[0].trim();
          const punchTime = parts[1].trim();
          const verifyType = parts.length > 2 ? parseInt(parts[2]) || 0 : 0;
          const status = parts.length > 3 ? parseInt(parts[3]) || 0 : 0;

          // Find tenant by matching Hardware PIN to Software tenant_id OR biometric_pin
          let tenant = await db('tenants')
            .where({ user_id: adminUserId })
            .where(builder => {
              builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
            })
            .first();

          if (tenant) {
            await db('attendance_logs').insert({
              admin_user_id: adminUserId,
              tenant_id: tenant.tenant_id,
              biometric_pin: pin,
              device_sn: sn || 'unknown',
              punch_time: punchTime,
              verify_type: verifyType,
              status: status
            });
            eventBus.emit('punch', { 
              admin_user_id: adminUserId,
              user_id: tenant.name, 
              punch_time: punchTime, 
              device_sn: sn || 'unknown' 
            });
            count++;
          }
        }
      }
      console.log(`[ADMS] Stored ${count} attendance records from ${sn} for user ${adminUserId}`);
    } 
    
    // Handle USERINFO (User Details)
    else if (table === 'USERINFO' || table === 'USER' || (rawBody && (rawBody.includes('PIN=') || rawBody.includes('USERINFO')))) {
      const lines = rawBody.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim() || line.includes('PHOTO')) continue;
        const cleanLine = line.trim();

        // ── Case A: Fingerprint/Face Template embedded in OPERLOG ──────
        if (cleanLine.startsWith('FP') || cleanLine.startsWith('FACE')) {
          const isFace = cleanLine.startsWith('FACE');
          const fields = {};
          // Strip prefix "FP " or "FACE "
          const dataContent = cleanLine.replace(/^(FP|FACE)\s+/i, '').trim();
          dataContent.split(/[\t]+/).forEach(part => {
             const [k, v] = part.split('=');
             if (k) fields[k.toUpperCase()] = (v || '').trim();
          });

          const pin = fields.PIN || fields['PIN=']; // Handle possible PIN= as key
          const tmpData = fields.TMP || fields.CONTENT || fields.Tmp;
          const fingerIdx = parseInt(fields.FID || fields.INDEX || '0') || 0;

          if (pin && tmpData) {
            const adminUserId = device ? device.user_id : null;
            let tenant = await db('tenants')
              .where({ user_id: adminUserId })
              .where(builder => {
                builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
              })
              .first();

            if (tenant) {
              const type = isFace ? 'face' : 'fingerprint';
              const existing = await db('biometric_templates').where({ tenant_id: tenant.tenant_id, type, finger_index: fingerIdx }).first();
              const bioData = {
                template_data: tmpData,
                algorithm_ver: fields.ALGVER || (isFace ? '12.0' : '10.0'),
                major_ver: fields.MAJORVER,
                minor_ver: fields.MINORVER,
                format: fields.FORMAT,
                no_index: fields.FID || fields.INDEX,
                source_device_sn: sn,
                updated_at: new Date().toISOString()
              };

              if (existing) {
                await db('biometric_templates').where('id', existing.id).update(bioData);
              } else {
                await db('biometric_templates').insert({ tenant_id: tenant.tenant_id, type, finger_index: fingerIdx, ...bioData, user_id: adminUserId });
              }
              count++;
            }
          }
          continue; 
        }

        // ── Case B: Standard USERINFO / USER update ─────────────────────
        const parts = cleanLine.split(/[\t]+| {2,}/);
        const userData = {};
        parts.forEach(p => {
          const part = p.trim();
          if (part.includes('=')) {
            const [key, val] = part.split('=');
            if (key) userData[key.trim().toUpperCase()] = (val || '').trim();
          } else if (part.startsWith('PIN:')) {
            userData.PIN = part.replace('PIN:', '').trim();
          }
        });

        const pin = userData.PIN || userData['PIN=']; // Some devices might send PIN=1 as a field
        // If PIN is not found in parts, try a global regex
        if (!pin && line.includes('PIN=')) {
          const match = line.match(/PIN=([^ \t\n\r]+)/i);
          if (match) userData.PIN = match[1];
        }

        if (userData.PIN) {
          const pin = userData.PIN;
          const pinNum = parseInt(pin);
          const name = userData.NAME || `User ${pin}`;
          const adminUserId = device ? device.user_id : null;
          
          // Check if user exists by either ID
          let tenant = await db('tenants')
            .where({ user_id: adminUserId })
            .where(builder => {
              builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pinNum) ? -1 : pinNum);
            })
            .first();

          if (!tenant) {
            console.log(`[ADMS] Importing from device: ${name} (PIN/ID: ${pin}) for admin ${adminUserId}`);
            
            // If the PIN is a number, we try to use it as the tenant_id directly (per user policy: device ID = software ID)
            const insertData = {
              name: name,
              mobile: '0000000000',
              joining_date: new Date().toISOString().split('T')[0],
              biometric_pin: pin,
              device_sn: sn,
              status: 'Staying',
              user_id: adminUserId
            };

            // Only use as Primary Key if it's a valid ID and not conflicting
            if (!isNaN(pinNum) && pinNum > 0) {
              const existingId = await db('tenants').where('tenant_id', pinNum).first();
              if (!existingId) {
                insertData.tenant_id = pinNum;
              }
            }

            const [inserted] = await db('tenants').insert(insertData).returning('tenant_id');
            const newId = typeof inserted === 'object' ? inserted.tenant_id : inserted;

            // FIX: If we manually inserted an ID, we MUST update the PostgreSQL sequence 
            // to avoid "duplicate key" errors on the next auto-increment insert.
            if (!isNaN(pinNum)) {
              await db.raw(`SELECT setval(pg_get_serial_sequence('tenants', 'tenant_id'), max(tenant_id)) FROM tenants`).catch(e => console.error('Sequence Fix Error:', e));
            }

            await db('access_control').insert({
              tenant_id: newId,
              access_granted: true,
              device_id: device ? device.device_id : null
            });
            count++;
          } else if (tenant.name.startsWith('User ') && userData.NAME) {
            await db('tenants').where('tenant_id', tenant.tenant_id).update({ name: userData.NAME });
            count++;
          }
        }
      }
      console.log(`[ADMS] Successfully processed ${count} user records from ${sn}`);
    }

    // Handle PHOTO (User Profile Photos)
    else if (rawBody && (rawBody.includes('CMD=PIC') || rawBody.includes('FileName='))) {
      console.log(`[ADMS] Received photo update/data from device ${sn}`);
    }

    // ── Handle BIODATA (Face, Palm biometric templates) ──────────────
    else if (table === 'BIODATA' || (rawBody && rawBody.includes('BIODATA'))) {
      const lines = rawBody.split('\n');
      let count = 0;
      const adminUserId = device ? device.user_id : null;

      for (const line of lines) {
        if (!line.trim()) continue;
        // Only skip if the line is JUST the table name (header)
        if (line.trim().toUpperCase() === 'BIODATA') continue;


        // Parse key=value pairs separated by tabs
        const fields = {};
        // Strip out the table prefix (e.g., "BIODATA ") if it exists in the line
        const cleanLine = line.replace(/^BIODATA\s+/i, '').trim();
        
        cleanLine.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) {
            const key = part.substring(0, eqIdx).trim().toUpperCase();
            const val = part.substring(eqIdx + 1).trim();
            fields[key] = val;
          }
        });

        const pin = fields.PIN;
        const content = fields.CONTENT || fields.TMP || fields.DATA;
        const bioTypeNum = fields.TYPE || '0';

        if (!pin || !content) continue;

        // Map numeric type to string
        let bioType = 'fingerprint';
        if (bioTypeNum === '9') bioType = 'face';
        else if (bioTypeNum === '8') bioType = 'palm';

        // Find the tenant by PIN
        let tenant = await db('tenants')
          .where({ user_id: adminUserId })
          .where(builder => {
            builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
          })
          .first();

        if (tenant) {
          // Upsert: update if already exists, else insert
          const existing = await db('biometric_templates').where({
            tenant_id: tenant.tenant_id,
            type: bioType,
            finger_index: parseInt(fields.FID || fields.NO || '0') || 0
          }).first();

          if (existing) {
            await db('biometric_templates').where('id', existing.id).update({
              template_data: content,
              algorithm_ver: fields.ALGVER || fields.ALGORITHMVER || '10.0',
              major_ver: fields.MAJORVER,
              minor_ver: fields.MINORVER,
              format: fields.FORMAT,
              no_index: fields.NO || fields.FID,
              source_device_sn: sn,
              updated_at: new Date().toISOString()
            });
          } else {
            await db('biometric_templates').insert({
              tenant_id: tenant.tenant_id,
              type: bioType,
              template_data: content,
              finger_index: parseInt(fields.FID || fields.NO || '0') || 0,
              algorithm_ver: fields.ALGVER || fields.ALGORITHMVER || '10.0',
              major_ver: fields.MAJORVER,
              minor_ver: fields.MINORVER,
              format: fields.FORMAT,
              no_index: fields.NO || fields.FID,
              source_device_sn: sn,
              user_id: adminUserId
            });
          }
          count++;
        }
      }
      console.log(`[ADMS] Stored ${count} BIODATA template(s) from device ${sn}`);
    }

    // ── Handle FPTMP (Fingerprint Templates) ─────────────────────────
    else if (table === 'FPTMP' || (rawBody && rawBody.includes('FPTMP'))) {
      const lines = rawBody.split('\n');
      let count = 0;
      const adminUserId = device ? device.user_id : null;

      for (const line of lines) {
        if (!line.trim()) continue;
        // Only skip if the line is JUST the table name (header)
        if (line.trim().toUpperCase() === 'FPTMP') continue;


        // Parse key=value pairs separated by tabs
        const fields = {};
        // Strip out the table prefix (e.g., "FPTMP ") if it exists in the line
        const cleanLine = line.replace(/^FPTMP\s+/i, '').trim();

        cleanLine.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) {
            const key = part.substring(0, eqIdx).trim().toUpperCase();
            const val = part.substring(eqIdx + 1).trim();
            fields[key] = val;
          }
        });

        const pin = fields.PIN;
        const tmpData = fields.TMP || fields.TEMPLATE;
        const fingerIdx = parseInt(fields.FID || fields.FINGERID || '0') || 0;

        if (!pin || !tmpData) continue;

        // Find the tenant by PIN
        let tenant = await db('tenants')
          .where({ user_id: adminUserId })
          .where(builder => {
            builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin));
          })
          .first();

        if (tenant) {
          // Upsert: update if already exists, else insert
          const existing = await db('biometric_templates').where({
            tenant_id: tenant.tenant_id,
            type: 'fingerprint',
            finger_index: fingerIdx
          }).first();

          if (existing) {
            await db('biometric_templates').where('id', existing.id).update({
              template_data: tmpData,
              algorithm_ver: fields.ALGVER || fields.ALGORITHMVER || '10.0',
              major_ver: fields.MAJORVER || fields.MAJOR_VER,
              minor_ver: fields.MINORVER || fields.MINOR_VER,
              format: fields.FORMAT,
              no_index: fields.FID || fields.FINGERID,
              source_device_sn: sn,
              updated_at: new Date().toISOString()
            });
          } else {
            await db('biometric_templates').insert({
              tenant_id: tenant.tenant_id,
              type: 'fingerprint',
              template_data: tmpData,
              finger_index: fingerIdx,
              algorithm_ver: fields.ALGVER || fields.ALGORITHMVER || '10.0',
              major_ver: fields.MAJORVER || fields.MAJOR_VER,
              minor_ver: fields.MINORVER || fields.MINOR_VER,
              format: fields.FORMAT,
              no_index: fields.FID || fields.FINGERID,
              source_device_sn: sn,
              user_id: adminUserId
            });
          }
          count++;

        }
      }
      console.log(`[ADMS] Stored ${count} FPTMP fingerprint template(s) from device ${sn}`);
    }

  } catch (err) {
    console.error('[ADMS] Error processing data:', err.message);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\r\n');
});

// ADMS Get Request — device polls this for pending commands
app.all(/iclock\/getrequest/i, async (req, res) => {
  const { SN, sn: snLowerParam } = req.query;
  const sn = (SN || snLowerParam || req.headers['x-device-sn'] || req.headers['sn'] || '').trim();
  
  if (!sn) {
    return res.status(200).send('OK\r\n');
  }

  if (sn) {
    const snLower = sn.toLowerCase();
    await db('devices').whereRaw('LOWER(sn) = ?', [snLower]).update({ 
      adms_status: true,
      last_seen: new Date().toISOString()
    }).catch(() => {});
    
    // Check for pending command
    const cmd = await db('device_commands')
      .whereRaw('LOWER(device_sn) = ?', [snLower])
      .where('executed', false)
      .orderBy('id', 'asc')
      .first();
      
    if (cmd) {
      logADMS(req, `COMMAND FETCH - SN: ${sn} - Found Cmd ID: ${cmd.id} (${cmd.command})`);
      res.set('Content-Type', 'text/plain');
      // Format must be C:ID:COMMAND\r\n
      res.set('Content-Type', 'text/plain');
      return res.send(`C:${cmd.id}:${cmd.command}\n`);
    }
  }

  logADMS(req, `COMMAND POLL - SN: ${sn} - No commands`);
  res.set('Content-Type', 'text/plain');
  res.set('Content-Type', 'text/plain');
  res.send('OK\n');
});

// ADMS device info push
// ADMS Device Command Response — device confirms command execution
// ADMS Device Command Response — device confirms command execution
app.all(/iclock\/devicecmd/i, async (req, res) => {
  const { SN } = req.query;
  const sn = ((SN || req.query.sn || '')).trim();
  
  let cmdId = req.query.ID || req.query.id;
  let retCode = req.query.Return || req.query.return;

  if (req.body && typeof req.body === 'object') {
    if (req.body.ID) cmdId = req.body.ID;
    if (req.body.id) cmdId = req.body.id;
    if (req.body.Return !== undefined) retCode = req.body.Return;
    if (req.body.return !== undefined) retCode = req.body.return;
  }

  let rawBody = '';
  if (req.body) {
    if (typeof req.body === 'string') rawBody = req.body;
    else rawBody = JSON.stringify(req.body);
  }

  // Backup detection for Vercel: If body parser missed it, or if it's in query
  if (!cmdId && rawBody) {
    const match = rawBody.match(/ID=(\d+)/i);
    if (match) cmdId = match[1];
    const retMatch = rawBody.match(/Return=([-\d]+)/i);
    if (retMatch) retCode = retMatch[1];
  }

  logADMS(req, `COMMAND RESPONSE - SN: ${sn} - ID: ${cmdId} - Ret: ${retCode}`, rawBody || '(EMPTY BODY)');

  if (sn && cmdId) {
    const snLower = sn.toLowerCase();
    await db('device_commands').where('id', parseInt(cmdId)).update({ executed: true });
    console.log(`[ADMS] Command ID ${cmdId} marked SUCCESS for SN: ${sn}`);
  }

  // Parse FPTMP/BIODATA from command response
  try {
    const device = await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).first();
    const adminUserId = device ? device.user_id : null;

    if (rawBody.includes('FPTMP')) {
      const lines = rawBody.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim() || line.includes('FPTMP') || line.includes('Return=')) continue;
        
        const fields = {};
        line.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) fields[part.substring(0, eqIdx).trim().toUpperCase()] = part.substring(eqIdx + 1).trim();
        });

        const pin = fields.PIN;
        const tmpData = fields.TMP;
        const fingerIdx = parseInt(fields.FID) || 0;

        if (pin && tmpData) {
          let tenant = await db('tenants').where({ user_id: adminUserId })
            .where(builder => builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin))).first();
            
          if (tenant) {
            const existing = await db('biometric_templates').where({ tenant_id: tenant.tenant_id, type: 'fingerprint', finger_index: fingerIdx }).first();
            if (existing) {
              await db('biometric_templates').where('id', existing.id).update({ template_data: tmpData, updated_at: new Date().toISOString() });
            } else {
              await db('biometric_templates').insert({ tenant_id: tenant.tenant_id, type: 'fingerprint', template_data: tmpData, finger_index: fingerIdx, user_id: adminUserId, source_device_sn: sn });
            }
            count++;
          }
        }
      }
      if (count > 0) console.log(`[ADMS] Saved ${count} FPTMP templates from devicecmd`);
    }

    if (rawBody.includes('BIODATA')) {
      const lines = rawBody.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim() || line.includes('BIODATA') || line.includes('Return=')) continue;
        
        const fields = {};
        line.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) fields[part.substring(0, eqIdx).trim().toUpperCase()] = part.substring(eqIdx + 1).trim();
        });

        const pin = fields.PIN;
        const content = fields.CONTENT || fields.TMP || fields.DATA;
        const bioTypeNum = fields.TYPE || '0';
        const typeStr = bioTypeNum === '9' ? 'face' : (bioTypeNum === '8' ? 'palm' : 'face');

        if (pin && content) {
          let tenant = await db('tenants').where({ user_id: adminUserId })
            .where(builder => builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin))).first();
            
          if (tenant) {
            const existing = await db('biometric_templates').where({ tenant_id: tenant.tenant_id, type: typeStr, finger_index: 0 }).first();
            if (existing) {
              await db('biometric_templates').where('id', existing.id).update({ template_data: content, updated_at: new Date().toISOString() });
            } else {
              await db('biometric_templates').insert({ tenant_id: tenant.tenant_id, type: typeStr, template_data: content, finger_index: 0, user_id: adminUserId, source_device_sn: sn });
            }
            count++;
          }
        }
      }
      if (count > 0) console.log(`[ADMS] Saved ${count} BIODATA templates from devicecmd`);
    }
  } catch (err) {
    console.error('Error parsing devicecmd biometrics:', err);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\n');
});


// ==========================================
// ADMS Query Data Response — device sends DATA QUERY results here
// ==========================================
app.all(/iclock\/querydata/i, async (req, res) => {
  const { SN, sn: snLowerParam, table, cmdid } = req.query;
  const sn = SN || snLowerParam || req.headers['x-device-sn'];

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  logADMS(req, `QUERY RESPONSE - SN: ${sn} - Table: ${table} - CmdID: ${cmdid}`, rawBody);

  if (!sn) {
    res.set('Content-Type', 'text/plain');
    return res.status(200).send('OK\n');
  }

  try {
    const snLower = sn.toLowerCase();
    const device = await db('devices').whereRaw('LOWER(sn) = ?', [snLower]).first();
    const adminUserId = device ? device.user_id : null;

    // Mark the originating command as executed if cmdid is present
    if (cmdid) {
      await db('device_commands').where('id', parseInt(cmdid)).update({ executed: true }).catch(() => {});
      console.log(`[ADMS] QueryData: Command ID ${cmdid} marked SUCCESS for SN: ${sn}`);
    }

    // Parse USERINFO responses
    if (table === 'USERINFO' || table === 'user' || (rawBody && rawBody.includes('PIN='))) {
      const lines = rawBody.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim() || line.startsWith('USERINFO') || line.startsWith('user')) continue;
        const fields = {};
        line.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) fields[part.substring(0, eqIdx).trim().toUpperCase()] = part.substring(eqIdx + 1).trim();
        });

        const pin = fields.PIN;
        const name = fields.NAME || fields.Name || '';
        if (pin && adminUserId) {
          // Try to match to existing tenant
          let tenant = await db('tenants')
            .where({ user_id: adminUserId })
            .where(builder => builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin)))
            .first();

          if (tenant) {
            console.log(`[ADMS] QueryData: Matched user PIN=${pin} to tenant ${tenant.name}`);
          } else {
            console.log(`[ADMS] QueryData: Received user PIN=${pin} Name=${name} (no tenant match)`);
          }
          count++;
        }
      }
      console.log(`[ADMS] QueryData: Parsed ${count} USERINFO records from SN: ${sn}`);
    }

    // Parse BIODATA / FPTMP responses (fingerprint/face templates from device)
    if (rawBody && (rawBody.includes('TMP=') || rawBody.includes('CONTENT=') || rawBody.includes('Tmp='))) {
      const lines = rawBody.split('\n');
      let count = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const fields = {};
        line.split('\t').forEach(part => {
          const eqIdx = part.indexOf('=');
          if (eqIdx > 0) fields[part.substring(0, eqIdx).trim().toUpperCase()] = part.substring(eqIdx + 1).trim();
        });

        const pin = fields.PIN || fields.Pin;
        const tmpData = fields.TMP || fields.CONTENT || fields.DATA;
        const bioType = parseInt(fields.TYPE) || 0;
        const fingerIdx = parseInt(fields.FID || fields.INDEX || fields.FINGERID || '0') || 0;

        if (pin && tmpData && adminUserId) {
          const typeStr = bioType === 9 ? 'face' : (bioType === 8 ? 'palm' : 'fingerprint');

          let tenant = await db('tenants')
            .where({ user_id: adminUserId })
            .where(builder => builder.where('biometric_pin', pin).orWhere('tenant_id', isNaN(pin) ? -1 : Number(pin)))
            .first();

          if (tenant) {
            const existing = await db('biometric_templates')
              .where({ tenant_id: tenant.tenant_id, type: typeStr, finger_index: fingerIdx }).first();
            if (existing) {
              await db('biometric_templates').where('id', existing.id).update({
                template_data: tmpData, updated_at: new Date().toISOString()
              });
            } else {
              await db('biometric_templates').insert({
                tenant_id: tenant.tenant_id, type: typeStr, template_data: tmpData,
                finger_index: fingerIdx, user_id: adminUserId, source_device_sn: sn
              });
            }
            count++;
          }
        }
      }
      if (count > 0) console.log(`[ADMS] QueryData: Saved ${count} biometric templates from SN: ${sn}`);
    }

    // Parse device info/options (UserCount, FPCount, FaceCount, FirmVer, etc.)
    if (rawBody && (rawBody.includes('~SerialNumber') || rawBody.includes('FirmVer') || rawBody.includes('UserCount') || rawBody.includes('FPCount'))) {
      const infoFields = {};
      rawBody.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          infoFields[parts[0].trim().replace('~', '')] = parts.slice(1).join('=').trim();
        }
      });

      const updateData = {};
      if (infoFields.FirmVer) updateData.firmware_ver = infoFields.FirmVer;
      if (infoFields.Platform) updateData.platform = infoFields.Platform;
      if (infoFields.UserCount) updateData.user_count = parseInt(infoFields.UserCount) || 0;
      if (infoFields.FPCount) updateData.fp_count = parseInt(infoFields.FPCount) || 0;
      if (infoFields.FaceCount) updateData.face_count = parseInt(infoFields.FaceCount) || 0;
      if (infoFields.TransactionCount || infoFields.AttLogCount) updateData.att_log_count = parseInt(infoFields.TransactionCount || infoFields.AttLogCount) || 0;
      if (infoFields.UserCapacity) updateData.user_capacity = parseInt(infoFields.UserCapacity) || 0;
      if (infoFields.FPCapacity) updateData.fp_capacity = parseInt(infoFields.FPCapacity) || 0;
      if (infoFields.FaceCapacity) updateData.face_capacity = parseInt(infoFields.FaceCapacity) || 0;
      updateData.device_options_json = JSON.stringify(infoFields);
      updateData.info_updated_at = new Date().toISOString();

      if (Object.keys(updateData).length > 0 && device) {
        await db('devices').where('device_id', device.device_id).update(updateData).catch(err => {
          console.warn('[ADMS] Could not save device info (migration may not have run yet):', err.message);
        });
        console.log(`[ADMS] QueryData: Updated device info for SN: ${sn}`, JSON.stringify(updateData).substring(0, 200));
      }
    }
  } catch (err) {
    console.error('[ADMS] Error processing querydata:', err.message);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\n');
});

// Basic Health Check
app.get('/', (req, res) => {
  res.send('PGMS Backend is running');
});

// Admin Ticket Management
app.get('/api/admin/tickets', async (req, res) => {
  try {
    const tickets = await db('tickets')
      .join('tenants', 'tickets.tenant_id', 'tenants.tenant_id')
      .where('tickets.user_id', req.userId)
      .select('tickets.*', 'tenants.name as tenant_name', 'tenants.mobile as tenant_mobile')
      .orderBy('tickets.created_at', 'desc');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.put('/api/admin/tickets/:id', async (req, res) => {
  const { status, admin_notes } = req.body;
  try {
    await db('tickets').where({ id: req.params.id, user_id: req.userId }).update({
      status,
      admin_notes,
      updated_at: db.fn.now()
    });
    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

app.post('/api/admin/generate-billing', async (req, res) => {
  try {
    const results = await generateMonthlyBills(req.userId);
    res.json({ success: true, message: `Generated ${results} billing records.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate bills' });
  }
});

async function generateMonthlyBills(userId) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  
  const tenants = await db('tenants')
    .join('beds', 'tenants.bed_id', 'beds.bed_id')
    .where('tenants.status', 'Staying')
    .where('tenants.user_id', userId)
    .select('tenants.*', 'beds.bed_cost');

  let count = 0;
  for (const t of tenants) {
    const existing = await db('billing').where({ tenant_id: t.tenant_id, month, year }).first();
    if (!existing) {
      // Get previous balance from last month's billing record
      const prevMonth = monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1];
      const prevYear = now.getMonth() === 0 ? year - 1 : year;
      const lastBill = await db('billing').where({ tenant_id: t.tenant_id, month: prevMonth, year: prevYear }).first();
      
      const prevBalance = lastBill ? lastBill.current_balance : 0;
      const totalDue = t.bed_cost + prevBalance;
      
      // Auto-lock access if balance is high (e.g. more than 1 month rent)
      const accessStatus = totalDue > t.bed_cost ? 'locked' : 'active';
      await db('tenants').where('tenant_id', t.tenant_id).update({ access_status: accessStatus });

      await db('billing').insert({
        tenant_id: t.tenant_id,
        user_id: userId,
        month,
        year,
        fixed_rent: t.bed_cost,
        previous_balance: prevBalance,
        total_due: totalDue,
        amount_paid: 0,
        current_balance: totalDue,
        due_date: new Date(year, now.getMonth(), 5).toISOString().split('T')[0], // 5th of the month
        status: 'Unpaid'
      });
      count++;
    }
  }
  return count;
}

app.post('/api/tenants/:id/set-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  
  try {
    const hashedPassword = await bcrypt.hash(pin.toString(), 10);
    await db('tenants').where({ tenant_id: req.params.id, user_id: req.userId }).update({
      password_hash: hashedPassword,
      biometric_pin: pin
    });
    
    // Sync to biometric hardware too
    await syncTenantAccess(req.params.id);
    
    res.json({ success: true, message: 'Mobile access enabled/updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

// Export functions for cron jobs
app.enforceInactivityRules = enforceInactivityRules;
app.checkPaymentStatusAndEnforceAccess = checkPaymentStatusAndEnforceAccess;

// Only start the server if this file is run directly
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  server.on('close', () => {
    console.log('Server closed');
  });
}

module.exports = app;

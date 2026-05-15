const db = require('../../../config/database');
const { logADMS } = require('../../../middleware/requestLogger');
const admsService = require('./adms.service');

// /iclock/cdata — device pushes attendance, user, and biometric data
const handleCData = async (req, res) => {
  const { SN, sn: snLower, table } = req.query;
  const sn = (SN || snLower || req.headers['x-device-sn'] || req.headers['sn'] || '').trim();

  let rawBody = '';
  if (req.body) {
    rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  if (sn) {
    const snLc = sn.toLowerCase();
    await db('devices').whereRaw('LOWER(sn) = ?', [snLc]).update({
      adms_status: true, last_seen: new Date().toISOString()
    }).catch(() => {});
  }

  logADMS(req, `PUSH DATA - SN: ${sn} - Table: ${table}`, rawBody ? rawBody.substring(0, 300) : '');

  try {
    const device = sn ? await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).first() : null;

    // ATTLOG — attendance records
    if (table === 'ATTLOG' || (!table && rawBody && !rawBody.includes('OPERLOG') && !rawBody.includes('BIODATA') && !rawBody.includes('FPTMP'))) {
      const count = await admsService.processAttendanceLogs(sn, rawBody, device);
      console.log(`[ADMS] Saved ${count} attendance records from ${sn}`);
    }
    // OPERLOG — user info & embedded biometric templates
    else if (table === 'OPERLOG' || (rawBody && rawBody.includes('OPERLOG'))) {
      const count = await admsService.processUserInfo(sn, rawBody, device);
      console.log(`[ADMS] Processed ${count} user records from ${sn}`);
    }
    // BIODATA
    else if (table === 'BIODATA' || (rawBody && rawBody.includes('BIODATA'))) {
      const count = await admsService.processBioData(sn, rawBody, device, 'BIODATA');
      console.log(`[ADMS] Stored ${count} BIODATA template(s) from device ${sn}`);
    }
    // FPTMP — fingerprint templates
    else if (table === 'FPTMP' || (rawBody && rawBody.includes('FPTMP'))) {
      const count = await admsService.processBioData(sn, rawBody, device, 'FPTMP');
      console.log(`[ADMS] Stored ${count} FPTMP fingerprint template(s) from device ${sn}`);
    }
    // PHOTO
    else if (rawBody && (rawBody.includes('CMD=PIC') || rawBody.includes('FileName='))) {
      console.log(`[ADMS] Received photo update/data from device ${sn}`);
    }
  } catch (err) {
    console.error('[ADMS] Error processing data:', err.message);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\r\n');
};

// /iclock/getrequest — device polls for pending commands
const handleGetRequest = async (req, res) => {
  const { SN, sn: snLowerParam } = req.query;
  const sn = (SN || snLowerParam || req.headers['x-device-sn'] || req.headers['sn'] || '').trim();

  if (!sn) return res.status(200).send('OK\r\n');

  const snLower = sn.toLowerCase();
  const updated = await db('devices').whereRaw('LOWER(sn) = ?', [snLower]).update({
    adms_status: true, last_seen: new Date().toISOString()
  }).catch(() => 0);

  if (!updated) {
    console.log(`[ADMS] getrequest SN not found in DB: "${sn}"`);
    await db('unknown_device_logs').insert({
      sn, path: req.path, headers: JSON.stringify(req.headers),
      query: JSON.stringify(req.query), created_at: new Date().toISOString()
    }).catch(err => console.error('[DB] Failed to log unknown poll:', err.message));
  }

  const cmd = await db('device_commands')
    .whereRaw('LOWER(device_sn) = ?', [snLower])
    .where('executed', false)
    .andWhere(function() { this.where('attempts', '<', 10).orWhereNull('attempts'); })
    .orderBy('id', 'asc')
    .first();

  if (cmd) {
    await db('device_commands').where('id', cmd.id).update({
      attempts: (cmd.attempts || 0) + 1,
      last_fetched_at: new Date().toISOString()
    }).catch(() => {});

    if (cmd.command === 'REBOOT' || cmd.command === 'CLEAR LOG' || cmd.command.includes('UNBUND')) {
      await db('device_commands').where('id', cmd.id).update({ executed: true }).catch(() => {});
      console.log(`[ADMS] [AUTO-CONFIRM] SN: ${sn} - Command: ${cmd.command} (ID: ${cmd.id})`);
    }
    return res.send(`C:${cmd.id}:${cmd.command}\r\n`);
  }

  logADMS(req, `COMMAND POLL - SN: ${sn} - No commands`);
  res.set('Content-Type', 'text/plain');
  res.send('OK\r\n');
};

// /iclock/devicecmd — device confirms command execution
const handleDeviceCmd = async (req, res) => {
  const { SN } = req.query;
  const sn = (SN || req.query.sn || '').trim();
  let cmdId = req.query.ID || req.query.id;
  let retCode = req.query.Return || req.query.return;

  if (req.body && typeof req.body === 'object') {
    if (req.body.ID) cmdId = req.body.ID;
    if (req.body.id) cmdId = req.body.id;
    if (req.body.Return !== undefined) retCode = req.body.Return;
    if (req.body.return !== undefined) retCode = req.body.return;
  }

  let rawBody = '';
  if (req.body) { rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body); }

  if (!cmdId && rawBody) {
    const match = rawBody.match(/ID=(\d+)/i);
    if (match) cmdId = match[1];
    const retMatch = rawBody.match(/Return=([-\d]+)/i);
    if (retMatch) retCode = retMatch[1];
  }

  logADMS(req, `COMMAND RESPONSE - SN: ${sn} - ID: ${cmdId} - Ret: ${retCode}`, rawBody || '(EMPTY BODY)');

  if (sn && cmdId) {
    await db('device_commands').where('id', parseInt(cmdId)).update({ executed: true });
    console.log(`[ADMS] Command ID ${cmdId} marked SUCCESS for SN: ${sn}`);
  }

  // Parse biometric templates from command response
  try {
    const device = await db('devices').whereRaw('LOWER(sn) = ?', [sn.toLowerCase()]).first();
    if (rawBody.includes('FPTMP')) {
      const count = await admsService.processBioData(sn, rawBody, device, 'FPTMP');
      if (count > 0) console.log(`[ADMS] Saved ${count} FPTMP templates from devicecmd`);
    }
    if (rawBody.includes('BIODATA')) {
      const count = await admsService.processBioData(sn, rawBody, device, 'BIODATA');
      if (count > 0) console.log(`[ADMS] Saved ${count} BIODATA templates from devicecmd`);
    }
  } catch (err) {
    console.error('Error parsing devicecmd biometrics:', err);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\r\n');
};

// /iclock/querydata — device sends query results
const handleQueryData = async (req, res) => {
  const { SN, sn: snLowerParam, table, cmdid } = req.query;
  const sn = SN || snLowerParam || req.headers['x-device-sn'];
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  logADMS(req, `QUERY RESPONSE - SN: ${sn} - Table: ${table} - CmdID: ${cmdid}`, rawBody);

  if (!sn) { res.set('Content-Type', 'text/plain'); return res.status(200).send('OK\n'); }

  try {
    const snLower = sn.toLowerCase();
    const device = await db('devices').whereRaw('LOWER(sn) = ?', [snLower]).first();

    if (cmdid) {
      await db('device_commands').where('id', parseInt(cmdid)).update({ executed: true }).catch(() => {});
    }

    // Parse USERINFO
    if (table === 'USERINFO' || table === 'user' || (rawBody && rawBody.includes('PIN='))) {
      await admsService.processUserInfo(sn, rawBody, device);
    }

    // Parse biometric templates
    if (rawBody && (rawBody.includes('TMP=') || rawBody.includes('CONTENT=') || rawBody.includes('Tmp='))) {
      const count = await admsService.processBioData(sn, rawBody, device, null);
      if (count > 0) console.log(`[ADMS] QueryData: Saved ${count} biometric templates from SN: ${sn}`);
    }

    // Parse device info
    if (rawBody && (rawBody.includes('~SerialNumber') || rawBody.includes('FirmVer') || rawBody.includes('UserCount') || rawBody.includes('FPCount'))) {
      await admsService.processDeviceInfo(sn, rawBody, device);
    }
  } catch (err) {
    console.error('[ADMS] Error processing querydata:', err.message);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK\r\n');
};

module.exports = { handleCData, handleGetRequest, handleDeviceCmd, handleQueryData };

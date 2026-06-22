const service = require('./devices.service');

exports.list = async (req, res, next) => { try { res.json(await service.getAll(req.userId)); } catch(e){next(e);} };
exports.create = async (req, res, next) => { try { const id = await service.create(req.body, req.userId); res.json({ device_id: id, message: 'Device registered' }); } catch(e){next(e);} };
exports.update = async (req, res, next) => { try { const d = await service.update(req.params.id, req.body, req.userId); res.json(d); } catch(e){next(e);} };
exports.remove = async (req, res, next) => { try { await service.remove(req.params.id, req.userId); res.json({ message: 'Device removed' }); } catch(e){next(e);} };
exports.getSyncHistory = async (req, res, next) => { try { res.json(await service.getSyncHistory(req.userId)); } catch(e){next(e);} };

exports.testConnection = async (req, res, next) => {
  try {
    const db = require('../../config/database');
    const device = await db('devices').where({ device_id: req.params.id, user_id: req.userId }).first();
    
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    if (device.adms_status) {
       // Check last_seen
       const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
       const now = new Date();
       const diffMinutes = lastSeen ? (now - lastSeen) / 1000 / 60 : null;
       
       if (lastSeen && diffMinutes < 15) {
         return res.json({ status: 'online', message: `Connected via ADMS (Last seen ${Math.floor(diffMinutes)} mins ago)` });
       } else {
         return res.status(400).json({ error: `No recent ADMS heartbeat. Last seen: ${lastSeen ? lastSeen.toLocaleString() : 'Never'}` });
       }
    } else {
       // Try direct network connection
       const net = require('net');
       const client = new net.Socket();
       client.setTimeout(2000); // 2 second timeout
       
       client.connect(device.port || 4370, device.ip_address, () => {
         client.destroy();
         res.json({ status: 'online', message: `Device reachable on local network (${device.ip_address}:${device.port})` });
       });
       
       client.on('error', () => {
         client.destroy();
         if (!res.headersSent) res.status(400).json({ error: `Device unreachable on network (${device.ip_address}:${device.port})` });
       });
       
       client.on('timeout', () => {
         client.destroy();
         if (!res.headersSent) res.status(400).json({ error: 'Connection timed out. Check IP and port.' });
       });
    }
  } catch(e) {
    next(e);
  }
};

exports.syncUser = async (req, res, next) => {
  try { const t = await service.syncUser(req.body.sn, req.body.tenant_id, req.userId, req.body.is_staff); res.json({ message: `Sync queued for ${t.name}` }); } catch(e){next(e);}
};

exports.bulkSync = async (req, res, next) => {
  try {
    const { tenant_ids } = req.body;
    const count = await service.bulkSync(tenant_ids, req.userId);
    res.json({ message: `Sync queued for ${count} tenants successfully` });
  } catch (e) {
    next(e);
  }
};

exports.control = async (req, res, next) => {
  try {
    const sn = req.params.sn;
    const { command } = req.body;
    if (!sn || !command) return res.status(400).json({ error: 'SN and command required' });
    await service.queueCommand(sn, command, req.userId);
    res.json({ message: 'Command queued' });
  } catch(e){next(e);}
};

exports.broadcastTemplates = async (req, res, next) => {
  try {
    await service.broadcastTemplates(req.params.sn, req.userId);
    res.json({ message: 'Biometric broadcast queued' });
  } catch(e){next(e);}
};

exports.getCommands = async (req, res, next) => {
  try { res.json(await service.getCommands(req.params.sn, req.userId)); } catch(e){next(e);}
};

exports.reboot = async (req, res, next) => { try { await service.queueCommand(req.params.sn, 'REBOOT', req.userId); res.json({ message: 'Reboot queued' }); } catch(e){next(e);} };
exports.clearLogs = async (req, res, next) => { try { await service.queueCommand(req.params.sn, 'CLEAR LOG', req.userId); res.json({ message: 'Clear logs queued' }); } catch(e){next(e);} };
exports.syncTime = async (req, res, next) => { try { const now = new Date().toISOString().replace('T',' ').substring(0,19); await service.queueCommand(req.params.sn, `SET OPTION ServerTime=${now}`, req.userId); res.json({ message: 'Time sync queued' }); } catch(e){next(e);} };
exports.downloadUsers = async (req, res, next) => { try { await service.downloadUsers(req.params.sn, req.userId); res.json({ message: 'Download users command queued' }); } catch(e){next(e);} };
exports.syncHistory = async (req, res, next) => { try { await service.syncHistory(req.params.sn, req.userId); res.json({ message: 'Sync history queued' }); } catch(e){next(e);} };
exports.queryInfo = async (req, res, next) => { try { await service.queryInfo(req.params.sn, req.userId); res.json({ message: 'Device info query queued' }); } catch(e){next(e);} };

exports.deleteUser = async (req, res, next) => {
  try {
    const { sn, pin } = req.body;
    if (!sn || !pin) return res.status(400).json({ error: 'SN and PIN required' });
    await service.queueCommand(sn, `DATA DELETE USERINFO PIN=${pin}`, req.userId);
    res.json({ message: `Delete user PIN=${pin} queued` });
  } catch(e){next(e);}
};

exports.clearAllData = async (req, res, next) => {
  try { await service.queueCommand(req.params.sn, 'CLEAR DATA', req.userId); res.json({ message: 'Clear all data queued' }); } catch(e){next(e);}
};

exports.setOptions = async (req, res, next) => {
  try {
    const { sn, options } = req.body;
    if (!sn || !options) return res.status(400).json({ error: 'SN and options required' });
    await service.queueCommand(sn, `SET OPTION ${options}`, req.userId);
    res.json({ message: 'Set options queued' });
  } catch(e){next(e);}
};

exports.unknownPolls = async (req, res, next) => {
  try {
    const db = require('../../config/database');
    const logs = await db('unregistered_devices').orderBy('created_at', 'desc').limit(50);
    res.json(logs);
  } catch(e){ res.status(500).json({ error: 'Failed to fetch logs' }); }
};

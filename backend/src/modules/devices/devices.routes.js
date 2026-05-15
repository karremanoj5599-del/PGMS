const router = require('express').Router();
const c = require('./devices.controller');

router.get('/', c.list);
router.post('/', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/sync-user', c.syncUser);
router.post('/control', c.control);
router.get('/:sn/commands', c.getCommands);
router.post('/:sn/reboot', c.reboot);
router.post('/:sn/clear-logs', c.clearLogs);
router.post('/:sn/sync-time', c.syncTime);
router.post('/:sn/download-users', c.downloadUsers);
router.post('/:sn/sync-history', c.syncHistory);
router.post('/:sn/query-info', c.queryInfo);
router.post('/delete-user', c.deleteUser);
router.post('/:sn/clear-all-data', c.clearAllData);
router.post('/set-options', c.setOptions);

module.exports = router;

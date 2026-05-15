// ADMS protocol routes — mounted directly on the app (not router)
// These use regex patterns because device firmware sends mixed-case URLs
const controller = require('./adms.controller');

module.exports = (app) => {
  app.all(/iclock\/cdata/i, controller.handleCData);
  app.all(/iclock\/getrequest/i, controller.handleGetRequest);
  app.all(/iclock\/devicecmd/i, controller.handleDeviceCmd);
  app.all(/iclock\/querydata/i, controller.handleQueryData);
};

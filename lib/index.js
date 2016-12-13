'use strict';

// Load modules

const Consulite = require('consulite');
const Hoek = require('hoek');
const Items = require('items');
const OrPromise = require('or-promise');
const EventEmitter = require('events');
const myEmitter = new EventEmitter();


// Declare internals

const internals = {
  services: []
};


module.exports = function (service) {
  Hoek.assert(internals.services.indexOf(service) !== -1, `${service} isn't configured as a backend`);

  return Consulite.getCachedService(service);
};


module.exports.config = function (config, callback) {
  Hoek.assert(config && typeof config === 'object', 'Config must exist and be an object');
  Hoek.assert(config.backends && config.backends.length, 'Config must contain backends');
  callback = callback || OrPromise();
  config = internals.template(config);

  Consulite.config({ consul: config.consul });

  internals.services = config.backends.map((backend) => {
    return backend.name;
  });

  Items.parallel(internals.services, (service, next) => {
    Consulite.getService(service, next);
  }, callback);

  return callback.promise;
};

internals.template = function (obj) {
  const str = JSON.stringify(obj);
  const templated = str.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (match, capture) => {
    return process.env[capture] || match;
  });
  return JSON.parse(templated);
};

process.on('SIGHUP', () => {
  // Don't refresh if we are currently refreshing the services
  if (internals.refreshing) {
    return;
  }

  internals.refreshing = true;

  // Services list shouldn't be large, therefore we will make multiple
  // requests at once to consul to refresh them
  Items.parallel(internals.services, (service, next) => {
    Consulite.refreshService(service, next);
  }, () => {
    internals.refreshing = false;
    myEmitter.emit('refresh');
  });
});

module.exports.on = function () {
  myEmitter.on.apply(myEmitter, arguments);
};
module.exports.once = function () {
  myEmitter.once.apply(myEmitter, arguments);
};
module.exports.removeListener = function () {
  myEmitter.once.removeListener(myEmitter, arguments);
};
module.exports.removeAllListener = function () {
  myEmitter.once.removeAllListener(myEmitter, arguments);
};
module.exports.addListener = function () {
  myEmitter.on.addListener(myEmitter, arguments);
};

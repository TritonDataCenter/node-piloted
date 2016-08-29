'use strict';

// Load modules

const Consulite = require('consulite');
const Hoek = require('hoek');
const Items = require('items');


// Declare internals

const internals = {};


module.exports = function (service) {
  Hoek.assert(internals.services.indexOf(service) !== -1, `${service} isn't configured as a backend`);

  return Consulite.getCachedService(service);
};


module.exports.config = function (config, callback) {
  Hoek.assert(config && typeof config === 'object', 'Config must exist and be an object');
  Hoek.assert(config.backends && config.backends.length, 'Config must contain backends');

  Consulite.config({ consul: config.consul });

  internals.services = config.backends.map((backend) => {
    return backend.name;
  });

  Items.parallel(internals.services, (service, next) => {
    Consulite.getService(service, next);
  }, callback);
};


process.on('SIGHUP', () => {
  // Only refresh services if we have any to refresh
  if (!internals.services || internals.services.length) {
    return;
  }

  // Don't refresh if we are currently refreshing the services
  if (internals.refreshing) {
    return;
  }

  internals.refreshing = true;

  // Services list shouldn't be large, therefore we will make multiple
  // requests at once to consul to refresh them
  Items.parallel(internals.services, (service, next) => {
    Consulite.refreshService(service, (err) => {
      if (err) {
        console.error(err);
      }

      next();
    });
  }, () => {
    internals.refreshing = false;
  });
});

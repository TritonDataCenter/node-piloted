'use strict';

// Load modules

const Consulite = require('consulite');
const Hoek = require('hoek');
const Items = require('items');


// Declare internals

const internals = {};


module.exports = function (service) {
  Hoek.assert(internals.services.indexOf(service) !== -1, `${service} isn't configured as a known service`);
};


module.exports.config = function (config, callback) {
  Hoek.assert(config && typeof config === 'object', 'Config must exist and be an object');
  callback = callback || Hoek.ignore;

  if (config.consul) {
    Consulite.config(config.consul);
  }

  if (!config.backends && !config.backends.length) {
    return;
  }

  internals.services = config.backends.map((backend) => {
    return backend.name;
  });

  Items.parallel(internals.services, (service, next) => {
    Consulite.getService(service, (err) => {
      if (err) {
        console.error(err);
      }

      next();
    });
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

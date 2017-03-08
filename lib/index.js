'use strict';

// Load modules

const Fs = require('fs');
const Consulite = require('consulite');
const Hoek = require('hoek');
const Items = require('items');
const OrPromise = require('or-promise');
const EventEmitter = require('events');


// Declare internals

const internals = {};


class Piloted extends EventEmitter {
  constructor () {
    super();
    this._services = [];
    this._config = {};
  }

  config (config, callback) {
    Hoek.assert(config && (typeof config === 'object' || typeof config === 'string'),
      'Config must exist and be an object or a string');

    callback = callback || OrPromise();

    this._config = internals.template(config);
    Hoek.assert(this._config.backends && this._config.backends.length, 'Config must contain backends');

    Consulite.config({ consul: this._config.consul });

    this._services = this._config.backends.map((backend) => {
      return backend.name;
    });

    Items.parallel(this._services, (service, next) => {
      Consulite.getService(service, next);
    }, callback);

    return callback.promise;
  }

  service (service) {
    Hoek.assert(this._services.indexOf(service) !== -1, `${service} isn't configured as a backend`);

    return Consulite.getCachedService(service);
  }

  serviceHosts (service) {
    Hoek.assert(this._services.indexOf(service) !== -1, `${service} isn't configured as a backend`);

    return Consulite.getCachedServiceHosts(service);
  }

  refresh () {
    if (this._refreshing) {
      return;
    }

    // Services list shouldn't be large, therefore we will make multiple
    // requests at once to consul to refresh them
    this._refreshing = true;
    Items.parallel(this._services, (service, next) => {
      Consulite.refreshService(service, next);
    }, () => {
      this.emit('refresh');
      this._refreshing = false;
    });
  }
}

module.exports = new Piloted();

process.on('SIGHUP', () => {
  module.exports.refresh();
});


internals.containerPilotConfig = function (config) {
  if (config.indexOf('file://') === 0) {
    config = Fs.readFileSync(config.substr(6)).toString();
  }

  module.exports.config(config, () => {});
};

internals.template = function (config) {
  const str = (typeof config === 'string') ? config : JSON.stringify(config);
  const templated = str.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (match, capture) => {
    return process.env[capture] || match;
  });
  return JSON.parse(templated);
};


if (process.env.CONTAINERPILOT) {
  internals.containerPilotConfig(process.env.CONTAINERPILOT);
}

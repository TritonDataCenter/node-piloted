# piloted
Service discovery in node using [ContainerPilot](https://www.joyent.com/containerpilot)

[![Npm Version](https://img.shields.io/npm/v/piloted.svg)](https://npmjs.com/package/piloted)
[![Node Version](https://img.shields.io/node/v/piloted.svg)](https://npmjs.com/package/piloted)
[![Build Status](https://secure.travis-ci.org/joyent/node-piloted.svg)](http://travis-ci.org/joyent/node-piloted)


### Usage Example

```js
const Piloted = require('piloted');
const Wreck = require('wreck');
const ContainerPilot = require('./containerpilot.json');


Piloted.config(ContainerPilot, (err) => {
  // handle error if there is one

  const service = Piloted('customers');
  Wreck.get(`http://${service.address}:${service.port}/?q=steven`, (err, res, payload) => {
    // handle error or process the payload of customer data
  });
});
```

A cache is maintained by piloted and will be refreshed anytime ContainerPilot sends
a SIGHUP to the process. This will occur when there is a service change to a
backend that your service depends on.

### API

#### config(config [, callback])

Pass the `containerpilot.json` file as a parsed object. The properties that are
used by _piloted_ are `consul` and `backends`. These will be used to connect to
the consul server and will maintain a cache of the backends that your service
cares about.

* `config` - configuration object with `consul` and `backends` properties. `consul` can
  be omitted and the values will be pulled from the environment variables:
  - `CONSUL_HOST`
  - `CONSUL_PORT`
* `callback` - function to be executed after the initial cache of service data has
been loaded. The function signature is `(err)`

If a `callback` is omitted, a `Promise` will be returned.


#### (name)

Returns an object (`{ address, port }`) for the named service. If multiple instances
of a service exist then the first one that hasn't been executed or the oldest instance
to be executed will be returned.

Example:

```js
const service = Piloted('my-service');
```

### Templating

Piloted will template your configuration file, similar to the way that
[ContainerPilot](https://www.joyent.com/containerpilot/docs/configuration)
does. If you have an environment variable such as `FOO=BAR` then you can use
`{{.FOO}}` in your configuration file and it will be substituted with `BAR`.

### Events
`Piloted` implements the [events](https://nodejs.org/docs/latest/api/events.html) interface. Specifically, if you need to know when the data has been updated, you can listen for the `refresh` event:

```js
Piloted.on('refresh',function () {
  // update anything that needs to be done
});
```

A common use case is long-lived connections, e.g. database connections:

```js
Piloted(config, (err) => {
  const service = Piloted('db');
  var db = createDbConnectionWithFavouriteDriver(service.address, services.port);
  Piloted.on('refresh',function () {
    // update anything that needs to be done
    db.release();
    db.connect(service.address, service.port);
  });
});
```

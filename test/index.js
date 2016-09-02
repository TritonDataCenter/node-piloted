'use strict';

// Load modules

const Http = require('http');
const Code = require('code');
const Lab = require('lab');
const Piloted = require('..');


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

it('can be required', (done) => {
  expect(Piloted).to.exist();
  done();
});

describe('config()', () => {
  it('loads the configuration into piloted and piloted can retrieve the cached information', (done) => {
    const server = Http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { Service: { Address: 'nginx1.com', Port: '1234' } },
        { Service: { Address: 'nginx2.com', Port: '1234' } }
      ]));
    });

    server.listen(0, () => {
      const config = {
        consul: `localhost:${server.address().port}`,
        backends: [
          {
            name: 'nginx'
          },
          {
            name: 'app'
          }
        ]
      };

      Piloted.config(config, () => {
        expect(Piloted('nginx').port).to.equal('1234');

        // will resolve a returned promise in absence of callback
        Piloted.config(config).then(() => {
          expect(Piloted('nginx').port).to.equal('1234');
          done();
        });
      });
    });
  });

  it('throws if the configuration is undefined', (done) => {
    try {
      Piloted.config();
    } catch (ex) {
      expect(ex).to.exist();
      done();
    }
  });

  it('throws if the configuration is missing backends', (done) => {
    const config = {
      consul: 'consul:8500'
    };

    try {
      Piloted.config(config);
    } catch (ex) {
      expect(ex).to.exist();
      done();
    }
  });

  it('returns an error on the callback if consul returns one', (done) => {
    const server = Http.createServer((req, res) => {
      res.writeHead(500);
      res.end();
    });

    server.listen(0, () => {
      const config = {
        consul: `localhost:${server.address().port}`,
        backends: [
          {
            name: 'backend'
          }
        ]
      };

      Piloted.config(config, (err) => {
        expect(err).to.exist();

        // will reject a returned promise in absence of callback
        Piloted.config(config).catch((err) => {
          expect(err).to.exist();
          done();
        });
      });
    });
  });
});


describe('Piloted()', () => {
  it('throws if the backend service isn\'t configured', (done) => {
    try {
      Piloted('notknown');
    } catch (ex) {
      expect(ex).to.exist();
      done();
    }
  });
});

describe('SIGHUP', () => {
  it('triggers a refresh of the service cache and updates it from consul', (done) => {
    let ct = 0;
    const results = [
      [
        { Service: { Address: 'node1.com', Port: '1234' } },
        { Service: { Address: 'node2.com', Port: '1234' } }
      ],
      [
        { Service: { Address: 'node3.com', Port: '5678' } },
        { Service: { Address: 'node4.com', Port: '5678' } }
      ]
    ];

    const server = Http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results[ct]));
      ct++;
    });

    server.listen(0, () => {
      const config = {
        consul: `localhost:${server.address().port}`,
        backends: [
          {
            name: 'node'
          }
        ]
      };

      Piloted.config(config, (err) => {
        expect(err).to.not.exist();
        expect(Piloted('node').port).to.equal('1234');
        process.emit('SIGHUP');
        process.emit('SIGHUP');
        setTimeout(() => {
          expect(Piloted('node').port).to.equal('5678');
          done();
        }, 200);
      });
    });
  });

  it('won\'t try to refresh if there aren\'t services configured', (done) => {
    process.emit('SIGHUP');
    setTimeout(() => {
      try {
        Piloted('notknown');
      } catch (ex) {
        expect(ex).to.exist();
        done();
      }
    }, 200);
  });
});

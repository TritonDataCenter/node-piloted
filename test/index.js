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
        done();
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
        done();
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

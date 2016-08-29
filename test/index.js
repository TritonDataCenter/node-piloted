'use strict';

// Load modules

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
  it('loads the configuration into piloted', (done) => {
    const config = {
      consul: 'consul:8500',
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
      expect(Piloted('nginx')).to.exist();
      done();
    });
  });
});

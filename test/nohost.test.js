'use strict';
const code = require('code');
const Hapi = require('hapi');
const lab = exports.lab = require('lab').script();


lab.describe('.sendEmail', { timeout: 5000 }, () => {
  lab.it('requires a host param', async() => {
    const server = new Hapi.Server({
      debug: {
        log: 'hapi-micro-mail'
      },
      port: 8000
    });
    try {
      await server.register({
        plugin: require('../'),
        options: {
          apiKey: 'ksjdf',
          verbose: true
        }
      });
    } catch (err) {
      code.expect(err.toString()).to.include('You must specify a micro-mail host');
      await server.stop();
    }
  });
});

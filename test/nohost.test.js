'use strict';
const code = require('code');
const Hapi = require('hapi');
const lab = exports.lab = require('lab').script();


lab.describe('.sendEmail', { timeout: 5000 }, () => {
  lab.it('requires a host param', (done) => {
    const server = new Hapi.Server({
      debug: {
        log: 'hapi-micro-mail'
      }
    });
    server.connection({ port: 8000 });
    server.register({
      register: require('../'),
      options: {
        apiKey: 'ksjdf',
        verbose: true
      }
    }, (err) => {
      code.expect(err).to.include('You must specify a micro-mail host');
      done();
    });
  });
});

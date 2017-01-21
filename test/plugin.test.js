'use strict';
const code = require('code');
const Hapi = require('hapi');
const lab = exports.lab = require('lab').script();

let server;
let microMailServer;

lab.afterEach((done) => {
  microMailServer.stop(done);
});

lab.beforeEach((done) => {
  server = new Hapi.Server({
    debug: {
      log: 'hapi-micro-mail'
    }
  });
  server.connection({ port: 8000 });
  server.register({
    register: require('../'),
    options: {
      host: 'http://localhost:8080',
      verbose: true
    }
  }, () => {
    microMailServer = new Hapi.Server({});
    microMailServer.connection({ port: 8080 });
    microMailServer.start(done);
  });
});
// these tests assume you have a micro-mail server running at localhost:8080:
lab.describe('.sendEmail', { timeout: 5000 }, () => {
  lab.it('can send invalid params to a micro-mail server and get an error response', (done) => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, reply) => {
        code.expect(request.payload.from).to.equal('emal@example.com');
        return reply({
          status: 'error',
          message: 'Validation error',
          result: '"to" is required'
        }).code(500);
      }
    });
    const badParams = {
      from: 'emal@example.com',
      subject: 'This is a subject',
      text: 'Hello there email text'
    };
    server.sendEmail(badParams, (res) => {
      code.expect(res.result).to.equal('"to" is required');
      code.expect(res.status).to.equal('error');
      done();
    });
  });

  lab.it('can send an email to a micro-mail server', (done) => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, reply) => {
        code.expect(request.payload.from).to.equal('me@me.com');
        code.expect(request.payload.to).to.equal('you@you.com');
        code.expect(request.payload.subject).to.equal('this is the subject of an email I am sending to you');
        code.expect(request.payload.text).to.equal('This is the text of the email I am sending to you!');
        return reply({ status: 'ok' });
      }
    });
    server.sendEmail({
      from: 'me@me.com',
      to: 'you@you.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    }, (res) => {
      code.expect(res.status).to.equal('ok');
      done();
    });
  });

  lab.it('can send an email to a micro-mail server without providing a callback', (done) => {
    server.sendEmail({
      from: 'me@me.com',
      to: 'you@you.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    });
    setTimeout(done, 2000);
  });
});

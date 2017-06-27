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
      apiKey: 'jksdf',
      verbose: true
    }
  }, () => {
    microMailServer = new Hapi.Server({});
    microMailServer.connection({ port: 8080 });
    microMailServer.start(done);
  });
});

lab.describe('.sendEmail', { timeout: 5000 }, () => {
  lab.it('can handle an HTTP error response from the micro-mail server', (done) => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, reply) => {
        code.expect(request.payload.from).to.equal('emal@example.com');
        return reply({
          error: 'Bad Request',
          message: 'Validation error',
          result: '"to" is required'
        }).code(400);
      }
    });
    const badParams = {
      from: 'emal@example.com',
      subject: 'This is a subject',
      text: 'Hello there email text'
    };
    server.sendEmail(badParams, (err) => {
      code.expect(err).to.not.equal(null);
      code.expect(err.isBoom).to.equal(true);
      code.expect(err.data.error).to.equal('Bad Request');
      done();
    });
  });
  lab.it('can handle a micro-mail server SMTP error', (done) => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, reply) => reply({
        status: 'error',
        message: 'Boo',
        result: {
          accepted: [],
          rejected: ['nobody@nowhere.com'],
          response: '502 Command not implemented'
        }
      })
    });
    const badParams = {
      from: 'emal@example.com',
      to: 'nobody@nowhere.com',
      subject: 'This is a subject',
      text: 'Hello there email text'
    };
    server.sendEmail(badParams, (err) => {
      code.expect(err).to.not.equal(null);
      code.expect(err.status).to.equal('error');
      code.expect(err.message).to.equal('Boo');
      code.expect(err.result.response).to.equal('502 Command not implemented');
      code.expect(err.result.rejected.length).to.equal(1);
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
        return reply({
          status: 'ok',
          message: 'Email delivered',
          result: {
            response: '250 Message queued',
            accepted: [request.payload.to]
          }
        });
      }
    });
    server.sendEmail({
      from: 'me@me.com',
      to: 'you@you.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    }, (err, res) => {
      code.expect(err).to.equal(null);
      code.expect(res.status).to.equal('ok');
      code.expect(res.result.accepted.length).to.equal(1);
      code.expect(res.result.accepted[0]).to.equal('you@you.com');
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

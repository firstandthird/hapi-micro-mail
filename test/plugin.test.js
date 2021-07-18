'use strict';
const code = require('code');
const Hapi = require('hapi');
const lab = exports.lab = require('lab').script();
const boom = require('boom');
let server;
let microMailServer;

lab.afterEach(async() => {
  await microMailServer.stop();
});

lab.beforeEach(async() => {
  server = new Hapi.Server({
    debug: {
      log: 'hapi-micro-mail'
    },
    port: 8000
  });
  await server.register({
    plugin: require('../'),
    options: {
      host: 'http://localhost:8080',
      apiKey: 'jksdf',
      verbose: true,
      blacklist: ['jamesspader@gmail.com']
    }
  });
  microMailServer = new Hapi.Server({ port: 8080 });
  await microMailServer.start();
});

lab.describe('.sendEmail', { timeout: 5000 }, () => {
  lab.it('can handle an HTTP error response from the micro-mail server', async() => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, h) => {
        code.expect(request.payload.from).to.equal('emal@example.com');
        throw boom.badRequest({
          message: 'Validation error',
          result: '"to" is required'
        });
      }
    });
    const badParams = {
      from: 'emal@example.com',
      subject: 'This is a subject',
      text: 'Hello there email text'
    };
    try {
      await server.sendEmail(badParams);
    } catch (err) {
      code.expect(err).to.not.equal(null);
      code.expect(err.isBoom).to.equal(true);
      code.expect(err.output.payload.error).to.equal('Bad Request');
    }
  });

  lab.it('can handle a micro-mail server SMTP error', async() => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, h) => {
        return {
          status: 'error',
          message: 'Boo',
          result: {
            accepted: [],
            rejected: ['nobody@nowhere.com'],
            response: '502 Command not implemented'
          }
        };
      }
    });
    const badParams = {
      from: 'emal@example.com',
      to: 'nobody@nowhere.com',
      subject: 'This is a subject',
      text: 'Hello there email text'
    };
    try {
      await server.sendEmail(badParams);
    } catch (err) {
      code.expect(err).to.not.equal(null);
      code.expect(err.message).to.equal('Boo');
      code.expect(err.result.response).to.equal('502 Command not implemented');
      code.expect(err.result.rejected.length).to.equal(1);
    }
  });

  lab.it('can send an email to a micro-mail server', async() => {
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, h) => {
        code.expect(request.payload.from).to.equal('me@me.com');
        code.expect(request.payload.to).to.equal('you@you.com');
        code.expect(request.payload.subject).to.equal('this is the subject of an email I am sending to you');
        code.expect(request.payload.text).to.equal('This is the text of the email I am sending to you!');
        return {
          status: 'ok',
          message: 'Email delivered',
          result: {
            response: '250 Message queued',
            accepted: [request.payload.to]
          }
        };
      }
    });
    const res = await server.sendEmail({
      from: 'me@me.com',
      to: 'you@you.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    });
    code.expect(res.status).to.equal('ok');
    code.expect(res.result.accepted.length).to.equal(1);
    code.expect(res.result.accepted[0]).to.equal('you@you.com');
  });

  lab.it('can render an email from a micro-mail server', async() => {
    microMailServer.route({
      path: '/render',
      method: 'POST',
      handler: (request, h) => {
        code.expect(request.payload.from).to.equal('me@me.com');
        code.expect(request.payload.to).to.equal('you@you.com');
        code.expect(request.payload.subject).to.equal('this is the subject of an email I am sending to you');
        code.expect(request.payload.text).to.equal('This is the text of the email I am sending to you!');
        return '<html><h1>HI!</h1></html>';
      }
    });
    const data = await server.renderEmail({
      from: 'me@me.com',
      to: 'you@you.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    });
    code.expect(data).to.equal('<html><h1>HI!</h1></html>');
  });

  lab.it('will exclude emails in the blacklist', async () => {
    microMailServer.route({
      path: '/render',
      method: 'POST',
      handler: (request, h) => {
        code.fail();
      }
    });
    microMailServer.route({
      path: '/send',
      method: 'POST',
      handler: (request, h) => {
        code.fail();
      }
    });

    const res = await server.sendEmail({
      from: 'me@me.com',
      to: 'jamesspader@gmail.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    });
    const res2 = await server.renderEmail({
      from: 'me@me.com',
      to: 'jamesspader@gmail.com',
      subject: 'this is the subject of an email I am sending to you',
      text: 'This is the text of the email I am sending to you!'
    });
  });
});

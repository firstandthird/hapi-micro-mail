'use strict';
const wreck = require('wreck');
const Boom = require('boom');
const defaultOptions = {
  verbose: false,
  host: '', // the micro-mail host
  apiKey: '' // the micro-mail api-key
};

exports.register = function(server, options, next) {
  options = Object.assign({}, defaultOptions, options);
  if (options.host === '' || options.apiKey === '') {
    return next('You must specify a micro-mail host and apiKey!');
  }

  const sendAddress = `${options.host}/send?token=${options.apiKey}`;
  server.decorate('server', 'sendEmail', (data, done) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail', 'send'], { message: `sending request to ${sendAddress}`, data });
    }
    wreck.post(sendAddress, { payload: data }, (err, response, payload) => {
      if (err) {
        server.log(['error', 'hapi-micro-mail'], err);
        if (typeof done === 'function') {
          return done(err);
        }
        return;
      }
      payload = JSON.parse(payload.toString());
      if (options.verbose) {
        server.log(['debug', 'hapi-micro-mail'], { message: 'micro-mail server responded', data: payload });
      }
      if (typeof done === 'function') {
        // handle all HTTP-level errors:
        if (response.statusCode !== 200) {
          return done(Boom.create(response.statusCode, response.statusMessage, payload));
        }
        // handle SMTP-level errors (return codes that are not '250')
        // if there were multiple submissions sent with sendIndividual:
        if (Array.isArray(payload.result)) {
          // see if any were not successful:
          let status = 'ok';
          payload.result.forEach((result) => {
            if (result.response.indexOf('250') < 0) {
              status = 'error';
            }
          });
          if (status !== 'ok') {
            return done({
              status,
              message: 'failed to send one or more destination emails',
              result: payload.result // will contain list of accepted/rejected emails
            });
          }
        }
        // if only one submission or sendIndividual was not true:
        if (payload.result.response.indexOf('250') === -1) {
          return done({
            status: 'error',
            message: payload.message,
            result: payload.result
          });
        }
        return done(null, payload);
      }
    });
  });

  const renderAddress = `${options.host}/render?token=${options.apiKey}`;
  server.decorate('server', 'renderEmail', (data, done) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail', 'render'], { message: `sending request to ${renderAddress}`, data });
    }
    wreck.post(renderAddress, { payload: data }, (err, response, payload) => {
      if (err) {
        server.log(['error', 'hapi-micro-mail'], err);
        return done(err);
      }
      payload = payload.toString();
      if (options.verbose) {
        server.log(['debug', 'hapi-micro-mail'], { message: 'micro-mail server responded', data: payload });
      }

      if (response.statusCode !== 200) {
        return done(Boom.create(response.statusCode, response.statusMessage, payload));
      }

      return done(null, payload);
    });
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};

'use strict';
const wreck = require('wreck');
const Boom = require('boom');
const defaultOptions = {
  verbose: false,
  host: '', // the micro-mail host
  apiKey: '' // the micro-mail api-key
};

const register = (server, options) => {
  options = Object.assign({}, defaultOptions, options);
  if (options.host === '' || options.apiKey === '') {
    throw new Error('You must specify a micro-mail host and apiKey!');
  }

  const sendAddress = `${options.host}/send?token=${options.apiKey}`;
  server.decorate('server', 'sendEmail', async(data) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail', 'send'], { message: `sending request to ${sendAddress}`, data });
    }
    const { res, payload } = await wreck.post(sendAddress, { payload: data, json: true });
    // payload = JSON.parse(payload.toString());
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail'], { message: 'micro-mail server responded', data: payload });
    }
    // handle all HTTP-level errors:
    if (res.statusCode !== 200) {
      throw Boom.create(res.statusCode, res.statusMessage, payload);
    }
    // handle SMTP-level errors (return codes that are not '250')
    // if there were multiple submissions sent with sendIndividual:
    if (Array.isArray(payload.result)) {
      // see if any were not successful:
      let status = 'ok';
      payload.result.forEach((result) => {
        if (result.res.indexOf('250') < 0) {
          status = 'error';
        }
      });
      if (status !== 'ok') {
        throw new Error({
          message: 'failed to send one or more destination emails',
          data: payload.result // will contain list of accepted/rejected emails
        });
      }
    }
    // if only one submission or sendIndividual was not true:
    if (payload.result.response.indexOf('250') === -1) {
      const err = new Error(payload.message);
      err.result = payload.result;
      throw err;
    }
    return payload;
  });

  const renderAddress = `${options.host}/render?token=${options.apiKey}`;
  server.decorate('server', 'renderEmail', async(data) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail', 'render'], { message: `sending request to ${renderAddress}`, data });
    }
    // may throw HTTP error that must be handled by caller:
    const { res, payload } = await wreck.post(renderAddress, { payload: data });
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail'], { message: 'micro-mail server responded', data: payload });
    }

    if (res.statusCode !== 200) {
      throw Boom.create(res.statusCode, res.statusMessage, payload);
    }

    return payload.toString();
  });
};

exports.plugin = {
  name: 'hapi-micro-mail',
  register,
  once: true,
  pkg: require('./package.json')
};

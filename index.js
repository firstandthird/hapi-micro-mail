const wreck = require('wreck');
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
  const hostAddress = `${options.host}/send?token=${options.apiKey}`;
  server.decorate('server', 'sendEmail', (data, done) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail'], { message: `sending request to ${hostAddress}`, data });
    }
    wreck.post(hostAddress, { payload: data }, (err, response, payload) => {
      if (err) {
        return server.log(['error', 'hapi-micro-mail'], err);
      }
      payload = JSON.parse(payload.toString());
      if (options.verbose) {
        server.log(['debug', 'hapi-micro-mail'], { message: 'micro-mail server responded', data: payload });
      }
      if (typeof done === 'function') {
        if (response.statusCode !== 200) {
          return done({
            status: 'error',
            message: payload.message ? payload.message : response.statusMessage,
            result: payload.result ? payload.result : response.statusCode
          });
        }
        return done(payload);
      }
    });
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};

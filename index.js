const defaults = require('lodash.defaults');
const wreck = require('wreck');

const defaultOptions = {
  verbose: false,
  host: 'http://localhost:8080' // the micro-mail host
};

exports.register = function(server, options, next) {
  options = defaults(options, defaultOptions);
  const hostAddress = `${options.host}/send`;
  server.decorate('server', 'sendEmail', (data, done) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail'], data);
      server.log(['debug', 'hapi-micro-mail'], `sending request to ${hostAddress}`);
    }
    wreck.post(hostAddress, { payload: data }, (err, response, payload) => {
      if (err) {
        server.log(['error', 'hapi-micro-mail'], err);
      }
      if (options.verbose) {
        server.log(['debug', 'hapi-micro-mail'], response);
      }
      done(JSON.parse(payload.toString()));
    });
  });
  next();
};

exports.register.attributes = {
  name: 'mailer-integration'
};

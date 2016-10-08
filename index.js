const defaults = require('lodash.defaults');
const request = require('request');
const defaultOptions = {
  verbose: false,
  // todo: should these be env variables?
  host: 'localhost', // the micro-mail host
  port: 8080, // the micro-mail port
};

exports.register = function(server, options, next) {
  options = defaults(options, defaultOptions);
  const hostAddress = `http://${options.host}:${options.port}/send`;
  server.decorate('server', 'sendEmail', (data, done) => {
    if (options.verbose) {
      server.log(['debug', 'hapi-micro-mail'], data);
      server.log(['debug', 'hapi-micro-mail'], `sending request to ${hostAddress}`);
    }
    request({ method: 'POST', url: hostAddress, form: data }, (err, response, body) => {
      if (err) {
        server.log(['error', 'hapi-micro-mail'], err);
      }
      if (options.verbose) {
        server.log(['debug', 'hapi-micro-mail'], response);
      }
      done(JSON.parse(body));
    });
  });
  next();
};

exports.register.attributes = {
  name: 'mailer-integration'
};

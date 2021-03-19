# hapi-micro-mail

[Hapi](https://hapi.dev/) plugin for posting emails to your [micro mail](https://github.com/firstandthird/micro-mail) email server.  You will need to either set up or have access to a micro-mail instance to use this plugin.

## Installation

```
npm install hapi-micro-mail
```

## Register the Plugin

Assuming you have a micro-mail server set up at `https://my-mail.com` and its API key is '12345', just register the hapi-micro-mail plugin with hapi:

```js
await server.register({
  plugin: require('hapi-micro-mail'),
  options: {
    host: 'https://my-mail.com',
    apiKey: '12345'
  }
});
```

__You must include the host and apiKey fields to use this plugin__.  This will decorate the server with the `sendEmail()` and `renderEmail` functions.

## sendEmail()

 Your code should wrap calls to this function in a `try...catch` block as there are many errors that can occur when sending an email:

Sending an explicit text email:
```js
try {
  const output = await server.sendEmail({
    from: 'me@me.com',
    to: 'you@you.com',
    subject: 'this is the subject of an email I am sending to you',
    text: 'This is the text of the email I am sending to you!'
  });
} catch (e) {
  server.log(['email-error', 'error!'], e.toString());
  // (maybe do something else with your error here)
}
```

Rendering and sending an email template hosted on micro-mail:
```js
try {
  const output = await server.sendEmail({
    from: 'me@me.com',
    // 'to' can also be an array for multiple recipients:
    to: ['you@you.com', 'andyou@you.com', 'andalsoyou@you.com'],
    subject: 'Welcome!',
    template: 'welcome-message',
    data: {
      'login': 'frodo@bagend.com',
      'public_handle': 'mr_underhill'
    }
  });
} catch (e) {
  server.log(['email-error', 'error!'], e.toString());
  // (maybe do something else with your error here)
}
```

If successful, `output` will look something like:
```js
{
  status: 'ok',
  message: 'Email delivered',
  result: { response: '250 Message queued', accepted: [ 'you@you.com' ] }
}
```

## Fields

Valid fields that you can specify in `sendEmail` are:

- _to_ (required):  An email address or array of email addresses  specifying the email destination
- _from_: The email address of the sender, this is ignored if the micro-mail server already has a configured sender.
- _fromName_: The common name of the sender, this is also ignored if the micro-mail server already has a configured sender.
- _subject_: The subject of the email
- _text_ (required if _template_ was not specified): The text of the email to send, if this is specified it will override anything you set in the _template_ field.
- _template_(required if _text_ was not specified): The slug of the template you wish to render and send as the text of the email.
- _data_: An object containing the context for the _template_ you wish to render.  If you requested a _template_ email, then you will need to pass any values the template relies on for rendering in here.
- _headers_: Any additional headers that you want micro-mail to forward to the SMTP server.
- _trackingData_: An object containing tracking-specific information to include in your email
- _disableTracking_: Set to true to specify you want to include tracking data

## Errors

- HTTP errors

  If there is an _HTTP error_ (some type of network-level error that prevents you from correctly communicating with your micro-mail server) then `sendEmail()` will throw a hapi [boom](https://github.com/hapijs/boom) error, an Error object which contains additional HTTP-specific error information useful for diagnosing network errors.  You must catch this error in your own code.

- SMTP errors

  If there is an _SMTP error_ (you communicated correctly with your  micro-mail server, but it was unable to successfully send the email for some reason) then `sendEmail()` will throw a normal Javascript Error object, except that it will have an additional `result` field containing information about the type of SMTP error that occurred, including the [SMTP error code](https://en.wikipedia.org/wiki/List_of_SMTP_server_return_codes) and a list of which email destinations were successfully sent and which were rejected:

  ```js
  result: {
    accepted: [],
    rejected: [ 'you@you.com' ],
    response: '502 Command not implemented'
  }
  ```

  The _message_ for this Error will be handed back to you by the micro-mail server, but the _stack trace_ for the error will still be for your local server.  You must catch this error in your own code.


## Render Email

micro-mail also hosts an email template rendering service.  Identical to view rendering with HTML pages, you pass it some data and the name of the template and it will fill out the template using the data you provided. You can use the `renderEmail()` function to preview what your email will look like with a given set of data. It will not actually send the email, just return back the email packet so you can verify what it will look like before you send it out.

So if your micro-mail server has a template named `welcome-email`:

```html
  <h1>Welcome {{username}}!</h1>
  Your login is: <b> {{login}} </b>
```

you can preview it without really sending it:

```js
const html = await server.renderEmail({
  from: 'me@me.com',
  to: 'you@you.com',
  subject: 'this is the subject of an email I am sending to you',
  template: 'welcome-email',
  data: {
    username: 'jill_valentine',
    login: 'zombie_hunter'
  }
});
```

and `html` will be the string:

```HTML
<h1>Welcome jill_valentine!</h1>
Your login is: <b> zombie_hunter </b>
```

`renderEmail()` accepts all of the fields that the `sendEmail()` function accepts.  The only difference is that it won't actually send the email and only returns the rendered email text.

## Plugin Options

  The following are options you specify when you register the plugin:

- _host_ (required)

  Complete URL of the micro-mail instance, should start with 'http://' or 'https://'

- _apiKey_ (required)

  micro-mail uses a token-based API key to prevent unauthorized use, you must specify the server's API key when you register the plugin.

- _verbose_

  Verbose mode, when set to true this will log information about every email you send out on the local hapi server.

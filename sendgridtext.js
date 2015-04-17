var sendgrid  = require('sendgrid')("qclin", "wiki920lemon");
sendgrid.send({
  to:       'qiaoclin@gmail.com',
  from:     'other@example.com',
  subject:  'Hello World',
  text:     'My first email through SendGrid.'
}, function(err, json) {
  if (err) { return console.error(err); }
  console.log(json);
});
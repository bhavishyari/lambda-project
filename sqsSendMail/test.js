
/**
 * local test of mailer.
 */

const mailer = require('./handlers/mailer');

const record = {
  'body': JSON.stringify({
    "Sender": "aws-ses",
    "Source": "YelloCab <yellocabservices@gmail.com>",
    "Template": "MyTemplate",
    "ConfigurationSetName": "ConfigSet",
    "ToAddresses": [
      "rajesh.virtueinfo@gmail.com","rajesh.virtueinfo@gmail.com"
    ],
    "CcAddresses":[
      "rjmeniya@gmail.com",
      "rjmeniya+cc1@gmail.com"
    ],
    "BccAddresses":[
      "rajesh.virtueinfo+bcc1@gmail.com",
      "rajesh.virtueinfo+bcc2o@gmail.com",
    ],
    "TemplateData": { "name": "Rajesh Meniya"}
  })
};

mailer.execute(record);

const aws = require('aws-sdk');

/**
 * Load ENVIROMNET Variables
 *  - MAIL_QUEUE_URL        the url of the AWS's SQS Queue reserved for Email notifications
 *  - EMAIL_FROM            the email addresses from which the mail is sent
 */
const MAIL_QUEUE_URL = process.env.NOTIFICATION_MAIL_QUEUE_URL;
const EMAIL_FROM = process.env.NOTIFICATION_EMAIL_FROM;

/** Initialize SQS */
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});

/**
 * Create a notification for Email and add it to SQS Queue
 * @param {EMAIL_NOTIFICATION_INPUT} data
 */
module.exports.CreateEmailNotification = async (data) => {

    const message = {
        Sender: 'aws-ses',
        Source: EMAIL_FROM,
        Template: data.Template,
        ConfigurationSetName: 'ConfigSet',
        ToAddresses: data.ToAddresses,
        CcAddresses: data.CcAddresses || [],
        BccAddresses: data.BccAddresses || [],
        TemplateData: data.TemplateData
    };

    const result = await sqs.sendMessage({
        MessageBody: JSON.stringify(message),
        QueueUrl: MAIL_QUEUE_URL
    }).promise();


    return result;
};

/**
 * @typedef {import('./CreateNotifications').EmailNotificationInput} EMAIL_NOTIFICATION_INPUT
 */
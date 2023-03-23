const aws = require('aws-sdk');

/**
 * Load ENVIRONMENT Variables
 *  - SMS_QUEUE_URL                 the url of the AWS's SQS queue reserved for SMS notifications
 */
const SMS_QUEUE_URL = process.env.NOTIFICATION_SMS_QUEUE_URL;

/** Initialize AWS's SQS */
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});

/**
 * Create a notification for SMS and add it to SQS Queue
 * @param {SMS_NOTIFICATION_INPUT} data 
 */
module.exports.CreateSmsNotification = async (data) => {
    const message = {
        'UserId': data.UserId,
        'Sender': "aws-sns",
        'Message': data.Message,
        'PhoneNumber': data.PhoneNumber
    };

    const result = await sqs.sendMessage({
        DelaySeconds: 1,
        MessageBody: JSON.stringify(message),
        QueueUrl: SMS_QUEUE_URL
    }).promise();


    return result;
};

/**
 * @typedef {import('./CreateNotifications').SmsNotificationInput} SMS_NOTIFICATION_INPUT
 */
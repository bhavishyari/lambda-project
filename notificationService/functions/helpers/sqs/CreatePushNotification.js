const aws = require('aws-sdk');

/**
 * Load ENVIROMNET Variables
 *  - PUSH_QUEUE_URL        the url of the AWS's SQS Queue reserved for Push notifications
 */
const PUSH_QUEUE_URL = process.env.NOTIFICATION_PUSH_QUEUE_URL;

/** Initialize SQS */
const sqs = new aws.SQS({
    apiVersion: '2012-11-05'
});

/**
 * Create a notification for PUSH and add it to SQS Queue
 * @param {PUSH_NOTIFICATION_INPUT} message 
 */
module.exports.CreatePushNotification = async (message) => {
    const result = await sqs.sendMessage({
        DelaySeconds: 1,
        MessageBody: JSON.stringify(message),
        QueueUrl: PUSH_QUEUE_URL
    }).promise();


    return result;
};

/**
 * @typedef {import('./CreateNotifications').PushNotificationInput} PUSH_NOTIFICATION_INPUT
 */
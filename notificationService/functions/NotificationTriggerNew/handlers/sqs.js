const aws = require('aws-sdk');
// aws.config.update({
//   region:'us-west-2'
// });
const sqs = new aws.SQS({
  apiVersion: '2012-11-05'
});

const MAIL_QUEUE_URL = process.env.NOTIFICATION_MAIL_QUEUE_URL;
const PUSH_QUEUE_URL = process.env.NOTIFICATION_PUSH_QUEUE_URL;
const SMS_QUEUE_URL = process.env.NOTIFICATION_SMS_QUEUE_URL;

const EMAIL_FROM = process.env.NOTIFICATION_EMAIL_FROM;

/**
 * Create a notification for Email and add it to SQS Queue
 * @param {EmailNotificationInput} data
 */
const CreateEmailNotification = async (data) => {
  console.log(EMAIL_FROM,'EMAIL_FROM')
  console.log(data,'CreateEmailNotification')

  const message = {
    Sender: 'aws-ses',
    Source: EMAIL_FROM,
    Template: data.Template,
    // ConfigurationSetName: 'ConfigSet',
    ToAddresses: data.ToAddresses,
    CcAddresses: data.CcAddresses || [],
    BccAddresses: data.BccAddresses || [],
    TemplateData: data.TemplateData
  };

  // console.log( JSON.stringify(message));
  
  let result = await sqs.sendMessage({
    MessageBody: JSON.stringify(message),
    QueueUrl: MAIL_QUEUE_URL
  }).promise();


  return result;
};

/**
 * Create a notification for SMS and add it to SQS Queue
 * @param {SmsNotificationInput} data 
 */
const CreateSmsNotification = async (data) => {

  console.log(data,'CreateSmsNotification')
  const message = {
    'UserId': data.UserId,
    'Sender': "aws-sns",
    'Message': data.Message,
    'PhoneNumber': data.PhoneNumber
  };

  let result = await sqs.sendMessage({
    DelaySeconds: 1,
    MessageBody: JSON.stringify(message),
    QueueUrl: SMS_QUEUE_URL
  }).promise();


  return result;
};


/**
 * Create a notification for PUSH and add it to SQS Queue
 * 
 * @param {PushNotificationInput} message 
 */
const CreatePushNotification = async (message) => {

  console.log(message,'CreatePushNotification')

  let result = await sqs.sendMessage({
    DelaySeconds: 1,
    MessageBody: JSON.stringify(message),
    QueueUrl: PUSH_QUEUE_URL
  }).promise();


  return result;
};

/**
 * Creates notifications and adds them to queue
 * @param {NotificationsInput} notifications 
 * 
 * @returns {Promise<AWS.SQS.SendMessageResult, AWS.AWSError>[]} the sendMessage results
 */
const CreateNotifications = async (notifications) => {
  let sqsNotifications = [];

  /**
   * Create the email notifications
   */
  notifications.emails.forEach(email => {
    if (email.ToAddresses.length) {
      sqsNotifications.push(CreateEmailNotification(email));
    }
  })

  /**
   * Create the push notifications
   */
  notifications.push.forEach(pushNotif => {
    if(pushNotif.userId){
      sqsNotifications.push(CreatePushNotification(pushNotif));
    }
  })

  /**
   * Create the sms notifications
   */
  notifications.sms.forEach(smsNotif => {
    if(smsNotif.PhoneNumber){
      sqsNotifications.push(CreateSmsNotification(smsNotif));
    }
  })

  /**
   * Send all notifications to sqs queue
   */
  return Promise.all(sqsNotifications);
}

module.exports = {
  CreateEmailNotification,
  CreateSmsNotification,
  CreatePushNotification,
  CreateNotifications
};


/**
 * @typedef {Object} NotificationsInput
 * @property {EmailNotificationInput[]} emails       the email notifications
 * @property {PushNotificationInput[]} push       the push notifications 
 * @property {SmsNotificationInput[]} sms      the sms notifications
 */

/**
 * @typedef {Object} EmailNotificationInput
 * @property {string} Template              the email template to use
 * @property {string[]} ToAddresses         the email addresses to send to
 * @property {string[]} CcAddresses         the email addresses to CC to
 * @property {string[]} BccAddresses        the email addresses to BCC to
 * @property {any} TemplateData             data for template as map(Object)
 */

/**
 * @typedef {Object} PushNotificationInput
 * @property {string} userId                      the id of the user to send to
 * @property {string} platform                    the device platform of the user 'android' | 'web'
 * @property {Object} notification
 * @property {string} notification.title          the title of the notification
 * @property {string} notification.body           the body of the notification
 * @property {any} data                           extra data to send along the push notification as map(Object)
 */

/**
 * @typedef {Object} SmsNotificationInput
 * @property {string} UserId                    the id of the user to send to
 * @property {string} Message                   the message to send
 * @property {string} PhoneNumber               the user's phone number
 */
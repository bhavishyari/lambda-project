/**
 * Creates notifications and adds them to queue
 * @param {NotificationsInput} notifications 
 * 
 * @returns {Promise<AWS.SQS.SendMessageResult, AWS.AWSError>[]} the sendMessage results
 */
module.exports.CreateNotifications = async (notifications) => {
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
        if (pushNotif.userId) {
            sqsNotifications.push(CreatePushNotification(pushNotif));
        }
    })

    /**
     * Create the sms notifications
     */
    notifications.sms.forEach(smsNotif => {
        if (smsNotif.PhoneNumber) {
            sqsNotifications.push(CreateSmsNotification(smsNotif));
        }
    })

    /**
     * Send all notifications to sqs queue
     */
    return Promise.all(sqsNotifications);
}


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
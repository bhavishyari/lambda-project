const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');


/**
 * handle notifications for NEW_SUPPORT_REQUEST event
 * event source: support_request create
 * TARGET USER: rider
 * SES TEMPLATE: NEW_SUPPORT_REQUEST
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_SUPPORT_REQUEST = async (trigger, event) => {

  let Template = 'NEW_SUPPORT_REQUEST',
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new;


  let user = await hasura.FetchUser(evt.user_id);


  if (user && user.email) {
    // add email notifications..
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [user.email],
        TemplateData: {
            firstname: utility.GetFirstnameFromFullName(user.full_name),
            title: (evt.content.title) ? evt.content.title : '',
            description: (evt.content.description) ? evt.content.description : '',
            status: evt.status
        }
      }
    ];
  }

  // // add sms notifications..
  // notificationList['sms'] = [
  // ];

  let pushMsg = {
    title: 'Support request submitted',
    body: `Your support request has been submitted successfully, You will be contacted by our support staff soon.`
  };

  let pushData = {
    user:{
      id: user.id,
      full_name: user.full_name,
    },
    support_request:{
      id: evt.id,
      status: evt.status,
      title: (evt.content.title) ? evt.content.title : ''
    },
    notification_type: Template
  };

  
  let flagWebpush = utility.IsSubscribedForPush(user, 'webpush');

  // add push notifications
  if (flagWebpush) {
    notificationList['push'] = [
      {
        userId: user.id,
        platform: 'webpush',
        notification: pushMsg,
        data: pushData
      }
    ];

  }

  let sqsNotifications = [];
  for (let i = 0; i < notificationList.emails.length; i++) {
    if (notificationList.emails[i].ToAddresses.length) {
      sqsNotifications.push(sqs.CreateEmailNotification(notificationList.emails[i]));
    }
  }

  for (let i = 0; i < notificationList.sms.length; i++) {
    if (notificationList.sms[i].PhoneNumber) {
      sqsNotifications.push(sqs.CreateSmsNotification(notificationList.sms[i]));
    }
  }

  for (let i = 0; i < notificationList.push.length; i++) {
    if (notificationList.push[i].userId) {
      sqsNotifications.push(sqs.CreatePushNotification(notificationList.push[i]));
    }
  }


  // add in app notification
  let inAppNotifications = [{
    content: {
      title: pushMsg.title,
      message: pushMsg.body,
      data: pushData
    },
    priority: "HIGH",
    sender_user_id: null,   // system generated
    target: "USER",
    user_id: user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_SUPPORT_REQUEST : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_SUPPORT_REQUEST;

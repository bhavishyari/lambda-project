const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

// const _find = require('lodash.find');

/**
 * handle notifications for NEW_PAYMENT event
 * event source: payment create
 * TARGET USER: rider
 * SES TEMPLATE: PAYMENT_INITIATED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_PAYMENT = async (trigger, event) => {

  let Template = null,
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new,
    service = 'Boarding Pass', serviceData = null;


  if (evt.type === 'C') {
    // A new payment init
    Template = 'PAYMENT_INITIATED';
  } else if (evt.type === 'D') {
    // A new refund to customer
    // Template = 'REFUND_INITIATED'; // handled in REFUND_REQUEST_NEW event.
    return false;
  } else {
    return false;
  }


  let payment = await hasura.FetchPayment(evt.id);
  if (!payment) {
    console.log('NotificationTriggerNew : NEW_PAYMENT : payment not found');
    return false;
  }

  if (!payment.user) {
    console.log('NotificationTriggerNew : NEW_PAYMENT : user not found');
    return false;
  }

  if (payment.order.service && payment.order.service.title) {
    service = payment.order.service.title;
    serviceData = {
      id: payment.order.service.id,
      title: payment.order.service.title,
      type: payment.order.service.type
    };
  }

  if (payment.user && payment.user.email) {
    // add email notifications..
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: [payment.user.email],
        TemplateData: {
            firstname: utility.GetFirstnameFromFullName(payment.user.full_name),
            amount: utility.FormatAmount(evt.amount),
            service: service,
            order_number: payment.order.order_number,
            transaction_id: evt.transaction_id,
            status: evt.status
        }
      }
    ];
  }

  // // add sms notifications..
  // notificationList['sms'] = [
  // ];



  let pushMsg = {
    title: 'Payment initiated',
    body: `A new payment of $${evt.amount} has been initiated.`
  }

  let pushData = {
    user:{
      id: payment.user.id,
      full_name: payment.user.full_name,
    },
    payment:{
      id: evt.id,
      amount: evt.amount,
      transaction_id: evt.transaction_id,
      status: evt.status
    },
    order: {
      id: payment.order.id,
      order_number: payment.order.order_number,
      service: serviceData
    },
    notification_type: Template
  };

  let flagWebpush = utility.IsSubscribedForPush(payment.user, 'webpush');

  // add push notifications
  if (flagWebpush) {
    notificationList['push'] = [
      {
        userId: payment.user.id,
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
    user_id: payment.user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_PAYMENT : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = NEW_PAYMENT;
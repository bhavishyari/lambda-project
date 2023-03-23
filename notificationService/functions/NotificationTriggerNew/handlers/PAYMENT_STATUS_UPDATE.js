const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');


/**
 * handle notifications for PAYMENT_STATUS_UPDATE event
 * event source: payment update
 * TARGET USER: rider
 * SES TEMPLATE: PAYMENT_SUCCESS
 * SES TEMPLATE: PAYMENT_FAILED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const PAYMENT_STATUS_UPDATE = async (trigger, event) => {

  let Template = null,
    notificationList = { emails: [], sms: [], push: [] },
    evt = event.data.new,
    service = 'Boarding Pass', serviceData = null
    pushMsg = {};

  if (evt.status === 'PAYMENT_SUCCESS') {
      Template = 'PAYMENT_SUCCESS';
      pushMsg = {
        title: 'Payment Received',
        body: `A payment of ${utility.FormatAmount(evt.amount)} has been successfully received.`
      };
  } else if (evt.status === 'PAYMENT_FAILED') {
      Template = 'PAYMENT_FAILED';
      pushMsg = {
        title: 'Payment Failed',
        body: `A payment of ${utility.FormatAmount(evt.amount)} has been failed, Please try again.`
      };
  } else {
      return false;
  }


  let payment = await hasura.FetchPayment(evt.id);
  if (!payment) {
    console.log('NotificationTriggerNew : PAYMENT_STATUS_UPDATE : payment not found');
    return false;
  }

  if (!payment.user) {
    console.log('NotificationTriggerNew : PAYMENT_STATUS_UPDATE : user not found');
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
        // ToAddresses: ['rajesh.virtueinfo+test@gmail.com'],
        TemplateData: {
            firstname: utility.GetFirstnameFromFullName(payment.user.full_name),
            order_number: payment.order.order_number,
            service: service,
            amount: utility.FormatAmount(evt.amount),
            transaction_id: evt.transaction_id,
            status: evt.status,
            failure_reason: (evt.transaction_data.failure_reason) ? evt.transaction_data.failure_reason : "Failed at gateway."
        }
      }
    ];
  }

  // // add sms notifications..
  if (serviceData.type == 'BOARDING_PASS') {
    // Pass Payment is succesful
    const validityDays = (payment.order.plan.validity_days) ? payment.order.plan.validity_days : '3';
    notificationList['sms'] = [{
        "UserId": payment.user.id,
        "Message": `Thanks for purchasing ${validityDays} day pass for Yello. This pass gives you unlimited yello rides for 72 hours after your first ride. We hope to see you onboard soon!!`,
        "PhoneNumber": `${payment.user.country_code}${payment.user.mobile}`
      }
    ];
  }

  // add push notifications
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
    order:{
      id: payment.order.id,
      order_number: payment.order.order_number,
      service: serviceData
    },
    notification_type: Template
  };

  
  let flagWebpush = utility.IsSubscribedForPush(payment.user, 'webpush');

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
  console.log('PAYMENT_STATUS_UPDATE : sqsResult : ', JSON.stringify(sqsResult));

}

module.exports = PAYMENT_STATUS_UPDATE;

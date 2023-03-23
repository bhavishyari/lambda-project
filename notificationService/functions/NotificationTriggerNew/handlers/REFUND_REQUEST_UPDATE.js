const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

const REFUND_STATUS = {
  NEW: 'NEW',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  REFUNDED: 'REFUNDED'
};


/**
 * handle notifications for REFUND_REQUEST_UPDATE event
 * event source: refund_request update
 * TARGET USER: rider
 * SES TEMPLATE: REFUND_REQUEST_APPROVED
 * SES TEMPLATE: REFUND_REQUEST_DENIED
 * SES TEMPLATE: REFUND_REQUEST_REFUNDED
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const REFUND_REQUEST_UPDATE = async (trigger, event) => {

  let Template = null,
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new,
    oldEvt = event.data.old,
    declineReason = null, isStatusChanged = false, pushMsg = {title: null, body: null};


  let refundRequest = await hasura.FetchRefundRequest(evt.id);


  // is status changed?
  // if (oldEvt.is_approved === false && refundRequest.is_approved === true) {
  //   isStatusChanged = true;
  // } else if (oldEvt.is_declined === false && refundRequest.is_declined === true) {
  //   isStatusChanged = true;
  // }

  if (oldEvt.status !== refundRequest.status) {
    isStatusChanged = true;
  }


  if (refundRequest.status === REFUND_STATUS.APPROVED) {
    Template = 'REFUND_REQUEST_APPROVED';
    
    pushMsg = {
      title: 'Refund request accepted',
      body: `We're happy to inform you that your refund request has been approved and it will process shortly.`
    };
  } else if (refundRequest.status === REFUND_STATUS.DECLINED) {
    Template = 'REFUND_REQUEST_DENIED';

    declineReason = (refundRequest.decline_reason) ? refundRequest.decline_reason : "";
    pushMsg = {
      title: 'Refund request denied',
      body: `We're sorry to inform you that your refund request has been denied. Our team looked into your refund request and our refund policy does not allow one in this case.`
    };
  } else if (refundRequest.status === REFUND_STATUS.REFUNDED) {
    Template = 'REFUND_REQUEST_REFUNDED';

    pushMsg = {
      title: 'Refund Processed',
      body: `Dear ${refundRequest.requesting_user.full_name}, As requested by you, we have processed your refund and it should reflect in your bank account within 2-3 business days.`
    };
  }

  // console.log('Template : ', Template);

  if (isStatusChanged && refundRequest.requesting_user.email) {
    notificationList['emails'].push(
      {
        Template: Template,
        ToAddresses: [refundRequest.requesting_user.email],
        // ToAddresses: ['rajesh.virtueinfo+test@gmail.com'],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(refundRequest.requesting_user.full_name),
          
          order_number: refundRequest.order.order_number,
          order_net_amount: utility.FormatAmount(refundRequest.order.net_amount),
          order_created_at: utility.FormatDatetime(refundRequest.order.created_at),

          refund_amount: utility.FormatAmount(refundRequest.refund_amount),
          refund_status: refundRequest.status,
  
          decline_reason: declineReason
        }
      }
    );
  }

  let pushData = {

    refund_request_id: refundRequest.id,

    order_number: refundRequest.order.order_number,
    order_net_amount: refundRequest.order.net_amount,
    order_created_at: refundRequest.order.created_at,

    user_email: refundRequest.requesting_user.email,
    user_country_code: refundRequest.requesting_user.country_code,
    user_mobile: refundRequest.requesting_user.mobile,

    status: refundRequest.status,
    refund_amount: refundRequest.refund_amount,
    decline_reason: (refundRequest.decline_reason) ? refundRequest.decline_reason : null,
    notification_type: Template
  };

  // add push notifications
  let flagWebpush = utility.IsSubscribedForPush(refundRequest.requesting_user, 'webpush');

  // web push to rider 
  if (isStatusChanged && flagWebpush) {

    notificationList['push'].push(
      {
        userId: refundRequest.requesting_user.id,
        platform: 'webpush',
        notification: pushMsg,
        data: pushData
      }
    );
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
    user_id: refundRequest.requesting_user.id // target user
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---

  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('REFUND_REQUEST_UPDATE : sqsResult : ', JSON.stringify(sqsResult));

}


module.exports = REFUND_REQUEST_UPDATE;

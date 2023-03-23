const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');


/**
 * handle notifications for REFUND_REQUEST_NEW event
 * event source: refund_request create
 * TARGET USER: rider, admin, sub-admin
 * SES TEMPLATE: REFUND_REQUEST
 * SES TEMPLATE: REFUND_REQUEST_ADMIN
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const REFUND_REQUEST_NEW = async (trigger, event) => {

  let TemplateUser = 'REFUND_REQUEST', TemplateAdmin = 'REFUND_REQUEST_ADMIN',
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new;

  let primaryRecords = await Promise.all([
    hasura.FetchRefundRequest(evt.id),
    hasura.FetchAdminAndSubAdminUsers()
  ]);

  //console.log(primaryRecords);

  let refundRequest = primaryRecords[0];
  let adminUsers = primaryRecords[1];

  if (!refundRequest) {
    return false;
  }

  let toEmails = [];
  adminUsers.forEach(user => {
    
    // user.user_settings.params.refund.email
    let emailFlag = utility.GetNotificationSettingFromRole(user, 'refund', 'email');

    // add email notifications..
    if (user.email && emailFlag) {
       toEmails.push(user.email);
    }
  });

  if (toEmails.length > 0) {
    notificationList['emails'].push(
      {
        Template: TemplateAdmin,
        ToAddresses: toEmails,
        TemplateData: {
          firstname: 'Admin',
          
          order_number: refundRequest.order.order_number,
          order_net_amount: utility.FormatAmount(refundRequest.order.net_amount),
          order_created_at: utility.FormatDatetime(refundRequest.order.created_at),
  
          user_full_name: refundRequest.requesting_user.full_name,
          user_email: (refundRequest.requesting_user.email) ? refundRequest.requesting_user.email : "",
          user_country_code: refundRequest.requesting_user.country_code,
          user_mobile: refundRequest.requesting_user.mobile,

          refund_amount: utility.FormatAmount(refundRequest.refund_amount),
          refund_status: refundRequest.status
          // decline_reason: (refundRequest.decline_reason) ? refundRequest.decline_reason : "-"
  
        }
      }
    );
  }

  if (refundRequest.requesting_user.email) {
    notificationList['emails'].push(
      {
        Template: TemplateUser,
        ToAddresses: [refundRequest.requesting_user.email],
        TemplateData: {
          firstname: utility.GetFirstnameFromFullName(refundRequest.requesting_user.full_name),
          
          order_number: refundRequest.order.order_number,
          order_net_amount: utility.FormatAmount(refundRequest.order.net_amount),
          order_created_at: utility.FormatDatetime(refundRequest.order.created_at),
  
          refund_amount: utility.FormatAmount(refundRequest.refund_amount),
          refund_status: refundRequest.status

          // user_email: refundRequest.requesting_user.email,
          // user_country_code: refundRequest.requesting_user.country_code,
          // user_mobile: refundRequest.requesting_user.mobile,
          // decline_reason: (refundRequest.decline_reason) ? refundRequest.decline_reason : "-"
  
        }
      }
    );
  }


  // add push notifications
  let pushData = {

    refund_request_id: refundRequest.id,
    refund_status: refundRequest.status,
    order_number: refundRequest.order.order_number,
    order_net_amount: refundRequest.order.net_amount,
    order_created_at: refundRequest.order.created_at,

    user_email: refundRequest.requesting_user.email,
    user_country_code: refundRequest.requesting_user.country_code,
    user_mobile: refundRequest.requesting_user.mobile,

    refund_amount: refundRequest.refund_amount,
    refund_status: refundRequest.status,

    decline_reason: (refundRequest.decline_reason) ? refundRequest.decline_reason : null,
    
    notification_type: Template
  };


  let pushMsgAdmin = {
    title: 'Refund request received',
    body: `${refundRequest.requesting_user.full_name} has submitted new refund request.`
  };

  let pushMsg = {
    title: 'Refund request received',
    body: `We have received your refund request for your order. Ref - Order #: ${refundRequest.order.order_number}.`
  };


  // web push to admin and sub-admin
  adminUsers.forEach(user => {
    // add push notifications..
    let pushFlag = utility.GetNotificationSettingFromRole(user, 'refund', 'push');
    let flagWebpush = utility.IsSubscribedForPush(user, 'webpush');

    if (user.push_registrations.length > 0 && pushFlag === true && flagWebpush === true) {
      notificationList['push'].push(
        {
          userId: user.id,
          platform: 'webpush',
          notification: pushMsgAdmin,
          data: pushData
        }
      );
    }
  });



  let flagWebpushRider = utility.IsSubscribedForPush(refundRequest.requesting_user, 'webpush');

  // web push to rider 
  if (flagWebpushRider) {
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
  let inAppNotifications = [
    {
      content: {
        title: pushMsgAdmin.title,
        message: pushMsgAdmin.body,
        data: pushData
      },
      priority: "HIGH",
      sender_user_id: null,   // system generated
      target: "GROUPS",
      user_id: null,          // target user
      user_groups: {"admin": true, "sub-admin": true} // target group
    },
    {
      content: {
        title: pushMsg.title,
        message: pushMsg.body,
        data: pushData
      },
      priority: "HIGH",
      sender_user_id: null,   // system generated
      target: "USER",
      user_id: refundRequest.requesting_user.id, // target user
    }
  ];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---

  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('REFUND_REQUEST_NEW : sqsResult : ', JSON.stringify(sqsResult));

}


module.exports = REFUND_REQUEST_NEW;

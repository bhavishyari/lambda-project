const hasura = require('./hasura');
const utility = require('./utility');
const sqs = require('./sqs');

const ISSUE_TYPES = {
  SOS: 'SOS',
  TRIP: 'TRIP',
  QUERY: 'QUERY'
}


/**
 * handle notifications for NEW_RIDE_ISSUE event
 * event source: ride_issue create
 * TARGET USER: admin, sub-admin
 * SES TEMPLATE: NEW_RIDE_ISSUE
 * 
 * @param {String} trigger
 * @param {Object} event 
 */
const NEW_RIDE_ISSUE = async (trigger, event) => {

  let Template = trigger,
    notificationList = {emails: [], sms: [], push: []},
    evt = event.data.new,
    pushMsg = {title: 'New issue created', body: null};


  let primaryRecords = await Promise.all([
    hasura.FetchRideIssue(evt.id),
    hasura.FetchAdminAndSubAdminUsers()
  ]);

  // console.log(primaryRecords);

  let rideIssue  = primaryRecords[0];
  let adminUsers = primaryRecords[1];

  // return if admin user is not available
  if (adminUsers.length <= 0) {
    return false;
  }

  
  let toEmails = [];
  adminUsers.forEach(user => {
    
    // user.user_settings.params.helpdesk.email
    let emailFlag = utility.GetNotificationSettingFromRole(user, 'helpdesk', 'email');

    // add email notifications..
    if (user.email && emailFlag) {
       toEmails.push(user.email);
    }
  });



  if (rideIssue.issue.type === ISSUE_TYPES.SOS) {
    pushMsg.body = `${rideIssue.user.full_name} has requested for the help.`
  } else if (rideIssue.issue.type === ISSUE_TYPES.TRIP) {
    pushMsg.body = `${rideIssue.user.full_name} has submitted new trip issue.`;
  } else if (rideIssue.issue.type === ISSUE_TYPES.QUERY) {
    pushMsg.body = `${rideIssue.user.full_name} has submitted new query.`;
  }


  if (toEmails.length > 0) {
    notificationList['emails'] = [
      {
        Template,
        ToAddresses: toEmails,
        TemplateData: {
          firstname: 'Admin',
          message: pushMsg.body,

          issue_type: rideIssue.issue.type,
          issue_description: rideIssue.issue.description,
          issue_note: (rideIssue.note) ? rideIssue.note : "-",

          rider_email: rideIssue.user.email,
          rider_phone: rideIssue.user.country_code+rideIssue.user.mobile,

          driver_email: rideIssue.driver_user.email,
          driver_phone: rideIssue.driver_user.country_code+rideIssue.user.mobile
        }
      }
    ];
  }

  // console.log( JSON.stringify(notificationList.emails) );


  // add push notifications
  let pushData = {

    ride_issue_id: rideIssue.id,
    issue_type: rideIssue.issue.type,
    issue_description: rideIssue.issue.description,
    issue_note: (rideIssue.note) ? rideIssue.note : "-",
    rider_email: rideIssue.user.email,
    
    rider_country_code: rideIssue.user.country_code,
    rider_mobile: rideIssue.user.mobile,

    driver_email: rideIssue.driver_user.email,
    driver_country_code: rideIssue.driver_user.country_code,
    driver_mobile: rideIssue.user.mobile,

    notification_type: Template
  };



  adminUsers.forEach(user => {
    // add push notifications..
    let pushFlag = utility.GetNotificationSettingFromRole(user, 'helpdesk', 'push');
    let flagWebpush = utility.IsSubscribedForPush(user, 'webpush');

    if (user.push_registrations.length > 0 && pushFlag === true && flagWebpush) {
      notificationList['push'].push(
        {
          userId: user.id,
          platform: 'webpush',
          notification: pushMsg,
          data: pushData
        }
      );
    }
  });


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
    target: "GROUPS",
    user_id: null, // target user
    user_groups: {"admin": true, "sub-admin": true}
  }];

  sqsNotifications.push(hasura.addInAppNotification(inAppNotifications));
  // ---


  // send all notifications to sqs queue
  let sqsResult = await Promise.all(sqsNotifications);
  console.log('NEW_RIDE_ISSUE : sqsResult : ', JSON.stringify(sqsResult));

}


module.exports = NEW_RIDE_ISSUE;

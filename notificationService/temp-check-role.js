
const utility = require('./functions/NotificationTriggerNew/handlers/utility');

let user = {
  "id": "8cc084e3-6cc8-47e1-8d26-51e97e07ba52",
  "full_name": "test",
  "email": "test@gmail.com",
  "country_code": "+91",
  "mobile": "9904032335",
  "type": "sub-admin",
  "push_registrations": [],
  "user_roles": [
    {
      "id": "5dbfaece-55f0-43de-af79-5c175c94ccbd",
      "role": {
        "id": "8bdf7068-45f1-4915-9f6c-f141e5b7bfdd",
        "name": "Python Team",
        "notification_setting": {
          "refund": {
            "push": true,
            "email": true
          },
          "helpdesk": {
            "push": true,
            "email": true
          },
          "content_management": {
            "push": true,
            "email": true
          },
          "payment_management": {
            "push": false,
            "email": true
          }
        }
      }
    }
  ]
};


let flag = utility.GetNotificationSettingFromRole(user, 'helpdesk', 'email');

console.log(flag);
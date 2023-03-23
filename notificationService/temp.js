require('dotenv').config();

// const BOARDING_PASS_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/BOARDING_PASS_STATUS_UPDATE');

// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "UPDATE",
//       "data": {
//           "new": {
//               "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//               "unlimited_trips": null,
//               "status": "EXPIRED",
//               "valid_from": "2020-08-08T00:00:00",
//               "only_airport_service": null,
//               "pass_number": 14,
//               "extended_at": null,
//               "extended_by": null,
//               "total_daily_trips": null,
//               "updated_at": "2020-09-04T09:10:11.458837",
//               "valid_to": "2020-08-27T01:00:00",
//               "extended_details": {
//                   "days": "2",
//                   "extended_at": "2020-08-07T06:14:38.917298"
//               },
//               "created_at": "2020-08-07T06:14:38.917298",
//               "purchased_at": "2020-08-07T00:00:00",
//               "id": "34e56b1c-277a-4c7e-91ee-8807bb9e4df2",
//               "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "pass_type": "LIMITED_RIDES",
//               "plan_id": "68116fa6-c591-11ea-87d0-0242ac130003",
//               "total_trips": null,
//               "qr_code": "6a7f931c-6e01-4eaf-8eeb-f5d62f26a939"
//           }
//       }
//   },
//   "created_at": "2020-09-04T09:10:11.458837Z",
//   "id": "52700421-fb44-41e7-b96d-af96eb874f9a",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "BOARDING_PASS_STATUS_UPDATE"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "boarding_pass"
//   }
// };

// BOARDING_PASS_STATUS_UPDATE(data.trigger.name, data.event);



// const RIDE_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/RIDE_STATUS_UPDATE');
// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "UPDATE",
//         "data": {
//             "new": {
//                 "status": "COMPLETE",
//                 "cancellation_reason": "offer",
//                 "driver_user_id": "9e5e68ea-ca0f-438b-bd07-944fddaff1d2",
//                 "confirmation_code": "RC-1",
//                 "distance": 2,
//                 "cancelled_by_user_id": null,
//                 "boarding_pass_id": "34e56b1c-277a-4c7e-91ee-8807bb9e4df2",
//                 "my_trip": true,
//                 "updated_at": "2020-08-24T12:12:46.232084",
//                 "vehicle_id": "c1ed22e9-6cd5-4262-8758-4a19f2e43db3",
//                 "start_at": null,
//                 "start_location": "(1,1)",
//                 "created_at": "2020-08-07T06:22:55.137688",
//                 "id": "e205c126-2d0b-42ba-ac2e-9ebc73bfd5cf",
//                 "end_at": null,
//                 "end_location": "(1,0)",
//                 "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "end_address": {
//                     "line1": "sg-highway"
//                 },
//                 "route_map_file_id": "175824fe-f5fc-48cd-b16a-beeb84ec96cb",
//                 "start_address": {
//                     "line1": "kubernagar"
//                 }
//             }
//         }
//     },
//     "created_at": "2020-08-24T12:12:46.232084Z",
//     "id": "b50ead7a-c89d-450e-936e-bc74521bb19e",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "RIDE_STATUS_UPDATE"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "ride"
//     }
// };

// RIDE_STATUS_UPDATE(data.trigger.name, data.event);




// const NEW_RIDE_ISSUE = require('./functions/NotificationTriggerNew/handlers/NEW_RIDE_ISSUE');

// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "INSERT",
//       "data": {
//           "old": null,
//           "new": {
//               "driver_user_id": "9e5e68ea-ca0f-438b-bd07-944fddaff1d2",
//               "note": null,
//               "ride_id": "e205c126-2d0b-42ba-ac2e-9ebc73bfd5cf",
//               "issue_id": "8adf3394-1fb3-4607-8592-f286965a61af",
//               "updated_at": "2020-09-07T13:17:54.845698+00:00",
//               "created_at": "2020-09-07T13:17:54.845698+00:00",
//               "id": "de073ef9-6e48-4bdf-a0fa-21780c02ec51",
//               "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c"
//           }
//       }
//   },
//   "created_at": "2020-09-07T13:17:54.845698Z",
//   "id": "84beace5-6d92-4140-94bd-317fb657f06b",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "NEW_RIDE_ISSUE"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "ride_issue"
//   }
// };

// NEW_RIDE_ISSUE(data.trigger.name, data.event);



// const REFUND_REQUEST_NEW = require('./functions/NotificationTriggerNew/handlers/REFUND_REQUEST_NEW');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "INSERT",
//         "data": {
//             "old": null,
//             "new": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "updated_at": "2020-09-09T11:20:14.317698+00:00",
//                 "decline_reason": "Due to heavy cost",
//                 "created_at": "2020-09-09T11:20:14.317698+00:00",
//                 "id": "0af9e3ab-ead2-402d-aca1-035a4696ffa5",
//                 "requesting_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "refund_amount": 50,
//                 "status": "NEW"
//             }
//         }
//     },
//     "created_at": "2020-09-09T11:20:14.317698Z",
//     "id": "3bfb7f7e-1181-4e83-8342-034d6f1c1418",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "REFUND_REQUEST_NEW"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "refund_request"
//     }
// };

// REFUND_REQUEST_NEW(data.trigger.name, data.event);


// const hasuraNew = require('./functions/NotificationTriggerNew/handlers/hasua-new');

// hasuraNew.FetchUser("63421d5f-a215-42d6-92b2-253c8d06fb3c");




// const REFUND_REQUEST_UPDATE = require('./functions/NotificationTriggerNew/handlers/REFUND_REQUEST_UPDATE');

// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "UPDATE",
//       "data": {
//           "old": {
//               "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//               "updated_at": "2020-09-09T11:20:14.317698+00:00",
//               "decline_reason": "Due to heavy cost",
//               "created_at": "2020-09-09T11:20:14.317698+00:00",
//               "id": "0af9e3ab-ead2-402d-aca1-035a4696ffa5",
//               "requesting_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "status": "APPROVED",
//               "refund_amount": 75.0
//           },
//           "new": {
//               "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//               "updated_at": "2020-09-10T10:52:53.891003+00:00",
//               "decline_reason": "Due to heavy cost",
//               "created_at": "2020-09-09T11:20:14.317698+00:00",
//               "id": "0af9e3ab-ead2-402d-aca1-035a4696ffa5",
//               "requesting_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "status": "REFUNDED",
//               "refund_amount": 75.0
//           }
//       }
//   },
//   "created_at": "2020-09-10T10:52:53.891003Z",
//   "id": "94d8cbb5-0ade-4211-bf45-0a0e99465e5e",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "REFUND_REQUEST_UPDATE"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "refund_request"
//   }
// };

// REFUND_REQUEST_UPDATE(data.trigger.name, data.event);





// const NEW_BOARDING_PASS = require('./functions/NotificationTriggerNew/handlers/NEW_BOARDING_PASS');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "INSERT",
//         "data": {
//             "old": null,
//             "new": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "unlimited_trips": null,
//                 "status": "EXPIRED",
//                 "valid_from": "2020-09-17T00:00:00",
//                 "only_airport_service": null,
//                 "pass_number": 17,
//                 "extended_at": null,
//                 "extended_by": null,
//                 "total_daily_trips": 5,
//                 "updated_at": "2020-09-17T08:20:11.29937",
//                 "valid_to": "2020-09-27T01:00:00",
//                 "extended_details": null,
//                 "created_at": "2020-09-17T08:20:11.29937",
//                 "purchased_at": "2020-08-07T00:00:00",
//                 "id": "74a5f3ee-fbc2-49df-a356-6e49a7240d39",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0",
//                 "pass_type": "LIMITED_RIDES",
//                 "plan_id": "68116fa6-c591-11ea-87d0-0242ac130003",
//                 "total_trips": 5,
//                 "qr_code": null
//             }
//         }
//     },
//     "created_at": "2020-09-17T08:20:11.29937Z",
//     "id": "4be6676d-82f0-44f2-8b63-9124b46c5660",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "NEW_BOARDING_PASS"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "boarding_pass"
//     }
// };

// NEW_BOARDING_PASS(data.trigger.name, data.event);





// const NEW_PAYMENT = require('./functions/NotificationTriggerNew/handlers/NEW_PAYMENT');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "INSERT",
//         "data": {
//             "old": null,
//             "new": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "status": "PAYMENT_INITIATED",
//                 "amount": 55,
//                 "transaction_status": "SUCCESS",
//                 "payment_method": "online",
//                 "payment_gateway": "google-pay",
//                 "invoice_file": null,
//                 "transaction_data": {
//                     "test": "test data"
//                 },
//                 "transaction_id": "ABCD",
//                 "updated_at": "2020-09-17T10:50:49.747077+00:00",
//                 "created_at": "2020-09-17T10:50:49.747077+00:00",
//                 "id": "8b8ab9cd-c9c8-409d-89c7-4a5db9048002",
//                 "invoice_number": 16,
//                 "type": "C",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             }
//         }
//     },
//     "created_at": "2020-09-17T10:50:49.747077Z",
//     "id": "b31281bf-88c1-4de4-9014-963fd0cd30ec",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "NEW_PAYMENT"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "payment"
//     }
// };

// NEW_PAYMENT(data.trigger.name, data.event);





// const PAYMENT_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/PAYMENT_STATUS_UPDATE');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "UPDATE",
//         "data": {
//             "old": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "status": "PAYMENT_INITIATED",
//                 "amount": 55,
//                 "transaction_status": "SUCCESS",
//                 "payment_method": "online",
//                 "payment_gateway": "google-pay",
//                 "invoice_file": null,
//                 "transaction_data": {
//                     "test": "test data"
//                 },
//                 "transaction_id": "ABCD",
//                 "updated_at": "2020-09-17T10:50:49.747077+00:00",
//                 "created_at": "2020-09-17T10:50:49.747077+00:00",
//                 "id": "8b8ab9cd-c9c8-409d-89c7-4a5db9048002",
//                 "invoice_number": 16,
//                 "type": "C",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             },
//             "new": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "status": "PAYMENT_SUCCESS",
//                 "amount": 55,
//                 "transaction_status": "SUCCESS",
//                 "payment_method": "online",
//                 "payment_gateway": "google-pay",
//                 "invoice_file": null,
//                 "transaction_data": {
//                     "test": "test data"
//                 },
//                 "transaction_id": "ABCD",
//                 "updated_at": "2020-09-18T08:19:30.901281+00:00",
//                 "created_at": "2020-09-17T10:50:49.747077+00:00",
//                 "id": "8b8ab9cd-c9c8-409d-89c7-4a5db9048002",
//                 "invoice_number": 16,
//                 "type": "C",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             }
//         }
//     },
//     "created_at": "2020-09-18T08:19:30.901281Z",
//     "id": "6231a75c-b91e-4fa3-90a8-17e1a0cf096b",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "PAYMENT_STATUS_UPDATE"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "payment"
//     }
// };

// PAYMENT_STATUS_UPDATE(data.trigger.name, data.event);




// const PAYMENT_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/PAYMENT_STATUS_UPDATE');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "UPDATE",
//         "data": {
//             "old": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "status": "PAYMENT_INITIATED",
//                 "amount": 55,
//                 "transaction_status": "SUCCESS",
//                 "payment_method": "online",
//                 "payment_gateway": "google-pay",
//                 "invoice_file": null,
//                 "transaction_data": {
//                     "test": "test data"
//                 },
//                 "transaction_id": "ABCD",
//                 "updated_at": "2020-09-17T10:50:49.747077+00:00",
//                 "created_at": "2020-09-17T10:50:49.747077+00:00",
//                 "id": "8b8ab9cd-c9c8-409d-89c7-4a5db9048002",
//                 "invoice_number": 16,
//                 "type": "C",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             },
//             "new": {
//                 "order_id": "3257bd7f-8852-47e0-ae76-baa9b2fce1d6",
//                 "status": "PAYMENT_FAILED",
//                 "amount": 55,
//                 "transaction_status": "FAILED",
//                 "payment_method": "online",
//                 "payment_gateway": "google-pay",
//                 "invoice_file": null,
//                 "transaction_data": {
//                     "test": "test data"
//                 },
//                 "transaction_id": "ABCD",
//                 "updated_at": "2020-09-18T08:19:30.901281+00:00",
//                 "created_at": "2020-09-17T10:50:49.747077+00:00",
//                 "id": "8b8ab9cd-c9c8-409d-89c7-4a5db9048002",
//                 "invoice_number": 16,
//                 "type": "C",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             }
//         }
//     },
//     "created_at": "2020-09-18T08:19:30.901281Z",
//     "id": "6231a75c-b91e-4fa3-90a8-17e1a0cf096b",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "PAYMENT_STATUS_UPDATE"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "payment"
//     }
// };

// PAYMENT_STATUS_UPDATE(data.trigger.name, data.event);




// const NEW_SUPPORT_REQUEST = require('./functions/NotificationTriggerNew/handlers/NEW_SUPPORT_REQUEST');

// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "INSERT",
//         "data": {
//             "old": null,
//             "new": {
//                 "status": "NEW",
//                 "attachments": null,
//                 "content": {
//                     "title": "title here",
//                     "type": "payment-query",
//                     "description": "description here"
//                 },
//                 "updated_at": "2020-09-18T13:04:29.961728+00:00",
//                 "created_at": "2020-09-18T13:04:29.961728+00:00",
//                 "id": "61aa9c93-0771-4d63-a823-85f320e9ba72",
//                 "user_id": "3c67545f-f56b-4e1a-9561-9a04729faaf0"
//             }
//         }
//     },
//     "created_at": "2020-09-18T13:04:29.961728Z",
//     "id": "964e2e7b-e3b4-461c-b28c-40c2afc5ef1e",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "NEW_SUPPORT_REQUEST"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "support_request"
//     }
// };

// NEW_SUPPORT_REQUEST(data.trigger.name, data.event);




const NEW_RATING = require('./functions/NotificationTriggerNew/handlers/NEW_RATING');

let data = {
    "event": {
        "session_variables": {
            "x-hasura-role": "driver",
            "x-hasura-user-id": "3ae68abc-a038-4496-96b6-b33c783c8728"
        },
        "op": "INSERT",
        "data": {
            "old": null,
            "new": {
                "from_user_type": "driver",
                "from_user_id": "3ae68abc-a038-4496-96b6-b33c783c8728",
                "ride_id": "b529b2b7-a53d-4ce1-91f2-4ff274aa6dff",
                "is_approved": true,
                "updated_at": "2020-09-14T14:47:21.465323+00:00",
                "deleted_at": null,
                "to_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
                "to_user_type": "rider",
                "created_at": "2020-09-14T14:47:21.465323+00:00",
                "id": "4050e7b4-2463-4816-9a6e-63fca32d1db9",
                "is_rejected": false,
                "comment": null,
                "deleted_reason": null,
                "given_rate": 4.5,
                "deleted_by": null
            }
        }
    },
    "created_at": "2020-09-14T14:47:21.465323Z",
    "id": "248a68db-edab-4da6-8573-038bdb605b3a",
    "delivery_info": {
        "max_retries": 0,
        "current_retry": 0
    },
    "trigger": {
        "name": "NEW_RATING"
    },
    "table": {
        "schema": "yt",
        "name": "rating"
    }
};

NEW_RATING(data.trigger.name, data.event);




// const NEW_USER_SIGNUP = require('./functions/NotificationTriggerNew/handlers/NEW_USER_SIGNUP');

// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "INSERT",
//       "data": {
//           "old": null,
//           "new": {
//               "email": "rjmeniya+p12@gmail.com",
//               "country_code": "+91",
//               "provider_id": "test1234",
//               "profile_photo_file_id": null,
//               "full_name": "Rajesh M",
//               "profile": null,
//               "verified": true,
//               "average_rate": null,
//               "address": null,
//               "block": false,
//               "active": true,
//               "timezone_identifier": null,
//               "updated_at": "2020-09-23T06:39:12.788129+00:00",
//               "deleted_at": null,
//               "block_reason": null,
//               "created_at": "2020-09-23T06:39:12.788129+00:00",
//               "metadata": {},
//               "id": "a6802adf-bfed-48d5-b11b-ed8cbad0a331",
//               "mobile": "9904032336",
//               "type": 'rider',
//               "deleted_reason": null,
//               "on_boarded_by": null,
//               "deleted_by": null,
//               "provider": "FIREBASE"
//           }
//       }
//   },
//   "created_at": "2020-09-23T06:39:12.788129Z",
//   "id": "fa9b581f-0320-4bba-8dbb-3634704157ea",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "NEW_USER_SIGNUP"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "user"
//   }
// };

// NEW_USER_SIGNUP(data.trigger.name, data.event);




// const RIDE_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/RIDE_STATUS_UPDATE');
// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "UPDATE",
//         "data": {
//             "new": {
//                 "status": "CANCELED",
//                 "cancellation_reason": "offer",
//                 "driver_user_id": "9e5e68ea-ca0f-438b-bd07-944fddaff1d2",
//                 "confirmation_code": "RC-1",
//                 "distance": 2,
//                 "cancelled_by_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "boarding_pass_id": "34e56b1c-277a-4c7e-91ee-8807bb9e4df2",
//                 "my_trip": true,
//                 "updated_at": "2020-08-24T12:12:46.232084",
//                 "vehicle_id": "c1ed22e9-6cd5-4262-8758-4a19f2e43db3",
//                 "start_at": null,
//                 "start_location": "(1,1)",
//                 "created_at": "2020-08-07T06:22:55.137688",
//                 "id": "e205c126-2d0b-42ba-ac2e-9ebc73bfd5cf",
//                 "end_at": null,
//                 "end_location": "(1,0)",
//                 "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "end_address": {
//                     "line1": "sg-highway"
//                 },
//                 "route_map_file_id": "175824fe-f5fc-48cd-b16a-beeb84ec96cb",
//                 "start_address": {
//                     "line1": "kubernagar"
//                 }
//             }
//         }
//     },
//     "created_at": "2020-08-24T12:12:46.232084Z",
//     "id": "b50ead7a-c89d-450e-936e-bc74521bb19e",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "RIDE_STATUS_UPDATE"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "ride"
//     }
// };

// RIDE_STATUS_UPDATE(data.trigger.name, data.event);



// const RIDE_STATUS_UPDATE = require('./functions/NotificationTriggerNew/handlers/RIDE_STATUS_UPDATE');
// let data = {
//     "event": {
//         "session_variables": {
//             "x-hasura-role": "admin"
//         },
//         "op": "UPDATE",
//         "data": {
//             "new": {
//                 "status": "IN_PROGRESS",
//                 "cancellation_reason": "offer",
//                 "driver_user_id": "9e5e68ea-ca0f-438b-bd07-944fddaff1d2",
//                 "confirmation_code": "RC-1",
//                 "distance": 2,
//                 "cancelled_by_user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "boarding_pass_id": "34e56b1c-277a-4c7e-91ee-8807bb9e4df2",
//                 "my_trip": true,
//                 "updated_at": "2020-08-24T12:12:46.232084",
//                 "vehicle_id": "c1ed22e9-6cd5-4262-8758-4a19f2e43db3",
//                 "start_at": null,
//                 "start_location": "(1,1)",
//                 "created_at": "2020-08-07T06:22:55.137688",
//                 "id": "e205c126-2d0b-42ba-ac2e-9ebc73bfd5cf",
//                 "end_at": null,
//                 "end_location": "(1,0)",
//                 "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//                 "end_address": {
//                     "line1": "sg-highway"
//                 },
//                 "route_map_file_id": "175824fe-f5fc-48cd-b16a-beeb84ec96cb",
//                 "start_address": {
//                     "line1": "kubernagar"
//                 }
//             }
//         }
//     },
//     "created_at": "2020-08-24T12:12:46.232084Z",
//     "id": "b50ead7a-c89d-450e-936e-bc74521bb19e",
//     "delivery_info": {
//         "max_retries": 0,
//         "current_retry": 0
//     },
//     "trigger": {
//         "name": "RIDE_STATUS_UPDATE"
//     },
//     "table": {
//         "schema": "yt",
//         "name": "ride"
//     }
// };

// RIDE_STATUS_UPDATE(data.trigger.name, data.event);



// const NEW_RIDE_REQUEST = require('./functions/NotificationTriggerNew/handlers/NEW_RIDE_REQUEST');
// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "INSERT",
//       "data": {
//           "old": null,
//           "new": {
//               "rejected_at": null,
//               "eta_number": null,
//               "driver_user_id": "1fb38aa9-32a5-4346-b28b-2d22729cb225",
//               "ride_id": "3b38bc1a-a63a-4174-abde-c85b83829a07",
//               "is_accepted": false,
//               "updated_at": "2020-09-25T10:06:55.112645+00:00",
//               "vehicle_id": "32a27fe5-d705-406d-bded-153bbb8f5a91",
//               "created_at": "2020-09-25T10:06:55.112645+00:00",
//               "id": "c10441f2-009f-4c00-936c-17de400ab1eb",
//               "is_rejected": false,
//               "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "accepted_at": null,
//               "available": true,
//               "eta_unit": null
//           }
//       }
//   },
//   "created_at": "2020-09-25T10:06:55.112645Z",
//   "id": "b84ad71f-1d67-4ba5-bf4c-5a64bb335f71",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "NEW_RIDE_REQUEST"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "ride_request"
//   }
// };

// NEW_RIDE_REQUEST(data.trigger.name, data.event);





// const RIDE_REQUEST_UPDATE = require('./functions/NotificationTriggerNew/handlers/RIDE_REQUEST_UPDATE');
// let data = {
//   "event": {
//       "session_variables": {
//           "x-hasura-role": "admin"
//       },
//       "op": "UPDATE",
//       "data": {
//           "old": {
//               "rejected_at": null,
//               "eta_number": null,
//               "driver_user_id": "1fb38aa9-32a5-4346-b28b-2d22729cb225",
//               "ride_id": "3b38bc1a-a63a-4174-abde-c85b83829a07",
//               "is_accepted": false,
//               "updated_at": "2020-09-25T14:14:55.056572+00:00",
//               "vehicle_id": "32a27fe5-d705-406d-bded-153bbb8f5a91",
//               "created_at": "2020-09-25T10:06:55.112645+00:00",
//               "id": "c10441f2-009f-4c00-936c-17de400ab1eb",
//               "is_rejected": false,
//               "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "accepted_at": null,
//               "available": false,
//               "eta_unit": null
//           },
//           "new": {
//               "rejected_at": null,
//               "eta_number": 0,
//               "driver_user_id": "1fb38aa9-32a5-4346-b28b-2d22729cb225",
//               "ride_id": "3b38bc1a-a63a-4174-abde-c85b83829a07",
//               "is_accepted": true,
//               "updated_at": "2020-09-25T14:14:55.056572+00:00",
//               "vehicle_id": "32a27fe5-d705-406d-bded-153bbb8f5a91",
//               "created_at": "2020-09-25T10:06:55.112645+00:00",
//               "id": "c10441f2-009f-4c00-936c-17de400ab1eb",
//               "is_rejected": false,
//               "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
//               "accepted_at": "2020-09-25T14:14:54.992",
//               "available": false,
//               "eta_unit": "Minutes"
//           }
//       }
//   },
//   "created_at": "2020-09-25T14:14:55.056572Z",
//   "id": "0fd74d99-2299-4989-b4bb-a681c8b56875",
//   "delivery_info": {
//       "max_retries": 0,
//       "current_retry": 0
//   },
//   "trigger": {
//       "name": "RIDE_REQUEST_UPDATE"
//   },
//   "table": {
//       "schema": "yt",
//       "name": "ride_request"
//   }
// };

// RIDE_REQUEST_UPDATE(data.trigger.name, data.event);


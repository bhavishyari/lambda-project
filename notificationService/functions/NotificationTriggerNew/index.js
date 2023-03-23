const RIDE_REQUEST_UPDATE = require('./handlers/RIDE_REQUEST_UPDATE');
const BOARDING_PASS_STATUS_UPDATE = require('./handlers/BOARDING_PASS_STATUS_UPDATE');
const RIDE_STATUS_UPDATE = require('./handlers/RIDE_STATUS_UPDATE');
const NEW_BOARDING_PASS = require('./handlers/NEW_BOARDING_PASS');
const NEW_USER_SIGNUP = require('./handlers/NEW_USER_SIGNUP');
const sqs = require('./handlers/sqs');

/**
 * Notification trigger is a webhook which will be triggered from Hasura instance
 */
module.exports.handler = async event => {

    /**
     * Hasura event trigger will send the event details
     * The request body will contain the following as a JSON string
     *  - `triggger`                  the event trigger
     *      - `name`
     *  - `event`                     the event data
     *      - `session_variables`     session variables (`x-hasura-role`)
     *      - `op`                    the operation which triggered the event `insert`
     *      - `data`                  the event record
     *          - `old`               old data record(`null` if op is `insert`)
     *          - `new`               new data record
     * 
     * @type {{trigger:{name: string}, event:{session_variables: {'x-hasura-role': string}, op:string, data: {old: null | any, new: any}}}}
     */
    let data = JSON.parse(event.body);

    console.log(data, 'data')
    if (data.justSend) {
        let notiList = {};
        notiList.UserId = data.justSend.user_id
        notiList.Message = data.justSend.msg
        notiList.PhoneNumber = data.justSend.mobile
        sqs.CreateSmsNotification(notiList)
    } else {

        /**
         * Process event and send notifications.
         */

        console.log(data, 'all full data');

        let notification = await ProcessEvent(data.trigger.name, data.event);
    }
    return {
        statusCode: 200
    }
}

/**
 * Processes Hasura events to email notifications
 * 
 * @param {string} trigger the event triger name
 * @param {{session_variables: any, op: string, data:{old?:any, new: any}}} event the event information and data
 */




const ProcessEvent = async (trigger, event) => {
    console.log(trigger, event, 'trigger event');

    switch (trigger) {
        case 'RIDE_REQUEST_UPDATE':
            await RIDE_REQUEST_UPDATE(trigger, event);

        case 'BOARDING_PASS_STATUS_UPDATE':
            await BOARDING_PASS_STATUS_UPDATE(trigger, event);
            break;

        case 'RIDE_STATUS_UPDATE':
            await RIDE_STATUS_UPDATE(trigger, event);
            break;

        case 'NEW_BOARDING_PASS':
            await NEW_BOARDING_PASS(trigger, event);
            break;

        case 'NEW_USER_SIGNUP2':
            await NEW_USER_SIGNUP(trigger, event);
            break;

        default:
            console.log('no support for trigger : ', trigger);
    }
}
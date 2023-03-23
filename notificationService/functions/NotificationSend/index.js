const aws = require('aws-sdk');


const hasura = require('./handlers/hasura');


const sqs = new aws.SQS({
  apiVersion: '2012-11-05'
});

const PUSH_QUEUE_URL = process.env.NOTIFICATION_PUSH_QUEUE_URL;

/**
 * Send test push notification
 */
module.exports.handler = async event => {

  const body = JSON.parse(event.body);
  console.log('body', body);

  let validationErrors = [];

  if (!body.input.user_id) {
    validationErrors.push({
      'attr': 'user_id',
      'msg': 'user_id required'
    });
  }



 // let user_setting = await hasura.FetchUserSetting(body.input.user_id);
  //console.log(user_setting, 'user_setting');

  if (!body.input.msg_body) {
    validationErrors.push({
      'attr': 'msg_body',
      'msg': 'msg_body required'
    });
  }

  if (validationErrors.length > 0) {


    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'validation errors.',
        errors: validationErrors
      })
    }
    // throw new Error("Validation error, one or more parameter is invalid.");
  }
  let msg_title_n = "Test";

  if (body.input.msg_title) {
    msg_title_n = body.input.msg_title;
  }

  let message = {
    userId: body.input.user_id,
    //   platform: body.input.platform,      // 'webpush',    // 'android'
    notification: {
      title: msg_title_n,
      body: body.input.msg_body,
      filter:body.input.filter
    },
    data: body.input.data
  };

  try {
    let result = false;
    //if (user_setting['push']) {
      console.log('sending sqs message : ', message);
      result = await sqs.sendMessage({
        DelaySeconds: 1,
        MessageBody: JSON.stringify(message),
        QueueUrl: PUSH_QUEUE_URL
      }).promise();
    //}
    return {
      statusCode: 200,
      body: JSON.stringify({
        sqs_response: result
      })
    };

  } catch (err) {

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: err.message
      })
    }
  }

}
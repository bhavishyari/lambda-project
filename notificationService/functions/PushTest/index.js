
const aws = require('aws-sdk');


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

    if (!body.input.platform) {
      validationErrors.push({
        'attr': 'platform',
        'msg': 'platform required'
      });
    } else if(!['android', 'webpush'].includes(body.input.platform)) {
      validationErrors.push({
        'attr': 'platform',
        'msg': 'invalid platform, android or webpush allowed'
      });
    }

    if (!body.input.msg_title) {
      validationErrors.push({
        'attr': 'msg_title',
        'msg': 'msg_title required'
      });
    }

    if (!body.input.msg_body) {
      validationErrors.push({
        'attr': 'msg_body',
        'msg': 'msg_body required'
      });
    }

    if (validationErrors.length > 0) {

      console.log(validationErrors);

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'validation errors.',
          errors: validationErrors
        })
      }
      // throw new Error("Validation error, one or more parameter is invalid.");
    }

    let message = {
      userId: body.input.user_id,
      platform: body.input.platform,      // 'webpush',    // 'android'
      notification: {
        title: body.input.msg_title,
        body: body.input.msg_body
      },
      data: body.input.data
    };

    try {

      console.log('sending sqs message : ', message);
      let result = await sqs.sendMessage({
        DelaySeconds: 1,
        MessageBody: JSON.stringify(message),
        QueueUrl: PUSH_QUEUE_URL
      }).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({
          sqs_response: result
        })
      };

    } catch(err) {

      return {
        statusCode: 400,
        body: JSON.stringify({
            message: err.message
        })
      }
    }

}

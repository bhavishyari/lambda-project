const fetch = require('node-fetch');
const aws = require('aws-sdk');
const {
    v4: uuidv4
} = require('uuid');
const {
    GetAccessUrl
} = require('../common/GetSignedUrl');

/**
 * The AWS SDK S3 object
 */
const S3 = new aws.S3({
    accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY,
    useSSL: true,
    signatureVersion: 'v4',
    region: 'us-west-2',
});

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which the Hasura GraphQL engine exists
 *  - AWS_S3_BUCKET         the S3 bucket name to upload files in
 */
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);
        const metadata = body.input.metadata;
        let extension = metadata.mime_type.slice(metadata.mime_type.indexOf('/') + 1);
        let uuid = uuidv4();
        let key = `up-img/${uuid}.${extension}`;

        let view_url = await GetAccessUrl(AWS_S3_BUCKET, key, 'getObject', metadata.mime_type);
        let upload_url = await GetAccessUrl(AWS_S3_BUCKET, key, 'putObject', metadata.mime_type);


        let photo_url = {
            view_url,
            upload_url
        }

        return {
            statusCode: 200,
            body: JSON.stringify(photo_url)
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
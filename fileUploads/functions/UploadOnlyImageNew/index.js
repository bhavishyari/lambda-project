const aws = require('aws-sdk');
const parser = require('lambda-multipart-parser');

const {
    v4: uuidv4
} = require('uuid');

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
        const result = await parser.parse(event);
        let url;
        let makeUrl = [];
        for (i = 0; i < result.files.length; i++) {
            url = await uploadFileOne(result.files[i]);
            makeUrl.push(url);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(makeUrl)
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


async function uploadFileOne(file) {
    let extension = file.contentType.slice(file.contentType.indexOf('/') + 1);
    let uuid = uuidv4();
    let key = `${file.fieldname}/${uuid}.${extension}`;


    var data = {
        Key: key,
        Body: file.content,
        ContentType: file.contentType,
        Bucket: AWS_S3_BUCKET,
        ACL: 'public-read'

    };
    let DataUpload = await S3.upload(data).promise();
    return DataUpload.Location;
}
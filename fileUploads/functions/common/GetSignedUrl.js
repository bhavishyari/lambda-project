const aws = require('aws-sdk');

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_S3_SIGNED_URL_VALIDITY = parseInt(process.env.AWS_S3_SIGNED_URL_VALIDITY);

/**
 * The AWS SDK S3 object
 */
const S3 = new aws.S3({
    accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY,
    useSSL: true,
    signatureVersion: 'v4',
    region: 'us-west-2'
});

const SIGNED_URL_EXPIRES_IN = parseInt(process.env.SIGNED_URL_EXPIRES_IN);


/**
 * GetAccessUrl gets a signed url for the key with GET | PUT access
 * @param {string} Bucket the S3 bucket name
 * @param {string} Key the S3 objcect's key
 * @param {string} method the access method 'getObject' | 'putObject' @default 'getObject'
 * 
 * @returns {string} the signed url with GET | PUT access
 */
module.exports.GetAccessUrl = (Bucket, Key, method = 'getObject', mime_type = 'image/jpeg') => new Promise((resolve, reject) => {

    if (method == 'getObject') {
        let url = "https://dev-yt-uploads.s3.us-west-2.amazonaws.com/" + Key;
        resolve(url);
    } else {
        let params = {
            Bucket,
            Key,
            Expires: SIGNED_URL_EXPIRES_IN,
        };
        params["ContentType"] = mime_type;
        params["ACL"] = 'public-read';

        S3.getSignedUrl(method, params, (err, url) => {
            if (err) {
                reject(err)
            } else {
                resolve(url)
            }
        });
    }
})
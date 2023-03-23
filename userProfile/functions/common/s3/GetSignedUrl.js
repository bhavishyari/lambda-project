const aws = require('aws-sdk');

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_S3_SIGNED_URL_VALIDITY = parseInt(process.env.AWS_S3_SIGNED_URL_VALIDITY);

/**
 * The AWS SDK S3 object
 */
const S3 = new aws.S3({
    accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY
});

/**
 * GetAccessUrl gets a signed url for the key with GET | PUT access
 * @param {string} Bucket the S3 bucket name
 * @param {string} Key the S3 objcect's key
 * @param {string} method the access method 'getObject' | 'putObject' @default 'getObject'
 * 
 * @returns {string} the signed url with GET | PUT access
 */
module.exports.GetSignedUrl = (Key, method = 'getObject') => new Promise((resolve, reject) => {
    S3.getSignedUrl(method, {
        Bucket: AWS_S3_BUCKET,
        Key,
        Expires: AWS_S3_SIGNED_URL_VALIDITY
    }, (err, url) => {
        if (err) {
            reject(err)
        }
        else {
            resolve(url)
        }
    });
})
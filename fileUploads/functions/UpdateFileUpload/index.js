const fetch = require('node-fetch');
const aws = require('aws-sdk');

/**
 * The AWS SDK S3 object
 */
const S3 = new aws.S3({
    accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY,
    useSSL:true,
    signatureVersion: 'v4',
    region:'us-west-2'
});

/**
 * Load ENVIRONMENT variables
 *  - HASURA_ENDPOINT       the endpoint at which the Hasura GraphQL engine exists
 *  - AWS_S3_BUCKET         the S3 bucket name to upload files in
 */
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const SIGNED_URL_EXPIRES_IN = parseInt(process.env.SIGNED_URL_EXPIRES_IN);

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * The user's authorization header
         * @type {string}
         */
        const Authorization = event.headers.Authorization;

        /**
         * The id of the current user
         */
        const user_id = body.session_variables['x-hasura-user-id'];

        /**
         * The role of current user
         */
        const user_role = body.session_variables['x-hasura-role'];
        
        /**
         * Check user role
         */
        if (!['rider', 'driver', 'sales'].includes(user_role)) {
            throw new Error('UNAUTHORIZED: You are not authorized update file.');
        }

        /**
         * The id of the file upload record to update
         * @type {string}
         */
        const file_upload_id = body.input.file_upload_id;

        /**
         * Fetch the file upload record
         */
        const file_upload = await GetFileUpload(file_upload_id, Authorization);

        /**
         * Abort if file upload record does not exists
         */
        if (!file_upload) {
            throw new Error('File Upload record not found');
        }

        /**
         * Check file ownership 
         */
        if (user_role != 'admin' && user_id !== file_upload.user_id) {
            throw new Error('UNAUTHORIZED: You can not delete this file.');
        }

        /**
         * Get the urls for updating the file
         */
        let update_urls = await GetUpdateUrls(file_upload.file_object.key);

        return {
            statusCode: 200,
            body: JSON.stringify(update_urls)
        }
    }
    catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * The file upload record containing `id` and `file_object`
 * @typedef {Object} FileUpload
 * @property {string} FileUpload.id                             the id of the file upload record
 * @property {Object} FileUpload.file_object
 * @property {string} FileUpload.file_object.original_filename  the original filename of the uploaded file
 * @property {string} FileUpload.file_object.key                the filename as on AWS S3 of the uploaded file
 */

/**
 * GetFileKey Get the S3 file key from file_upload_id
 * @param {String} file_upload_id the id of the file upload record
 * @param {String} Authorization the complete authorization header to authorize with Hasura
 * 
 * @returns {Promise<FileUpload>} the file upload record
 */
const GetFileUpload = async (file_upload_id, Authorization) => {
    /**
     * Define a GraphQL query to fetch the file upload record
     * Details fetched are
     *  - file_object
     *      - original_filename
     *      - key
     */
    let query = `
        query($file_upload_id:uuid!){
            file_upload: yt_file_upload_by_pk(id:$file_upload_id){
                id
                file_object
            }
        }
    `;

    /**
     * Run the GraphQL query on Hasura GraphQL engine
     * Use user's Authorization header to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                file_upload_id
            }
        })
    }).then(res => res.json());

    /**
     * If error(s) occur throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the fetched file upload record
     */
    return res.data.file_upload;
}

/**
 * The Update Urls object
 * @typedef {Object} UpdateUrls
 * @property {string} UpdateUrls.view_url       the url to use for viewing the file
 * @property {string} UpdateUrls.upload_url     the url to use for re-uploading the file
 * @property {string} UpdateUrls.expires_in     the duration after which the urls would be invalid
 * @property {Date} UpdateUrls.expires_at       the timestamp(approx) after which the urls would be invalid
 */

/**
 * Generate urls for updating a file on AWS S3
 * @param {string} key the key of the file on AWS S3
 * 
 * @returns {Promise<UpdateUrls>} the update urls
 */
const GetUpdateUrls = async key => {
    /**
     * Generate view and upload urls for the file
     */
    let view_url = await GetAccessUrl(AWS_S3_BUCKET, key, 'getObject');
    let upload_url = await GetAccessUrl(AWS_S3_BUCKET, key, 'putObject');

    /**
     * The urls will become invalid after this timestamp(approx)
     */
    let expires_at = new Date(new Date().valueOf() + (SIGNED_URL_EXPIRES_IN * 1000));

    return {
        view_url,
        upload_url,
        expires_in: `${SIGNED_URL_EXPIRES_IN} seconds`,
        expires_at
    };
}

/**
 * GetAccessUrl gets a signed url for the key with GET | PUT access
 * @param {string} Bucket the S3 bucket name
 * @param {string} Key the S3 objcect's key
 * @param {string} method the access method 'getObject' | 'putObject' @default 'getObject'
 * 
 * @returns {string} the signed url with GET | PUT access
 */
const GetAccessUrl = (Bucket, Key, method = 'getObject') => new Promise((resolve, reject) => {
   
    let params = {
        Bucket,
        Key,
        Expires: SIGNED_URL_EXPIRES_IN,
    };

    if (method === "putObject") {
        params["ACL"] = 'public-read';
    }
   
    S3.getSignedUrl(method, params, (err, url) => {
        if (err) {
            reject(err)
        }
        else {
            resolve(url)
        }
    });
})
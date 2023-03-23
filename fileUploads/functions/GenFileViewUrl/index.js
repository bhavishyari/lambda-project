const aws = require('aws-sdk');
const fetch = require('node-fetch');

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
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const SIGNED_URL_EXPIRES_IN = parseInt(process.env.SIGNED_URL_EXPIRES_IN);

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * The id of the file upload record to update
         * @type {string[] | string}
         */
        let file_upload_id = body.input.file_upload_id;

        if(typeof file_upload_id === 'string'){
            file_upload_id = file_upload_id.split(',');
        }

        /**
         * Fetch the file upload record
         */
        const file_uploads = await GetFileUploads(file_upload_id);

        /**
         * Get the urls for viewing the file
         */
        let urls = await GenerateFileUrls(file_uploads);

        return {
            statusCode: 200,
            body: JSON.stringify(urls)
        }
    }
    catch (err) {
        console.log(err);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}

/**
 * Generate view urls for file uploads
 * @param {FileUpload[]} uploads                    a list of file uploads
 * 
 * @returns {Promise<FILE_VIEW_URL[]>}              a list of view urls for the file uploads
 */
const GenerateFileUrls = async (uploads) => {
    /**
     * @type {VIEW_URL[]}
     */
    let urls = [];

    for (let i = 0; i < uploads.length; i++) {
        const url = await GetViewUrl(uploads[i].file_object.key);

        urls.push({
            upload_id: uploads[i].id,
            url: url.url,
            expires_at: url.expires_at
        });
    }

    return urls;
}

/**
 * @typedef FILE_VIEW_URL
 * @property {string} upload_id                 the id of the file upload
 * @property {string} url                       the url to view the upload file
 * @property {Date} expires_at                  the timestamp (approx) after which the url would become invalid
 */

/**
 * The file upload record containing `id` and `file_object`
 * @typedef {Object} FileUpload
 * @property {string} FileUpload.id                             the id of the file upload record
 * @property {Object} FileUpload.file_object
 * @property {string} FileUpload.file_object.original_filename  the original filename of the uploaded file
 * @property {string} FileUpload.file_object.key                the filename as on AWS S3 of the uploaded file
 */

/**
 * Get the file upload record
 * @param {String[]} file_upload_ids            array of file upload record ids
 * @param {String} Authorization                the authorization header to use
 * 
 * @returns {Promise<FileUpload[]>}             the file upload records
 */
const GetFileUploads = async (file_upload_ids) => {
    /**
     * Define a GraphQL query to fetch file upload record
     * Details fetched are
     *  - id                        the id of the file upload record
     *  - file_object
     *      - original_filename     the original filename of the uploaded file
     *      - key                   the filename as on AWS S3 of the uploaded file
     */
    let query = `
        query ($file_upload_ids: [uuid!]){
            uploads: yt_file_upload(where:{
                id:{_in:
                    $file_upload_ids
                }
            }){
                id
                file_object
            }
        }
    `;

    /**
     * Run the GraphQL query on Hasura GraphQL engine
     * Use user's Authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET
        },
        body: JSON.stringify({
            query,
            variables: {
                file_upload_ids
            }
        })
    }).then(res => res.json());

    /**
     * If error(s) occur throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    if (!res.data.uploads.length) {
        throw new Error('List of uploads could not be found for the ids');
    }

    /**
     * Else return the file upload record
     */
    return res.data.uploads;
}


/**
 * The View Url object
 * @typedef {Object} ViewUrl
 * @property {string} ViewUrl.url            the url to use for viewing the file
 * @property {string} ViewUrl.expires_in     the duration after which the url would be invalid
 * @property {Date} ViewUrl.expires_at       the timestamp(approx) after which the url would be invalid
 */

/**
 * Generate url for viewing a file from AWS S3
 * @param {string} key the key of the file on AWS S3
 * 
 * @returns {Promise<ViewUrl>} the View urls
 */
const GetViewUrl = async key => {
    /**
     * Generate view and upload urls for the file
     */
    let url = await GetAccessUrl(AWS_S3_BUCKET, key, 'getObject');

    /**
     * Generate timestamp for an Hour. The urls will become invalid after this timestamp(approx)
     */
    let expires_at = new Date(new Date().valueOf() + (SIGNED_URL_EXPIRES_IN * 1000));

    return {
        url,
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

    if (method === "putObject" && mime_type) {
        params["ContentType"] = mime_type;
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
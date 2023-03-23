const fetch = require('node-fetch');
const aws = require('aws-sdk');
const {
    v4: uuidv4
} = require('uuid');

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
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * Get the authorization header of the user calling this action
         */
        const Authorization = event.headers.Authorization;

        //const user_id = body.session_variables['x-hasura-user-id'];
        const user_id = body.input.user_id;
        /**
         * Metadata for the upload
         * @type {{mime_type: string, title: string}} the mime type and title of the file to upload
         */
        const metadata = body.input.metadata;

        /**
         * The `id` of the support request to upload attachment for
         * @type {string}
         */
        const support_request_id = body.input.support_request_id;

        /**
         * Get the file type record for the photo to upload
         * must use user's authorization token, so can only upload file for own support request.
         */
        let records = await GetFileTypeAndSupportRequest(metadata.mime_type, support_request_id, Authorization);

        /**
         * Abort if support request does not exist
         */
        if (!records.support_request) {
            throw new Error('Support request does not exist');
        }

        /**
         * Abort if file type is unknown
         */
        if (!records.file_type) {
            throw new Error('Unknown file type');
        }

        /**
         * Upload the attachment and get the urls for upload and view
         */
        const upload_result = await UploadAttachment(user_id, records.support_request, records.file_type, metadata, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify(upload_result)
        };
    } catch (err) {
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
 * The Upload Attachment result object
 * @typedef {Object} UploadAttachmentOutput
 * @property {string} file_upload_id                        the id of the file upload record
 * @property {string} view_url                              the signed url to view the upload
 * @property {string} upload_url                            the signed url to upload the file to S3
 * @property {string} expires_in                            the duration after which the urls would become invalid
 * @property {Date} expires_at                              the timestamp after which the urls would become invalid
 */


/**
 * The File type object
 * @typedef {Object} FileType
 * @property {string} id        the id of the file type record
 * @property {string} title     the title of the file type
 */

/**
 * The File upload object
 * @typedef {Object} FileUpload
 * @property {string} FileUpload.id                                 the id of the file upload record
 * @property {Object} FileUpload.file_object                        info about the file
 * @property {string} FileUpload.file_object.original_filename      the original filename of the file
 * @property {string} FileUpload.file_object.key                    the filename as on S3 of the file
 */

/**
 * The Support request object
 * @typedef {Object} SupportRequest
 * @property {string} SupportRequest.id
 * @property {string[]} SupportRequest.attachments
 */

/**
 * Get File type and Support request records
 * @param {string} mime_type            the mime type of the document ('image/jpeg' | 'image/png' | 'application/pdf' ...)
 * @param {string} support_request_id   the id of the support request record
 * @param {string} Authorization        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<{file_type: FileType, support_request: SupportRequest}>} the fetched file type and support request records
 */
const GetFileTypeAndSupportRequest = async (mime_type, support_request_id, Authorization) => {
    /**
     * Define a GraphQL query to fetch type records
     * Details fetched are
     *  - file_type
     *      - id        the id of the file_type record
     *      - title     the name of the record
     *  - support_request
     *      - id                the id of the supprt request
     *      - attachments       the attachments for this support request (Array of file upload ids)
     */
    const query = `
        query($mime_type:String!, $support_request_id: uuid!){
            file_type: yt_file_type(
                where:{
                    mime_types: {_has_key: $mime_type}
                }
            ){
                id
                title
            }

            support_request: yt_support_request_by_pk(id: $support_request_id){
                id
                attachments
            }
        }
    `;

    /**
     * Run the query on Hasura GraphQL engine
     * Use admin secret to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                mime_type,
                support_request_id
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if file type does not match
     */
    if (!res.data.file_type.length) {
        throw new Error('Unknown file type');
    }

    /**
     * Else return the fetched file type and support request records
     */
    return {
        support_request: res.data.support_request,
        file_type: res.data.file_type[0]
    };
}

/**
 * Upload a new attachment file to support request
 * @param {string} user_id                              the id of the user whose support request is updated
 * @param {SupportRequest} support_request              the support request object
 * @param {FileType} file_type                          the file type object
 * @param {{mime_type: string, title: string}} metadata the info about the file to upload
 * @param {string} Authorization                        the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<UploadAttachmentOutput>} the upload attachment result
 */
const UploadAttachment = async (user_id, support_request, file_type, metadata, Authorization) => {
    /**
     * Create a new file upload record for the attachment
     */
    let attachment_upload = await CreateFileUpload(user_id, file_type, metadata, Authorization);

    /**
     * Link file upload record to support request record
     */
    await LinkFileUploadToSupportRequest(support_request, attachment_upload, Authorization);

    /**
     * Generate view and upload urls for the photo
     */
    let view_url = await GetAccessUrl(AWS_S3_BUCKET, attachment_upload.file_object.key, 'getObject',metadata.mime_type);
    let upload_url = await GetAccessUrl(AWS_S3_BUCKET, attachment_upload.file_object.key, 'putObject',metadata.mime_type);

    /**
     * Generate timestamp for an hour. The urls will become invalid after this timestamp(approx)
     */
    let expires_at = new Date(new Date().valueOf() + (SIGNED_URL_EXPIRES_IN * 1000));

    return {
        file_upload_id: attachment_upload.id,
        view_url,
        upload_url,
        expires_in: `${SIGNED_URL_EXPIRES_IN} seconds`,
        expires_at
    };
}

/**
 * Create a file upload record for the support request attachment
 * @param {string} user_id                                  the id of the user uploading the photo
 * @param {FileType} file_type                              the file type object
 * @param {{mime_type: string, title: string}} metadata     info about the file to upload
 * @param {string} Authorization                            the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<FileUpload>}  the newly created file upload record
 */
const CreateFileUpload = async (user_id, file_type, metadata, Authorization) => {
    /**
     * The extension is the part after the '/' in mimetype. eg., for 'image/png', extension is 'png'
     * @type {string}
     */
    let extension = metadata.mime_type.slice(metadata.mime_type.indexOf('/') + 1);

    /**
     * Generate a random uuid for the file
     */
    let uuid = uuidv4();

    /**
     * Key (filename on S3) is formatted in a particular way
     */
    let key = `support_request/${user_id}/${uuid}.${extension}`;

    /**
     * Define a GraphQL mutation for inserting a new file upload record
     * Details inserted are
     *  - user_id
     *  - file_type_id
     *  - file_object
     *      - original_filename
     *      - key
     *  - storage_provider
     *  - target_entity
     */
    const query = `
        mutation($user_id: uuid!, $file_type_id: uuid!, $file_object: jsonb!){
            file_upload: insert_yt_file_upload_one(object: {
                user_id: $user_id,
                file_type_id: $file_type_id,
                file_object: $file_object,
                storage_provider: "AWS S3",
                target_entity: "support_request"
            }){
                id
                file_object
            }
        }
    `;

    /**
     * Run the GraphQL mutation on the Hasura GraphQL engine
     * Use user authorization header to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                user_id,
                file_type_id: file_type.id,
                file_object: {
                    original_filename: metadata.title,
                    key
                }
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the newly created file upload record
     */
    return res.data.file_upload;
}

/**
 * Link the file upload to support request
 * @param {SupportRequest} support_request      the support request object
 * @param {FileUpload} file_upload              the file upload object
 * @param {string} Authorization                the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<{id: string}>} the updated support request
 */
const LinkFileUploadToSupportRequest = async (support_request, file_upload, Authorization) => {
    /**
     * Define the GraphQL mutation to update support request
     * Details updated are
     *  - attachments       the newly created file upload is added to attachments list of file upload ids
     */
    const query = `
        mutation($support_request_id: uuid!, $attachments:jsonb!){
            support_request: update_yt_support_request_by_pk(
                pk_columns:{
                    id:$support_request_id
                }
                _set:{
                    attachments:$attachments
                }
            ){
                id
            }
        }
    `;

    /**
     * If support request's attachments field is null, set it to empty array `[]`
     */
    if (!support_request.attachments) {
        support_request.attachments = [];
    }

    /**
     * Add the new file upload id to the support request's `attachments` array
     */
    support_request.attachments.push(file_upload.id);

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
     * Use user authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                support_request_id: support_request.id,
                attachments: support_request.attachments
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Else return the the updated support request
     */
    return res.data.support_request;
}

/**
 * GetAccessUrl gets a signed url for the key with GET | PUT access
 * @param {string} Bucket the S3 bucket name
 * @param {string} Key the S3 objcect's key
 * @param {string} method the access method 'getObject' | 'putObject' @default 'getObject'
 * 
 * @returns {string} the signed url with GET | PUT access
 */
const GetAccessUrl = (Bucket, Key, method = 'getObject',mime_type) => new Promise((resolve, reject) => {
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
        } else {
            resolve(url)
        }
    });
})
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
            throw new Error('UNAUTHORIZED: You are not authorized delete file.');
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
         * Abort if the file upload record is not found
         */
        if (!file_upload) {
            throw new Error('File upload record not found');
        }


        /**
         * Check file ownership 
         */
        if (user_id !== file_upload.user_id) {
            throw new Error('UNAUTHORIZED: You can not delete this file.');
        }

        /**
         * Unlink/Delete the record associated with this file upload
         */
        let unlink_result = await UnlinkFileUpload(file_upload.target_entity, file_upload.id, Authorization);

        /**
         * Delete the file upload record
         */
        const deleted_record = await DeleteFileUpload(file_upload_id, Authorization);

        /**
         * The Operation performed on the record linked/targeted by the file upload
         *  - 'DELETE' for target_entity = 'driver_doc' | 'vehicle_doc'
         *  - 'UPDATE' for target_entity = 'user' | 'vehicle'
         * @type {string}
         */
        let target_record_operation = null;
        if (deleted_record.target_entity === 'user' ||
            deleted_record.target_entity === 'vehicle' ||
            deleted_record.target_entity === 'ride' ||
            deleted_record.target_entity === 'payment' ||
            deleted_record.target_entity === 'support_request' ||
            deleted_record.target_entity === 'support_request_comment'
            ) {
            target_record_operation = 'UPDATE';
        }
        else if (
            deleted_record.target_entity === 'vehicle_doc' ||
            deleted_record.target_entity === 'driver_doc' ||
            deleted_record.target_entity === 'sales_user_doc'
        ) {
            target_record_operation = 'DELETE';
        }

        /**
         * Delete the actual uploaded file from S3
         */
        await DeleteFileFromS3(AWS_S3_BUCKET, deleted_record.file_object.key);

        return {
            statusCode: 200,
            body: JSON.stringify({
                file_upload_id: deleted_record.id,
                file_object: deleted_record.file_object,
                target_entity: deleted_record.target_entity,
                target_record_id: unlink_result.modified_record.id,
                target_record_operation
            })
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
 * @property {string} FileUpload.target_entity                  the entity related to this file upload ('driver_doc' | 
 *                                                                  'vehicle' | 'vehicle_doc' | 'user')
 */

/**
 * Fetch the file upload record
 * @param {string} file_upload_id       the id of the file upload
 * @param {string} Authorization        the authorization header used to authorize with Hasura
 * 
 * @returns {Promise<FileUpload>}       the file upload record
 */
const GetFileUpload = async (file_upload_id, Authorization) => {
    
    let query = `
        query($file_upload_id: uuid!){
            file_upload: yt_file_upload_by_pk(id:$file_upload_id){
                id
                file_object
                target_entity
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
     * Else return the file upload record
     */
    return res.data.file_upload;
}

/**
 * Delete a particular file upload record
 * @param {String} file_upload_id the id of the file upload record
 * @param {String} Authorization the complete authorization header to authorize with Hasura
 * 
 * @returns {Promise<FileUpload>} the deleted file upload record
 */
const DeleteFileUpload = async (file_upload_id, Authorization) => {
   
    
    let query = `
        mutation($file_upload_id: uuid!){
            deleted_record: delete_yt_file_upload_by_pk(id:$file_upload_id){
                id
                file_object
                target_entity
            }
        }
    `;

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
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
     * Else return the deleted file upload record
     */
    return res.data.deleted_record;
}

/**
 * The Update/Modify Operation Result
 * @typedef {Object} UpdateOrDeleteOutput
 * @property {number} UpdateOrDeleteOutput.affected_rows        the number of rows affected by the operation
 * @property {Object} UpdateOrDeleteOutput.modified_record      the record modified (updated/deleted)
 * @property {string} UpdateOrDeleteOutput.modified_record.id   the id of the modified record
 */

/**
 * Unlink/Delete the record linked with the file upload. 
 *  - Deleted for `vehicle_doc` | `driver_doc`
 *  - Unlink for `user` | `vehicle`
 * 
 * @param {string} target_entity the entity where the file upload is associated ('user' | 'vehicle' | 'vehicle_doc' | 'driver_doc')
 * @param {string} file_upload_id the id of the file upload
 * @param {string} Authorization the user's Bearer token authorization header
 * 
 * @returns {Promise<UpdateOrDeleteOutput>} the update/delete result. Set to `null` if no records match
 */
const UnlinkFileUpload = async (target_entity, file_upload_id, Authorization) => {

    var update_mutation = '';
    switch (target_entity) {
        case 'user':
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: update_yt_user(
                        where:{
                            profile_photo_file_id: {_eq: $file_upload_id}
                        }
                        _set:{
                            profile_photo_file_id: null
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }
            `;
            break;
        case 'driver_doc':
            /**
             * Driver doc exists only to provide link to uploaded file.
             * So delete the `driver_doc` record
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: delete_yt_driver_doc(
                        where:{
                            file_upload_id: {_eq: $file_upload_id}
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }              
            `;
            break;
        case 'vehicle':
            /**
             * In case of vehicle photo, the file upload id is in `photo_file_id` field
             * So set it to null
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: update_yt_vehicle(
                        where:{
                            photo_file_id: {_eq: $file_upload_id}
                        }
                        _set:{
                            photo_file_id: null
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }              
            `;
            break;
        case 'vehicle_doc':
            /**
             * Vehicle doc exists only to provide link to uploaded file.
             * So delete the `vehicle_doc` record
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: delete_yt_vehicle_doc(
                        where:{
                            file_upload_id: {_eq: $file_upload_id}
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }
            `;
            break;
        case 'sales_user_doc':
            /**
             * Sales user doc exists only to provide link to uploaded file.
             * So delete the `sales_user_doc` record
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: delete_yt_sales_user_doc(
                        where:{
                            file_upload_id: {_eq: $file_upload_id}
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }
            `;
            break;
        case 'ride':
            /**
             * In case of ride route map photo, the file upload id is in `route_map_file_id` field
             * So set it to null
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: update_yt_ride(
                        where:{
                            route_map_file_id: {_eq: $file_upload_id}
                        }
                        _set:{
                            route_map_file_id: null
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }              
            `;
            break;
        case 'payment':
            /**
             * In case of payment invoice file, the file upload id is in `invoice_file` field
             * So set it to null
             */
            update_mutation = `
                mutation ($file_upload_id: uuid!){
                    result: update_yt_payment(
                        where:{
                            invoice_file: {_eq: $file_upload_id}
                        }
                        _set:{
                            invoice_file: null
                        }
                    ){
                        affected_rows
                        modified_record: returning{
                            id
                        }
                    }
                }              
            `;
            break;
        case 'support_request':
            let support_request = await UnlinkAttachment(file_upload_id, Authorization);

            return {
                affected_rows: 1,
                modified_record: support_request
            };
        case 'support_request_comment':
            let support_request_comment = await UnlinkAttachmentSRC(file_upload_id, Authorization);

            return {
                affected_rows: 1,
                modified_record: support_request_comment
            };
        default:
            throw new Error(`Unknown target in file upload. Can't unlink.`)
    }

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
     * Use user's Authorization header to authorize
     */
    let res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query: update_mutation,
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
     * Throw if no record modified
     */
    if(!res.data.result.modified_record.length){
        throw new Error('File upload not linked to any target');
    }

    /**
     * Else return the update/delete result
     */
    return {
        affected_rows: res.data.result.affected_rows,
        modified_record: res.data.result.modified_record[0]
    };
}

/**
 * The Support Request object
 * @typedef {Object} SupportRequest
 * @property {string} SupportRequest.id             the id of the support request record
 * @property {string[]} SupportRequest.attachments  the list of file upload attachments
 */

/**
 * Delete an attachment from support request
 * 
 * @param {string} attachment_upload                the id of the attachment file upload
 * @param {string} Authorization                    the authorization header to auhorize with Hasura
 * 
 * @returns {Promise<{id: string}>}                 the updated support request record
 */
const UnlinkAttachment = async (attachment_upload_id, Authorization) => {
    /**
     * Fetch the support request record
     */
    let support_request = await GetSupportRequestContainingAttachment(attachment_upload_id, Authorization);

    /**
     * Remove the attachment file upload from the list of attachments
     */
    support_request.attachments = support_request.attachments.filter(attachment => {
        return attachment.id !== attachment_upload_id
    })

    /**
     * Define the GraphQL mutation to update support request
     * Details updated are
     *  - attachments       the to be deleted file upload is removed from attachments list of the support request
     */
    const query = `
        mutation ($support_request_id: uuid!, $attachments: jsonb!) {
            support_request: update_yt_support_request_by_pk(
                pk_columns: {
                    id: $support_request_id
                }
                _set: {
                    attachments: $attachments
                }
            ) {
                id
            }
        }      
    `;

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
     * Use user authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
 * Get the support request record
 * @param {string} attachment_upload_id     the id of the attachment file upload contained in the support request
 * @param {string} Authorization            the authorization header to use to authorize with Hasura
 * 
 * @returns {Promise<SupportRequest>}       the fetched support request
 */
const GetSupportRequestContainingAttachment = async (attachment_upload_id, Authorization) => {
    /**
     * Define a GraphQL query to fetch the support request record
     * Details fetched are
     *  - id
     *  - attachments
     */
    const query = `
        query ($file_ids: jsonb!) {
            support_requests: yt_support_request(
                where: {
                    attachments: {_contains: $file_ids}
                }) 
            {
                id
                attachments
            }
        }
    `;

    /**
     * Run the GraphQL query on Hasura engine
     * Use user authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                file_ids: [{"id": attachment_upload_id}]
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if support request does not exist
     */
    if(!res.data.support_requests.length){
        throw new Error('Support request does not exist');
    }

    /**
     * Else return the support request record
     */
    return res.data.support_requests[0];
}


/**
 * Delete an attachment from support request
 * 
 * @param {string} attachment_upload                the id of the attachment file upload
 * @param {string} Authorization                    the authorization header to auhorize with Hasura
 * 
 * @returns {Promise<{id: string}>}                 the updated support request record
 */
const UnlinkAttachmentSRC = async (attachment_upload_id, Authorization) => {
    /**
     * Fetch the support request record
     */
    let support_request_comment = await GetSupportRequestCommentContainingAttachment(attachment_upload_id, Authorization);

    /**
     * Remove the attachment file upload from the list of attachments
     */
    support_request_comment.attachments = support_request_comment.attachments.filter(attachment => {
        return attachment.id !== attachment_upload_id
    });

    /**
     * Define the GraphQL mutation to update support request
     * Details updated are
     *  - attachments       the to be deleted file upload is removed from attachments list of the support request
     */
    const query = `
        mutation ($support_request_comment_id: uuid!, $attachments: jsonb!) {
            support_request_comment: update_yt_support_request_comment_by_pk(
                pk_columns: {
                    id: $support_request_comment_id
                }
                _set: {
                    attachments: $attachments
                }
            ) {
                id
            }
        }      
    `;

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
     * Use user authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                support_request_comment_id: support_request_comment.id,
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
 * Get the support request comment record
 * 
 * @param {string} attachment_upload_id     the id of the attachment file upload contained in the support request
 * @param {string} Authorization            the authorization header to use to authorize with Hasura
 * 
 * @returns {Promise<SupportRequest>}       the fetched support request
 */
const GetSupportRequestCommentContainingAttachment = async (attachment_upload_id, Authorization) => {
    /**
     * Define a GraphQL query to fetch the support request record
     * Details fetched are
     *  - id
     *  - attachments
     */
    const query = `
        query ($file_ids: jsonb!) {
            support_requests: yt_support_request_comment(
                where: {
                    attachments: {_contains: $file_ids}
                }) 
            {
                id
                attachments
            }
        }
    `;

    /**
     * Run the GraphQL query on Hasura engine
     * Use user authorization header to authorize
     */
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                file_ids: [{"id": attachment_upload_id}]
            }
        })
    }).then(res => res.json())

    /**
     * If error(s) occur throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw if support request does not exist
     */
    if(!res.data.support_requests.length){
        throw new Error('Support request does not exist');
    }

    /**
     * Else return the support request record
     */
    return res.data.support_requests[0];
}

/**
 * Deletes a file from AWS S3 bucket
 * @param {string} bucket the name of the bucket which holds the file
 * @param {string} key the filename of the file as on S3
 * 
 * @returns {Promise<AWS.S3.DeleteObjectOutput>} the AWS S3 returned delete operation output
 */
const DeleteFileFromS3 = async (bucket, key) => new Promise((resolve, reject) => {
    S3.deleteObject({
        Bucket: bucket,
        Key: key
    }, (err, data) => {
        if (err) {
            reject(err)
        }
        else {
            resolve(data)
        }
    })
})
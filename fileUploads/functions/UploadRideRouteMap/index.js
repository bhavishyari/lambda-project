const fetch = require('node-fetch');
const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { GetAccessUrl } = require('../common/GetSignedUrl');

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
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const SIGNED_URL_EXPIRES_IN = parseInt(process.env.SIGNED_URL_EXPIRES_IN);
// const SIGNED_URL_EXPIRES_IN = (60*60*24*50000);

module.exports.handler = async event => {
    try {
        const body = JSON.parse(event.body);

        /**
         * Get the authorization header of the user calling this action
         */
        const Authorization = event.headers.Authorization;

        /**
         * The id of the user
         */
        const user_id = body.session_variables['x-hasura-user-id'];

        /**
         * Metadata for the upload
         * @type {{mime_type: string, title: string}} the mime type and title of the file to upload
         */
        const metadata = body.input.metadata;

        if (!metadata) {
            throw new Error('metadata required');
        }

        /**
         * entity id
         */
        const entity_id = body.input.entity_id;

        if (!entity_id) {
            throw new Error('entity_id required');
        }

        /**
         * entity name
         */
        const entity = 'ride';

        /**
         * entity field name
         */
        const entity_field = 'route_map_file_id';

        /**
         * Get the file type record for the file upload
         */
        let file_type = await GetFileType(metadata.mime_type, Authorization);
        // console.log({ file_type });

        /**
         * Create and attach upload record
         */
        let file_upload = await UploadFile(entity, entity_id, entity_field, user_id, file_type, metadata, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify(file_upload)
        };
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
 * The File type object
 * @typedef {Object} FileType
 * @property {string} id        the id of the file type record
 * @property {string} title     the title of the file type
 */

/**
 * Get File type record
 * @param {string} mime_type                    the mime type of the document ('image/jpeg' | 'image/png' | 'application/pdf' ...)
 * @param {string} Authorization                the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<FileType>}                 the file type record
 */
const GetFileType = async (mime_type, Authorization) => {
    /**
     * Define a GraphQL query to fetch type records
     * Details fetched are
     *  - file_type
     *      - id        the id of the file_type record
     *      - title     the name of the record
     */
    const query = `
        query($mime_type: String!){
            file_type: yt_file_type(
                where:{
                    mime_types: {_has_key: $mime_type}
                }
            ){
                id
                title
            }
        }
    `;

    /**
     * Run the query on Hasura GraphQL engine
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
                mime_type
            }
        })
    }).then(res => res.json());

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

    /**
     * Throw error if no file type record matched
     */
    if(!res.data.file_type.length){
        throw new Error('Unknown file type');
    }

    /**
     * Else return the first record from the fetched file type record list
     */
    return res.data.file_type[0];
}

/**
 * The file upload result object
 * @typedef {Object} FileUpload
 * @property {string} FileUpload.file_upload_id     the id of the file upload record
 * @property {string} FileUpload.view_url           the url to view the photo
 * @property {string} FileUpload.upload_url         the url to upload the photo
 * @property {string} FileUpload.expires_in         the duration after which the urls will become invalid
 * @property {Date} FileUpload.expires_at           the timestamp after which the urls will become invalid
 */

/**
 * Upload a file
 * 
 * @param {string} entity                               the entity name
 * @param {string} entity_id                            the entity record id
 * @param {string} entity_field                         the entity field name
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {FileType} file_type                          the file type record for the photo
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<FileUpload>}                       the file upload result
 */
const UploadFile = async (entity, entity_id, entity_field, user_id, file_type, metadata, Authorization) => {
    /**
     * Create a new file upload record
     */
    let file_upload = await CreateFileUpload(entity, user_id, file_type, metadata, Authorization);

    /**
     * Attach file upload to entity
     */
    let view_url = await GetAccessUrl(AWS_S3_BUCKET, file_upload.file_object.key, 'getObject',metadata.mime_type);

    await LinkFileUploadToEntity(entity, entity_id, entity_field, file_upload.id, Authorization,view_url);

    /**
     * Generate view and upload urls for the photo
     */
    let upload_url = await GetAccessUrl(AWS_S3_BUCKET, file_upload.file_object.key, 'putObject',metadata.mime_type);

    /**
     * Generate timestamp for an hour. The urls will become invalid after this timestamp(approx)
     */
    let expires_at = new Date(new Date().valueOf() + (SIGNED_URL_EXPIRES_IN * 1000));

    return {
        file_upload_id: file_upload.id,
        view_url,
        upload_url,
        expires_in: `${SIGNED_URL_EXPIRES_IN} seconds`,
        expires_at
    };
}

/**
 * The File upload object
 * @typedef {Object} FileUpload
 * @property {string} FileUpload.id                                 the id of the file upload record
 * @property {Object} FileUpload.file_object                        info about the file
 * @property {string} FileUpload.file_object.original_filename      the original filename of the file
 * @property {string} FileUpload.file_object.key                    the filename as on S3 of the file
 */

/**
 * Create a file upload record for the vehicle photo
 * @param {string} entity                               the name of entity
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {FileType} file_type                          the file type object
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<FileUpload>}  the newly created file upload record
 */
const CreateFileUpload = async (entity, user_id, file_type, metadata, Authorization) => {
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
    let key = `${entity}/${user_id}/${uuid}.${extension}`;

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
                target_entity: "ride"
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
                    // bucket: AWS_S3_BUCKET,
                    original_filename: metadata.title,
                    key
                }
            }
        })
    }).then(res => res.json());

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
 * Link file upload to entity record
 * @param {string} entity                   the name of entity to update
 * @param {string} entity_id                the id of entity to update
 * @param {string} entity_field             the name of field to update
 * @param {string} file_upload_id           the id of the file upload to set in the record
 * @param {string} Authorization            the authorization header to use
 * 
 * @returns {Promise<{id: string}>}         the updated user record
 */
const LinkFileUploadToEntity = async (entity, entity_id, entity_field, file_upload_id, Authorization,view_url) => {
    /**
     * Define a graphQL mutation to update the record
     */
    const query = `
        mutation($entity_id: uuid!, $file_upload_id: uuid!,$view_url:String!){
            updated_record: update_yt_${entity}_by_pk(
                pk_columns: {
                    id: $entity_id
                }
                _set: {
                    ${entity_field}: $file_upload_id
                    route_map_image_url: $view_url
                }
            ){
                id
            }
        }
    `;

    /**
     * Run the GraphQL mutation on the Hasura GraphQL engine
     * Use user authorization header to authorize
     */



    //  let content = await fileGetContents(view_url);

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
                entity_id,
                file_upload_id,
                view_url
            }
        })
    }).then(res => res.json());

    /**
     * If error(s) occur, throw the first one
     */
    if (res.errors) {
        throw new Error(res.errors[0].message);
    }

console.log('updated target entity : res.data : ', res.data);

    /**
     * Else return the updated user record
     */
    return res.data.updated_record;
}

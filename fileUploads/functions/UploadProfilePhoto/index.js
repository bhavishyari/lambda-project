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
    region:'us-west-2',
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

        console.log(body,'body_data')
        /**
         * Get the authorization header of the user calling this action
         */
        const Authorization = event.headers.Authorization;

        /**
         * The id of the user to upload profile photo for
         */
         const user_id = body.session_variables['x-hasura-user-id'];
        //const user_id = body.input.user_id;


        /**
         * Metadata for the upload
         * @type {{mime_type: string, title: string}} the mime type and title of the file to upload
         */
        const metadata = body.input.metadata;

        /**
         * Get the file type record for the photo to upload
         */
        let file_type = await GetFileType(metadata.mime_type, Authorization);
        console.log({ file_type });

        /**
         * Create and attach upload record for vehicle photo
         */
        let profile_photo = await UploadProfilePhoto(user_id, file_type, metadata, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify(profile_photo)
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
    }).then(res => res.json())

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
 * The Profile Photo Upload result object
 * @typedef {Object} ProfilePhotoUpload
 * @property {string} ProfilePhotoUpload.file_upload_id     the id of the file upload record
 * @property {string} ProfilePhotoUpload.view_url           the url to view the photo
 * @property {string} ProfilePhotoUpload.upload_url         the url to upload the photo
 * @property {string} ProfilePhotoUpload.expires_in         the duration after which the urls will become invalid
 * @property {Date} ProfilePhotoUpload.expires_at           the timestamp after which the urls will become invalid
 */

/**
 * Upload a profile photo for a particular user
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {FileType} file_type                          the file type record for the photo
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<ProfilePhotoUpload>}               the Profile photo upload result
 */
const UploadProfilePhoto = async (user_id, file_type, metadata, Authorization) => {
    /**
     * Create a new file upload record for vehicle photo
     */
    let photo_upload = await CreateFileUpload(user_id, file_type, metadata, Authorization);
    console.log(photo_upload,'photo_upload')

    /**
     * Attach photo file upload to user
     */
     let view_url = await GetAccessUrl(AWS_S3_BUCKET, photo_upload.file_object.key, 'getObject', metadata.mime_type);

    await LinkProfilePhotoUploadToUser(user_id, photo_upload.id, Authorization,view_url);

    /**
     * Generate view and upload urls for the photo
     */
    let upload_url = await GetAccessUrl(AWS_S3_BUCKET, photo_upload.file_object.key, 'putObject', metadata.mime_type);

    console.log(view_url,upload_url,'view url, upload url');
    /**
     * Generate timestamp for an hour. The urls will become invalid after this timestamp(approx)
     */
    let expires_at = new Date(new Date().valueOf() + (SIGNED_URL_EXPIRES_IN * 1000));

    return {
        file_upload_id: photo_upload.id,
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
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {FileType} file_type                          the file type object
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
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
    let key = `user/${user_id}/${uuid}.${extension}`;

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
                target_entity: "user"
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
 * Link profile photo file upload to user record
 * @param {string} user_id                  the id of the user to update
 * @param {string} profile_photo_file_id    the id of the photo file upload to set in the user record
 * @param {string} Authorization            the authorization header to use
 * 
 * @returns {Promise<{id: string}>}         the updated user record
 */
const LinkProfilePhotoUploadToUser = async (user_id, profile_photo_file_id, Authorization,view_url) => {
    /**
     * Define a graphQL mutation to update the user record
     * Details updated are
     *  - profile_photo_file_id
     */
    const query = `
        mutation($user_id: uuid!, $profile_photo_file_id: uuid!,$view_url:String!){
            user: update_yt_user_by_pk(
                pk_columns: {
                    id: $user_id
                }
                _set: {
                    profile_photo_file_id: $profile_photo_file_id,
                    profile_photo_url:$view_url

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
                profile_photo_file_id,
                view_url
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
     * Else return the updated user record
     */
    return res.data.user;
}

/**
 * GetAccessUrl gets a signed url for the key with GET | PUT access
 * @param {string} Bucket the S3 bucket name
 * @param {string} Key the S3 objcect's key
 * @param {string} method the access method 'getObject' | 'putObject' @default 'getObject'
 * @param {string} mime_type the content type, e.g image/jpeg
 * 
 * @returns {string} the signed url with GET | PUT access
 */
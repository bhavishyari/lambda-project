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
    useSSL: true,
    signatureVersion: 'v4',
    region: 'us-west-2'
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
         * Get the authorization header of the user calling this action
         */
        const Authorization = event.headers.Authorization;

        const user_id = body.session_variables['x-hasura-user-id'];

        /**
         * Metadata for the upload
         * @type {{mime_type: string, title: string}} the mime type and title of the file to upload
         */
        const metadata = body.input.metadata;

        /**
         * The `id` of the vehicle to upload photo for
         * @type {string}
         */
        const vehicle_id = body.input.vehicle_id;

        /**
         * Get the file type record for the photo to upload
         * must use user's authorization token, so can only upload file for own vehicle request.
         */
        let type_records = await GetFileTypeAndVehicle(metadata.mime_type, vehicle_id, Authorization);

        /**
         * Abort if file type is unknown
         */
        if (!type_records.file_type) {
            throw new Error('Unknown file type');
        }

        /**
         * Create and attach upload record for vehicle photo
         */
        let vehicle_photo = await UploadVehiclePhoto(user_id, vehicle_id, type_records.file_type, metadata, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify(vehicle_photo)
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

/**
 * The File and Vehicle type object
 * @typedef {Object} FileTypeAndVehicle
 * @property {Object} file_type
 * @property {string} file_type.id        the id of the file type record
 * @property {string} file_type.title     the title of the file type
 * @property {Object} vehicle
 * @property {string} vehicle.id            the id of the vehicle
 */

/**
 * Get File type record
 * @param {string} mime_type                    the mime type of the document ('image/jpeg' | 'image/png' | 'application/pdf' ...)
 * @param {string} vehicle_id                   the id of the vehicle
 * @param {string} Authorization                the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<FileTypeAndVehicle>}     the file type record
 */
const GetFileTypeAndVehicle = async (mime_type, vehicle_id, Authorization) => {
    /**
     * Define a GraphQL query to fetch type records
     * Details fetched are
     *  - file_type
     *      - id        the id of the file_type record
     *      - title     the name of the record
     */
    const query = `
        query($mime_type:String!, $vehicle_id: uuid!){
            file_type: yt_file_type(
                where:{
                    mime_types: {_has_key: $mime_type}
                }
            ){
                id
                title
            }

            vehicle: yt_vehicle_by_pk(id: $vehicle_id){
                id
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
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                mime_type,
                vehicle_id
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
     * Throw if vehicle not found
     */
    if (!res.data.vehicle) {
        throw new Error('Vehicle not found or is inaccessible');
    }

    /**
     * Throw if file type record does not match
     */
    if (!res.data.file_type.length) {
        throw new Error('Unknown file type');
    }

    /**
     * Else return the first record from the fetched file type records
     */
    return {
        file_type: res.data.file_type[0],
        vehicle: res.data.vehicle
    };
}

/**
 * The Vehicle Photo Upload result object
 * @typedef {Object} VehiclePhotoUpload
 * @property {string} VehiclePhotoUpload.file_upload_id     the id of the file upload record
 * @property {string} VehiclePhotoUpload.view_url           the url to view the photo
 * @property {string} VehiclePhotoUpload.upload_url         the url to upload the photo
 * @property {string} VehiclePhotoUpload.expires_in         the duration after which the urls will become invalid
 * @property {Date} VehiclePhotoUpload.expires_at           the timestamp after which the urls will become invalid
 */

/**
 * Upload a photo for a particular vehicle
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {string} vehicle_id                           the id of the vehicle for which this photo is being uploaded
 * @param {FileType} file_type                          the file type record for the photo
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<VehiclePhotoUpload>} the vehicle photo upload result
 */
const UploadVehiclePhoto = async (user_id, vehicle_id, file_type, metadata, Authorization) => {
    /**
     * Create a new file upload record for vehicle photo
     */
    let photo_upload = await CreateFileUpload(user_id, file_type, metadata, Authorization);

    /**
     * Attach photo file upload to vehicle
     */
    await AddFileUploadToVehicle(vehicle_id, photo_upload.id, Authorization);

    /**
     * Generate view and upload urls for the photo
     */
    let view_url = await GetAccessUrl(AWS_S3_BUCKET, photo_upload.file_object.key, 'getObject',metadata.mime_type);
    let upload_url = await GetAccessUrl(AWS_S3_BUCKET, photo_upload.file_object.key, 'putObject',metadata.mime_type);

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
 * Create a file upload record for the vehicle photo
 * @param {string} user_id                              the id of the user uploading the photo
 * @param {FileType} file_type                          the file type object
 * @param {{mime_type: string, title: string}} metadata info about the file to upload
 * @param {string} Authorization                        the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<{
 * id: string,
 * file_object:{original_filename: string, key: string}
 * }>}  the newly created file upload record
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
    let key = `vehicle/${user_id}/${uuid}.${extension}`;

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
                target_entity: "vehicle"
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
 * Add photo file upload id to vehicle
 * @param {string} vehicle_id                   the id of the vehicle to update
 * @param {string} file_upload_id               the id of the file upload corresponding to vehicle photo
 * @param {string} Authorization                the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<{id: string}}  the updated vehicle record
 */
const AddFileUploadToVehicle = async (vehicle_id, file_upload_id, Authorization) => {
    /**
     * Define a GraphQL mutation for updating vehicle record
     * Details updated are
     *  - photo_file_id
     */
    const query = `
        mutation($vehicle_id: uuid!, $file_upload_id: uuid!){
            updated_record: update_yt_vehicle_by_pk(
                pk_columns: {
                    id: $vehicle_id
                }
                _set:{ 
                    photo_file_id: $file_upload_id 
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
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                vehicle_id,
                file_upload_id
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
     * Else return the updated vehicle record
     */
    return res.data.updated_record;
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
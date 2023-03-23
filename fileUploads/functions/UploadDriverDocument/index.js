const fetch = require('node-fetch');
const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

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
         * Get the authorization header of the user calling this action
         */
        const Authorization = event.headers.Authorization;

        const user_id = body.session_variables['x-hasura-user-id'];

        /**
         * The role of current user
         */
        const user_role = body.session_variables['x-hasura-role'];

        /**
         * Check user role
         */
        if (!['driver'].includes(user_role)) {
            throw new Error('UNAUTHORIZED: You are not authorized upload driver doc file.');
        }

        /**
         * The document type ('DL' | 'IDP' i.e, Driving License | ID Proof)
         */
        const document_type = body.input.document_type;

        /**
         * Metadata for the upload
         * @type {{mime_type: string, title: string}} the mime type and title of the file to upload
         */
        const metadata = body.input.metadata;

        let type_records = await GetFileAndDocType(document_type, metadata.mime_type, Authorization);

        /**
         * Create new file upload and associate a driver document with it
         */
        let doc_upload = await UploadDriverDocument(user_id, type_records.file_type, type_records.doc_type, metadata, Authorization);

        return {
            statusCode: 200,
            body: JSON.stringify(doc_upload)
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
 * The Document type object
 * @typedef {Object} DocType
 * @property {string} id        the id of the document type record
 * @property {string} title     the name of the document type
 */

/**
 * The File type object
 * @typedef {Object} FileType
 * @property {string} id        the id of the file type record
 * @property {string} title     the title of the file type
 */


/**
 * Get File type and document type objects
 * @param {string} document_type                the type of document 'DL' | 'IDP'
 * @param {string} mime_type                    the mime type of the document ('image/jpeg' | 'application/pdf' ...)
 * @param {string} Authorization                the authorization header to use to fetch records from Hasura
 * 
 * @returns {Promise<{file_type: FileType, doc_type: DocType}>} the type records
 */
const GetFileAndDocType = async (document_type, mime_type, Authorization) => {
    /**
     * Define a GraphQL query to fetch type records
     * Details fetched are
     *  - file_type
     *      - id        the id of the file_type record
     *      - title     the name of the record
     *  - doc_type
     *      - id        the id of the doc_type record
     *      - title     the name of the record
     */
    const query = `
        query($mime_type:String!, $document_type: String!){
            file_type: yt_file_type(
                where:{
                    mime_types: {_has_key: $mime_type}
                }
            ){
                id
                title
            }
            
            doc_type: yt_doc_type(
                where:{
                    title: {_eq: $document_type}
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
            Authorization
        },
        body: JSON.stringify({
            query,
            variables: {
                document_type,
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
    if (!res.data.file_type.length) {
        throw new Error('Unknown file type');
    }

    /**
     * Throw error if no doc type record matched
     */
    if (!res.data.doc_type.length) {
        throw new Error('Unknown document type');
    }

    /**
     * Else return the fetched type records
     */
    return {
        file_type: res.data.file_type[0],
        doc_type: res.data.doc_type[0]
    };
}

/**
 * Driver document upload object
 * @typedef {Object} DriverDocumentUpload
 * @property {string} DriverDocumentUpload.file_upload_id   the id of the file upload
 * @property {string} DriverDocumentUpload.view_url         the viewing url
 * @property {string} DriverDocumentUpload.upload_url       the url used to upload
 * @property {string} DriverDocumentUpload.key              the filename as on AWS S3
 * @property {string} DriverDocumentUpload.expires_in       the duration after which the urls would be invalid
 * @property {Date} DriverDocumentUpload.expires_at         the time at which the urls would be invalid
 */

/**
 * Create the upload document for driver
 * @param {string} user_id                      the id of the user uploading the document
 * @param {FileType} file_type                  the file type record
 * @param {DocType} doc_type                    the document type record
 * @param {{mime_type: string, title: string}}  metadata the info about the file to upload
 * @param {string} Authorization                the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<DriverDocumentUpload>} the driver document upload object
 */
const UploadDriverDocument = async (user_id, file_type, doc_type, metadata, Authorization) => {
    /**
     * Create a file upload record for the driver document
     */
    let file_upload = await CreateDriverFileUpload(user_id, file_type, metadata, Authorization);

    /**
     * Create a new driver document with attached file upload record
     */
    await CreateDriverDocument(user_id, file_upload.id, doc_type, Authorization);

    /**
     * Generate view and upload urls for the photo
     */
    let view_url = await GetAccessUrl(AWS_S3_BUCKET, file_upload.file_object.key, 'getObject',metadata.mime_type);
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
    }
}

/**
 * Create a new file upload record
 * @param {string} user_id                                  the id of the user uploaing the file
 * @param {FileType} file_type                              the file type record
 * @param {{mime_type: string, title: string}} metadata     info about the file to upload
 * @param {string} Authorization                            the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<{id: string, 
 * file_object: {orifinal_filename: string, key: string}
 * }>} the newly created file upload object
 */
const CreateDriverFileUpload = async (user_id, file_type, metadata, Authorization) => {
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
    let key = `driver_doc/${user_id}/${uuid}.${extension}`;

    /**
     * Define a GraphQL mutation for creating a new file upload record
     * Details inserted are
     *  - user_id               the id of the user creating the upload
     *  - file_type_id          the id of the file type which the upload document belongs to
     *  - file_object           details about the file
     *      - original_filename the filename as given by the user
     *      - key               the filename as stored on storage provider
     *  - storage_provider      the storage provider 'AWS S3'
     *  - target_entity         the target table name for this upload 'driver_doc'
     */
    const query = `
        mutation($user_id: uuid!, $file_type_id: uuid!, $file_object: jsonb!){
            file_upload:insert_yt_file_upload_one(object:{
                user_id:$user_id,
                file_type_id:$file_type_id,
                file_object:$file_object,
                storage_provider: "AWS S3",
                target_entity: "driver_doc"
            }){
                id
                file_object
            }
        }
    `;

    /**
     * Run the GraphQL mutation on Hasura GraphQL engine
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
     * Else return the newly created file upload object
     */
    return res.data.file_upload;
}

/**
 * Create a driver document
 * @param {string} user_id                      the id of the user creating the document
 * @param {string} file_upload_id               the id of the file upload
 * @param {DocType} doc_type                    the document type object
 * @param {string} Authorization                the authorization header to use authorize with Hasura
 * 
 * @returns {Promise<{id: string}>} the newly created driver document record
 */
const CreateDriverDocument = async (user_id, file_upload_id, doc_type, Authorization) => {
    /**
     * Define GraphQL mutation to insert new driver document
     * Details inserted are
     *  - user_id
     *  - file_upload_id
     *  - doc_type_id
     */
    const query = `
        mutation($user_id: uuid!, $file_upload_id: uuid!, $doc_type_id: uuid!){
            driver_doc: insert_yt_driver_doc_one(object: {
                user_id: $user_id,
                file_upload_id: $file_upload_id,
                doc_type_id: $doc_type_id
            }){
                id
            }
        }
    `;

    /**
     * Run the mutation on Hasura graphQL engine
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
                file_upload_id,
                doc_type_id: doc_type.id
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
     * Else return the newly created driver document record
     */
    return res.data.driver_doc;
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
        }
        else {
            resolve(url)
        }
    });
})
const Promise = require('bluebird-extra');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const unlink = Promise.promisify(fs.unlink, fs);
const AWS = require('aws-sdk');


var s3 = new AWS.S3({
    accessKeyId: process.env.S3_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_USER_SECRET_ACCESS_KEY,
    useSSL: true,
    signatureVersion: 'v4',
    region: 'us-west-2'
});


s3Upload = {};

//using to upload file or any document to s3 server. This function using always after upload file in uploads folder using *oneFile or multiFile* in the index.js 
s3Upload.uploadSingleMediaToS3 = function () {
    var files = fetchFilesFromReq(req);

    if (files) {

        var file = files[0];
        var params = {
            Bucket: options.cfg.s3.bucketName,
            Key: String(file.filename),
            Body: fs.createReadStream(file.path),
            ACL: options.cfg.s3.ACL
        };
        s3.upload(params, function (err, data) {
            if (err) {
                console.log("error", err)
            }
            if (data) {
                console.log("data", data)

                let location = process.env.cloudFrontUrl + data.key
                deleteFiles(_.map(files, 'path'));
                return location;
                //req.body.location = data.Location;
            }
        });
    }

}


s3Upload.uploadMultipleMediaToS3 = function (keys) {

    var files = _fetchMultipleFilesFromReq(req, keys);
    if (files) {
        Promise.mapSeries(files, function (file) {
                return uploadToS3(options.cfg.s3.bucketName, String(file.filename), file.path, file.fieldname, file.mimetype);
            })
            .then(function (urls) {
                let makeAr = [];
                urls.forEach(function (url) {
                    makeAr.push(url.location);
                })
                deleteFiles(_.map(files, 'path'));

                return makeAr;
            })
            .catch(function (err) {
                throw err;
            })
    }

}



// this function add *file object* in the req variable after upload file.
function fetchFilesFromReq(req) {
    if (req.file) {
        return [req.file];
    } else if (req.files) {
        return req.files;
    } else {
        //No Data
    }
}

// this function using to delete file after upload file at the *s3 server*
function deleteFiles(filePathList) {
    var promiseArray = [];

    _.each(_.uniq(filePathList), function (path) {
        promiseArray.push(unlink(path))
    })

    Promise.all(promiseArray)
        .then(function () {
            console.log("All Files Deleted Successfully")
        })
        .catch(function (err) {
            console.log(err);
        })
}


function _fetchMultipleFilesFromReq(req) {

    if (req.file) {
        return [req.file];
    } else if (req.files) {
        return req.files;
    } else {
        //No Data
    }
}


function uploadToS3(bucket, key, filePath, fieldname, contentType) {
    return new Promise(function (resolve, reject) {
        var params = {
            Bucket: bucket,
            ContentType: contentType,
            Key: key,
            Body: fs.createReadStream(filePath),
            ACL: options.cfg.s3.ACL
        };
        s3.upload(params, function (err, data) {
            //console.log({data});
            let location = process.env.cloudFrontUrl + data.key

            //console.log({location});return

            if (data) {
                return resolve({
                    field: fieldname,
                    location
                });
            } else {
                return reject(err);
            }
        });
    });
}


module.exports = s3Upload;
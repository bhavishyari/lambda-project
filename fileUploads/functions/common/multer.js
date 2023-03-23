const multer = require('multer');
// const download = require('image-downloader')
const path = require('path');
const { v4: uuidv4 } = require('uuid');
//make storage defination. There is a uploads directory in the root folder every upload in that folder


// const uploadFile = multer({ storage: storage })
const uploadFile = multer({ dest: './llllllluploads/' })

let upload = {};

//the function using to upload single file.
upload.oneFile = function (fileName,event) {
    console.log(fileName,'filename')
    return uploadFile.single(fileName);
}

// the function using to upload multiple file at a time. You can add an array with the same name if you want to upload multiple file at a time.
upload.multiFile = function (fileName) {
    console.log(fileName,' multiFilefilename')
    
    return uploadFile.array(fileName, 30);
}

module.exports = upload

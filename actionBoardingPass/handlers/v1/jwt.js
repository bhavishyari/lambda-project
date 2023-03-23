'use strict'

const admin = require("firebase-admin");
const FIREBASE_CREDENTIAL_FILE = process.env.FIREBASE_CREDENTIAL_FILE;
const serviceAccount = require(__dirname + "/../../" + FIREBASE_CREDENTIAL_FILE);


// init firebase app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * jwt
 * 
 * @class jwt
 */
var jwt = (function () {

  /**
   * Initialized a new instance of @jwt class.
   */
  function jwt() { };

  /**
   * Creates a new @jwt instance.
   */
  jwt.bootstrap = function () {
    return new jwt();
  };

  /**
   * verify id token
   * 
   * @param {String} idToken
   */
  jwt.prototype.verifyIdToken = async function (authHeader) {

    if (!authHeader) {
      throw new Error('Authorization header is missing.');
    }

    const authHeaderParts = authHeader.split(" ");
    if (authHeaderParts[0] !== "Bearer") {
      throw new Error('Authorization token must be Bearer.');
    }

    const idToken = authHeaderParts[1];


    // verify token
    return admin.auth().verifyIdToken(idToken)
      .then(function (decodedToken) {


        return decodedToken;

      }).catch(function (error) {
        // console.log(error);
        throw new Error(error.message);
      });

    // return RH.serverError(err.message);
  };

  return jwt;
}());

module.exports = jwt.bootstrap();

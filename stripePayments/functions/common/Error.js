/**
 * ValidationError
 */
class ValidationError extends Error {

  constructor (message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.code = 400;
  };

  name() {
    return this.name;
  };

  code() {
    return this.code;
  };

}


/**
 * NotFoundError
 */
class NotFoundError extends Error {

  constructor (message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.code = 404;
  };

  name() {
    return this.name;
  };

  code() {
    return this.code;
  };

}


/**
 * AuthorizationError
 */
class AuthorizationError extends Error {

  constructor (message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.code = 403;
  };

  name() {
    return this.name;
  };

  code() {
    return this.code;
  };

}

module.exports = {
  ValidationError,
  NotFoundError,
  AuthorizationError
};

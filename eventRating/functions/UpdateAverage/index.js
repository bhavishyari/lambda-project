'use strict'


const rating = require('../../handlers/v1/rating');

module.exports.handler = async event => {

  event.body = JSON.parse(event.body);
  return rating.execute(event);
}

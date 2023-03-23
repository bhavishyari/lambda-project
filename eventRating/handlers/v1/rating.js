'use strict'

const hasura = require('./hasura');

/**
 * rating
 * 
 * @class rating
 */
var rating = (function () {


  /**
   * Initialized a new instance of @rating class.
   */
  function rating() { };

  /**
   * Creates a new @rating instance.
   */
  rating.bootstrap = function () {
    return new rating();
  };

  /**
   * Execute rating average calculation and update
   * 
   * @param {Object} request
   * 
   * @returns JSON
   */
  rating.prototype.execute = async function (request) {


    let { body, headers } = request;

    try {
      var status = 'fail';
      var data = {};
      if ( body.event.hasOwnProperty('data')
        && body.event.data.hasOwnProperty('new')
        && body.event.data.new.hasOwnProperty('to_user_id')) {

        //  get primary records
        let primaryRecords = await hasura.getAverageRating(body.event.data.new.to_user_id);

        if (primaryRecords.rating_aggregate.hasOwnProperty('aggregate')
        && primaryRecords.rating_aggregate.aggregate.hasOwnProperty('avg')
        && primaryRecords.rating_aggregate.aggregate.avg.hasOwnProperty('given_rate') ) {
          
          // update average rate in user table
          let userRecord = await hasura.updateUser(body.event.data.new.to_user_id, primaryRecords.rating_aggregate.aggregate.avg.given_rate);
          var status = 'success';
          data = {
            user: userRecord,
            msg: 'user record updated.'
          };

        }

      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: status,
          data: data
        })
      }

    } catch (err) {
      console.log('err : ', err);
      // return RH.error400(err.message);

      return {
        statusCode: 400,
        body: JSON.stringify({
            message: err.message
        })
      }

    }

  };


  return rating;
}());

module.exports = rating.bootstrap();

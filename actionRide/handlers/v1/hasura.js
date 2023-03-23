'use strict'

const fetch = require('node-fetch');
const uuidV4 = require('uuid').v4;
const theMoment = require('moment');
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;


/**
 * hasura request handler
 * 
 * @class hasura
 */
var hasura = (function () {

  /**
   * database schema
   */
  const SCHEMA = "yt";

  /**
   * Initialized a new instance of @hasura class.
   */
  function hasura() {};

  /**
   * Creates a new @hasura instance.
   */
  hasura.bootstrap = function () {
    return new hasura();
  };

  /**
   * get ride & ride request records by ride_id
   * 
   * @param {String} ride_id
   * 
   * @returns {Array} yt_ride_request records
   */
  hasura.prototype.getRideAndRequestRecords = async function (ride_id) {

    let query = `query ($ride_id:uuid!){

        ${SCHEMA}_ride_request(where: {
          ride_id : { _eq: $ride_id }
        }){
            id
            ride_id
            user_id
            driver_user_id
            vehicle_id
            is_accepted
            is_rejected
            accepted_at
            available
            eta_number
            eta_unit
        }

        ${SCHEMA}_ride_by_pk(id: $ride_id) {
          id
          boarding_pass_id
          confirmation_code
          distance
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          status
          user_id
          vehicle_id
        }
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    // console.log(res.data.yt_ride_by_pk);
    // console.log(res.data.yt_ride_request);

    return {
      ride: res.data[SCHEMA + '_ride_by_pk'],
      ride_requests: res.data[SCHEMA + '_ride_request']
    };

  };




  /**
   * get ride & ride request records by ride_id
   * 
   * @param {String} ride_id
   * 
   * @returns {Array} yt_ride_request records
   */
  hasura.prototype.getCabNumberFromVehicleId = async function (vehicle_id) {

    let query = `query ($vehicle_id:uuid!){
      yt_vehicle_by_pk(id: $vehicle_id) {
        id
        cab_number
      }
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          vehicle_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    console.log(res.data.yt_vehicle_by_pk, 'res.data.yt_vehicle_by_pk');
    // console.log(res.data.yt_ride_request);
    return res.data.yt_vehicle_by_pk

  };


  /**
   * Set boarding pass validity
   * 
   * @param {UUID} ride_id
   * @param {Datetime} valid_from
   * @param {Datetime} valid_to
   * 
   * @returns {Object}
   */
  hasura.prototype.setBoardingPassValidity = async function (id, valid_from, valid_to) {

    let query = `mutation handleUpdateBoardingPass($id:uuid!, $valid_from:timestamp!, $valid_to:timestamp!){

      update_${SCHEMA}_boarding_pass(
        where: {
          id: {_eq: $id}, 
          valid_from: {_is_null: true}, 
          valid_to: {_is_null: true}
        }, 
        _set: {
          valid_to: $valid_to, 
          valid_from: $valid_from
        }) {
        returning {
          id
          valid_from
          valid_to
          created_at
          updated_at
        }
        affected_rows
      }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          id,
          valid_from,
          valid_to
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    /*
    {
      "data": {
        "update_yt_boarding_pass": {
          "returning": [
            {
              "id": "61610266-c057-4b7f-9d66-dc9f7cfbdbd0",
              "valid_from": "2020-08-14T08:14:25.096",
              "valid_to": "2020-08-20T08:14:25.101",
              "created_at": "2020-08-07T14:53:51.751924",
              "updated_at": "2020-08-14T08:43:00.439796"
            }
          ],
          "affected_rows": 1
        }
      }
    } */

    return res.data["update_" + SCHEMA + "_boarding_pass"]['returning'];
  }

  /**
   * Send update request to accept ride request
   * 
   * @param {UUID} ride_id
   * @param {UUID} ride_request_id
   * @param {UUID} driver_user_id
   * @param {Number} eta_number
   * @param {String} eta_unit
   * @param {UUID} vehicle_id
   * 
   * @returns {Object} updated ride request object
   */
  hasura.prototype.acceptRideRequest = async function (ride_id, ride_request_id, driver_user_id, eta_number, eta_unit, vehicle_id) {

    const tNow = new Date();
    const accepte_at = tNow.toISOString();

    var ride_str_id = ride_id;

    let query = `mutation handleAcceptRide($ride_id:uuid!, $ride_request_id:uuid!, $driver_user_id:uuid!, $accepte_at:timestamp!, $eta_number:float8!, $eta_unit:String!, $vehicle_id:uuid!,$ride_str_id:String!){

      update_${SCHEMA}_ride_request(
        where: {ride_id: {_eq: $ride_id}}, 
        _set: {available: false}) {
        returning {
          id
          is_accepted
          available
        }
      }

      
      update_${SCHEMA}_vehicle(
        where: {is_request: {_eq: $ride_str_id}}, 
        _set: {is_request: "a"}) {
        returning {
          id
        }
      }

      update_${SCHEMA}_ride_request_by_pk(
        pk_columns: {id: $ride_request_id}, 
        _set: {accepted_at: $accepte_at, is_accepted: true, eta_number: $eta_number, eta_unit: $eta_unit}) {
        id
        ride_id
        user_id
        driver_user_id
        is_accepted
        accepted_at
        available
        eta_number
        eta_unit
      }
  
      update_${SCHEMA}_ride_by_pk(
        pk_columns: {id: $ride_id}, 
        _set: {driver_user_id: $driver_user_id, vehicle_id: $vehicle_id, status: "ASSIGNED"}) {
        id
        status
        driver_user_id
      }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id,
          ride_request_id,
          driver_user_id,
          accepte_at,
          eta_number,
          eta_unit,
          vehicle_id,
          ride_str_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    // console.log("hasura.prototype.acceptRideRequest : ", res);
    return res.data["update_" + SCHEMA + "_ride_request_by_pk"];
  }


  /**
   * get primary records for ride create operation
   * 
   * @param {Object} params from request {user_id, boarding_pass_id, nearest_vehicles}
   * 
   * @returns {Object} records from various tables
   */
  hasura.prototype.getRecordsForRideCreate = async function (params) {

    // params.user_id
    // params.boarding_pass_id
    // params.nearest_vehicles
    // console.log('UTC: start of day : ', theMoment.utc().startOf('day').toISOString() );
    // console.log('UTC: current time : ', theMoment.utc().toISOString() );
    // console.log('UTC: end of day   : ', theMoment.utc().endOf('day').toISOString() );
    const startOfDay = theMoment.utc().startOf('day').toISOString();
    const endOfDay = theMoment.utc().endOf('day').toISOString();

    let vehicleIds = [];
    params.nearest_vehicles.forEach(vhcl => {
      vehicleIds.push(vhcl.id);
    });


    let query = `query ($user_id:uuid!, $boarding_pass_id:uuid!, $vehicleIds:[uuid!], $startOfDay:timestamp!, $endOfDay:timestamp!){

        ${SCHEMA}_user_by_pk(id: $user_id) {
          active
          address
          block
          country_code
          email
          id
          full_name
          mobile
          type
        }

        ${SCHEMA}_boarding_pass_by_pk(id: $boarding_pass_id) {
          id
          user_id
          pass_number
          pass_type
          status
          valid_from
          valid_to
          total_trips
          total_daily_trips
          only_airport_service
          unlimited_trips
          rides {
            id
            status
          }
          plan {
            id
            validity_days
          }
        }

        ${SCHEMA}_vehicle(where: {
          _and: {
            id: {_in: $vehicleIds}, 
            online: {_eq: true},
            booked: {_eq: false},
            current_driver_user_id: {_is_null: false}
          }
        }) {
          id
          online
          booked
          registration_number
          registration_date
          location
          current_driver {
            email
            id
            full_name
            mobile
            country_code
          }
        }

        ${SCHEMA}_ride_aggregate(
          where: {
            boarding_pass_id: {_eq: $boarding_pass_id}, 
            status: {_in: ["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETE"]}
          }) {
          aggregate {
            count(columns: id)
          }
          nodes {
            boarding_pass_id
            status
            id
          }
        }

        ${SCHEMA}_ride(where: {
          boarding_pass_id: {_eq: $boarding_pass_id}, 
          status: {_in: ["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETE"]}, 
          created_at: {
            _gte: $startOfDay, 
            _lte: $endOfDay
          }
        }) {
            status
            id
            created_at
        }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          user_id: params.user_id,
          boarding_pass_id: params.boarding_pass_id,
          vehicleIds: vehicleIds,
          startOfDay: startOfDay,
          endOfDay: endOfDay
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      user: res.data[SCHEMA + '_user_by_pk'],
      boarding_pass: res.data[SCHEMA + '_boarding_pass_by_pk'],
      vehicles: res.data[SCHEMA + '_vehicle'],
      rides_aggregate: res.data[SCHEMA + '_ride_aggregate'],
      today_rides: res.data[SCHEMA + '_ride']
    };

  };


  /**
   * get next confirmation code
   * 
   * @param {String} slug
   * @returns {Object} counters record
   */
  hasura.prototype.getNextConfirmationCode = async function (slug) {
    let query = `mutation NextConfirmationCode($slug:String!){

      update_${SCHEMA}_counters(where: {slug: {_eq: $slug}}, _inc: {last_count: 1}) {
        returning {
          id
          last_count
          prefix
          slug
        }
      }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          slug
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }


    if (Array.isArray(res.data.update_yt_counters.returning)) {
      return res.data.update_yt_counters.returning[0];
    } else {
      throw new Error(`Counter record is not found for slug ${slug}`);
    }
  }


  /**
   * Create ride with requests to driver
   * 
   * @param {Object} primary records
   */
  hasura.prototype.createRideWithRequests = async function (primaryRecords, params) {

    let ride_id = uuidV4();
    let graphQlVars = {};
    let ccode = null;
    if (primaryRecords.confirmation_code_count) {
      ccode = `${primaryRecords.confirmation_code_count.prefix}${primaryRecords.confirmation_code_count.last_count}`;
    }

    // prepare ride to insert
    // For geodetic coordinates, X is longitude and Y is latitude, // Point(X, Y)
    graphQlVars['rideObj'] = {
      "id": ride_id,
      "boarding_pass_id": primaryRecords.boarding_pass.id,
      "confirmation_code": ccode,
      "start_address": params.start_address,
      "start_location": `(${params.start_location.lon},${params.start_location.lat})`,
      "source_to_decstination_route": (params.source_to_decstination_route) ? params.source_to_decstination_route : null,
      "driver_to_rider_route": (params.driver_to_rider_route) ? params.driver_to_rider_route : null,
      "end_address": params.end_address,
      "end_location": `(${params.end_location.lon},${params.end_location.lat})`,
      "distance": params.distance,
      "status": "NEW",
      "user_id": primaryRecords.user.id,
      "mapbox_route": (params.mapbox_route) ? params.mapbox_route : null
    };


    // prepare ride requests to insert
    graphQlVars['rideRequestsObjs'] = [];
    primaryRecords.vehicles.forEach(v => {
      if (v.current_driver) {
        graphQlVars.rideRequestsObjs.push({
          "available": true,
          "is_accepted": false,
          "is_rejected": false,
          "ride_id": ride_id,
          "user_id": primaryRecords.user.id,
          "driver_user_id": v.current_driver.id,
          "vehicle_id": v.id
        });
      }
    });


    let query = `mutation CreateRideAndRequests(
      $rideObj:${SCHEMA}_ride_insert_input!, 
      $rideRequestsObjs:[${SCHEMA}_ride_request_insert_input!]! ){

      insert_${SCHEMA}_ride_one(
        object: $rideObj) {
          id
          boarding_pass_id
          confirmation_code
          created_at
          distance
          end_location
          end_address
          start_address
          start_location
          status
          updated_at
          user_id
        }

        insert_${SCHEMA}_ride_request(
          objects: $rideRequestsObjs
        ) {
          returning {
            id
            updated_at
            created_at
          }
        }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: graphQlVars
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    // console.log('ride and ride_request insert : res.data : ', res.data);
    return {
      ride: res.data["insert_" + SCHEMA + "_ride_one"],
      ride_requests: res.data["insert_" + SCHEMA + "_ride_request"]
    }
  }

  /**
   * get primary records for ride start action
   * 
   * @param {String} ride_id
   * 
   * @returns {Object} yt_ride records
   */
  hasura.prototype.getRecordsForRideStart = async function (ride_id) {

    let query = `query ($ride_id:uuid!){

        ${SCHEMA}_ride_by_pk(id: $ride_id) {
          id
          boarding_pass_id
          confirmation_code
          distance
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          status
          user_id
          vehicle_id
          route_map_file_id
          user {
            id
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          driver {
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          boarding_pass {
            id
            pass_number
            pass_type
          }
        }
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data[SCHEMA + '_ride_by_pk']
    };

  };

  /**
   * Update ride record to save vehicle arrived timestamp
   * 
   * @param {UUID ride_id
   * 
   * @returns {Object}
   */
  hasura.prototype.updateRideVehicleArrived = async function (ride_id) {

    let current_time = theMoment.utc().toISOString();

    let query = `mutation handleVehicleArrived($ride_id:uuid!, $current_time:timestamp!){

      update_${SCHEMA}_ride_by_pk(
        pk_columns: {id: $ride_id}, 
        _set: { vehicle_arrived_at: $current_time}) {
        id
        driver_user_id
        status
        vehicle_id
        vehicle_arrived_at
        created_at
        updated_at
      }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id,
          current_time
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data["update_" + SCHEMA + "_ride_by_pk"]
    }
  }

  /**
   * Start ride
   * 
   * @param {UUID ride_id
   * 
   * @returns {Object}
   */
  hasura.prototype.startRide = async function (ride_id) {

    let current_time = theMoment.utc().toISOString();

    let query = `mutation handleStartRide($ride_id:uuid!, $current_time:timestamp!){

      update_${SCHEMA}_ride_by_pk(
        pk_columns: {id: $ride_id}, 
        _set: {status: "IN_PROGRESS", start_at: $current_time}) {
        id
        boarding_pass_id
        confirmation_code
        distance
        driver_user_id
        end_address
        end_location
        start_address
        start_location
        status
        user_id
        vehicle_id
        route_map_file_id
        start_at
        end_at
        created_at
        updated_at
      }

    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id,
          current_time
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data["update_" + SCHEMA + "_ride_by_pk"]
    }
  }

  /**
   * get ride by ride_id
   * 
   * @param {String} ride_id
   * 
   * @returns {Object} yt_ride records
   */
  hasura.prototype.getRideRecord = async function (ride_id) {

    let query = `query ($ride_id:uuid!){

        ${SCHEMA}_ride_by_pk(id: $ride_id) {
          id
          boarding_pass_id
          confirmation_code
          distance
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          start_at
          end_at
          status
          user_id
          vehicle_id
          route_map_file_id
          user {
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          driver {
            full_name
            email
            country_code
            mobile
            active
            block
            timezone_identifier
          }
          boarding_pass {
            id
            pass_number
            pass_type
          }
        }
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data[SCHEMA + '_ride_by_pk']
    };

  };

  /**
   * Cancel ride
   * 
   * @param {UUID} ride_id
   * @param {UUID} route_map_file_id
   * 
   * @returns {Object}
   */
  hasura.prototype.cancelRide = async function (ride_id, user_id, role, cancel_reason) {

    let current_time = theMoment.utc().toISOString();
    let query;
    let res;
    if (role == 'rider') {
      query = `mutation handleCancelRide($ride_id:uuid!,$ride_st_id:String!, $user_id:uuid!, $cancel_reason:String!, $current_time:timestamp!){
 
    update_${SCHEMA}_ride_by_pk(
      pk_columns: {id: $ride_id}, 
      _set: {status: "CANCELED", cancelled_by_user_id: $user_id, cancellation_reason: $cancel_reason, cancelled_at: $current_time}) {
      id
      driver_user_id
      status
      user_id
      cancelled_by_user_id
      cancellation_reason
      cancelled_at
      created_at
      updated_at
    }

   update_${SCHEMA}_vehicle(where: {is_request: {_eq:$ride_st_id},booked: {_eq:false}}, _set: {is_request:"a"}) {
    affected_rows
   }

  }`;


  let ride_st_id = ride_id

  res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({
      query,
      variables: {
        ride_id,
        ride_st_id,
        user_id,
        cancel_reason,
        current_time
      }
    })
  }).then(res => res.json());


    } else {
      query = `mutation handleCancelRide($ride_id:uuid!, $user_id:uuid!, $cancel_reason:String!, $current_time:timestamp!){
 
    update_${SCHEMA}_ride_by_pk(
      pk_columns: {id: $ride_id}, 
      _set: {status: "CANCELED", cancelled_by_user_id: $user_id, cancellation_reason: $cancel_reason, cancelled_at: $current_time}) {
      id
      driver_user_id
      status
      user_id
      cancelled_by_user_id
      cancellation_reason
      cancelled_at
      created_at
      updated_at
    }

   update_${SCHEMA}_vehicle(where: {current_driver_user_id: {_eq:$user_id}}, _set: {booked: false,is_request:"a"}) {
    affected_rows
   }

  }`;



  res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET
    },
    body: JSON.stringify({
      query,
      variables: {
        ride_id,
        user_id,
        cancel_reason,
        current_time
      }
    })
  }).then(res => res.json());
}



    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data["update_" + SCHEMA + "_ride_by_pk"]
    }
  }


  /**
   * Complete ride
   * 
   * @param {UUID ride_id
   * @param {UUID} route_map_file_id
   * @param {Datetime} ride_start_at
   * 
   * @returns {Object}
   */
  hasura.prototype.completeRide = async function (ride_id, route_map_file_id, ride_start_at) {

    let current_time = theMoment.utc().toISOString();

    let diff_ms = theMoment(current_time).diff(theMoment(ride_start_at));
    let duration = ((diff_ms / 1000) / 60).toFixed(2); // in minute
    let variables = {};
    let query = null;

    if (route_map_file_id) {
      query = `mutation handleCompleteRide($ride_id:uuid!, $route_map_file_id:uuid!, $current_time:timestamp!, $duration:float8!){

        update_${SCHEMA}_ride_by_pk(
          pk_columns: {id: $ride_id}, 
          _set: {
            status: "COMPLETE", 
            route_map_file_id: $route_map_file_id, 
            end_at: $current_time, 
            duration: $duration
          }
          ) {
          id
          boarding_pass_id
          confirmation_code
          distance
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          status
          user_id
          vehicle_id
          route_map_file_id
          start_at
          end_at
          duration
          created_at
          updated_at
        }

      }`;

      variables = {
        ride_id,
        route_map_file_id,
        current_time,
        duration
      };

    } else {
      query = `mutation handleCompleteRide($ride_id:uuid!, $current_time:timestamp!, $duration:float8!){

        update_${SCHEMA}_ride_by_pk(
          pk_columns: {id: $ride_id}, 
          _set: {
            status: "COMPLETE", 
            end_at: $current_time, 
            duration: $duration
          }
          ) {
          id
          boarding_pass_id
          confirmation_code
          distance
          driver_user_id
          end_address
          end_location
          start_address
          start_location
          status
          user_id
          vehicle_id
          route_map_file_id
          start_at
          end_at
          duration
          created_at
          updated_at
        }

      }`;

      variables = {
        ride_id,
        current_time,
        duration
      };

    }


    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: variables
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return {
      ride: res.data["update_" + SCHEMA + "_ride_by_pk"]
    }
  }

  /**
   * Update records for ride reject operation.
   * 
   * @param {UUID} ride_request_id
   */
  hasura.prototype.rejectRideRequest = async function (ride_request_id,driver_user_id) {

    const tNow = new Date();
    const rejected_at = tNow.toISOString();

    let query = `mutation handleRejectRideRequest($ride_request_id:uuid!,$driver_user_id:uuid!, $rejected_at:timestamp!){

      update_${SCHEMA}_ride_request_by_pk(
        pk_columns: {id: $ride_request_id}, 
        _set: {rejected_at: $rejected_at, is_rejected: true}) {
        id
        is_rejected
        rejected_at
      }

      
      update_${SCHEMA}_vehicle(where: {current_driver_user_id: {_eq:$driver_user_id}}, _set: {booked: false,is_request:"a"}) {
        affected_rows
      }
  
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          ride_request_id,
          rejected_at,
          driver_user_id
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    return res.data["update_" + SCHEMA + "_ride_request_by_pk"];
  }

  /**
   * create notification records
   * 
   * @param {Array} objects [{
   *   "content": {
   *     "title": "This is title",
   *     "message": "This is message",
   *     "data": {
   *     }
   *   }, 
   *   "priority": "HIGH", 
   *   "sender_user_id": "a84af858-9293-4cf9-9873-7153fb615a45", 
   *   "target": "USER", 
   *   "user_id": "a84af858-9293-4cf9-9873-7153fb615a45"
   * }]
   * 
   * @returns {Array} Notifiation records.
   */
  hasura.prototype.addInAppNotification = async function (objects) {
    let query = `mutation MyMutation($objects:[yt_notification_insert_input!]!) {
      notifications: insert_yt_notification(
        objects: $objects
      ) {
        returning {
          id
        }
      }
    }`;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: {
          objects
        }
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    // console.log(res.data);
    return {
      notifications: res.data['notifications']['returning']
    };
  }



  /*
   * 
   * @returns {Array} get location points.
   */
  hasura.prototype.getLocationPointer = async function () {
    let query = `query MyQuery {
    yt_location_points(where: {status: {_eq: 1}}) {
      id
      latitude
      longitude
    radius
    }
  }
  `;

    let res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query
      })
    }).then(res => res.json());

    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    // console.log(res.data);

    return res.data.yt_location_points

  }

  hasura.prototype.requestCron = async function () {
    try {
      let query = `query  MyQuery($status:String!) {
        yt_ride(where: {status: {_eq: $status}, is_request: {_eq: 0}}) {
          id
        }
      }`;

      let rides = await getDataAccordingtoQuery(query, {
        status: "NEW"
      });


      console.log(rides, 'rides')
      let ridesD = rides.data.yt_ride
      if (ridesD.length > 0) {
        console.log("first")

        console.log(ridesD, 'ridesD')
        for (let r in ridesD) {
          console.log(ridesD[r].id, 'ridesD[r].id')
          let request_query = `query MyQuery($id:uuid!) {
            yt_ride_request(where: {ride_id:{_eq:$id},available: {_eq: true}, is_accepted: {_eq: false}, is_request: {_eq: 0}}) {
              id
              driver_user_id
            }
          }`;

          let request_ride = await getDataAccordingtoQuery(request_query, {
            id: ridesD[r].id
          });

          let ridesRqD = request_ride.data.yt_ride_request
          if (ridesRqD.length > 0) {
            console.log("second")

            for (let q in ridesRqD) {
              console.log(ridesRqD[q].driver_user_id, 'driver user id')
              let request_query = `query MyQuery($id:uuid!) {
                  yt_vehicle(where: {current_driver_user_id:{_eq:$id},is_request: {_eq: "a"}, booked: {_eq: false}}) {
                    id
                  }
                }`;

              let vehicle = await getDataAccordingtoQuery(request_query, {
                id: ridesRqD[q].driver_user_id
              });


              let vehicleD = vehicle.data.yt_vehicle;
              if (vehicleD.length > 0) {
                console.log("third")

                console.log(vehicleD, 'vehicleD vehicleD')
                for (let v in vehicleD) {
                  console.log(vehicleD[v].id, 'vehicle .................')
                  console.log(ridesD[r].id, 'rides .................')

                  let updateQ = `mutation MyMutation($ride_st_id:String!,$ride_id:uuid!,$vehicle_id:uuid!,$driver_user_id:uuid!){
                    update_yt_vehicle(where: {id: {_eq: $vehicle_id}}, _set: {is_request: $ride_st_id}) {
                      affected_rows
                    }
                    update_yt_ride(where: {id: {_eq: $ride_id}}, _set: {is_request: 1}) {
                             affected_rows
                    }
                    update_yt_ride_request(where:{ride_id: {_eq: $ride_id},driver_user_id:{_eq:$driver_user_id}}, _set: {is_request: 1}) {
                      affected_rows
                    }
                  
                }`;

                  await getDataAccordingtoQuery(updateQ, {
                    ride_st_id: ridesD[r].id,
                    ride_id: ridesD[r].id,
                    vehicle_id: vehicleD[v].id,
                    driver_user_id: ridesRqD[q].driver_user_id
                  });

                }

              }
            }
          }
        }
      }
    } catch (error) {
      console.log(error, 'errrrrrrrrrrrrrr')
    }

  }



  function getDataAccordingtoQuery(query, variable) {
    console.log(HASURA_ENDPOINT, 'HASURA_ENDPOINT')
    console.log(HASURA_ADMIN_SECRET, 'HASURA_ADMIN_SECRET')
    console.log(variable, 'variable')
    let qData = fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query,
        variables: variable
      })
    }).then(qData => qData.json());

    return qData;

  }

  return hasura;
}());

module.exports = hasura.bootstrap();
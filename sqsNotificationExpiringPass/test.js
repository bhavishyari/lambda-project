
require('dotenv').config();
const processor = require('./handlers/processor');
let record = {
  body: JSON.stringify({
    "id": "34e56b1c-277a-4c7e-91ee-8807bb9e4df2",
    "user_id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
    "pass_number": 14,
    "status": "ACTIVE",
    "valid_from": "2020-08-08T00:00:00",
    "valid_to": "2020-08-27T00:00:00",
    "qr_code": "6a7f931c-6e01-4eaf-8eeb-f5d62f26a939",
    "pass_type": "LIMITED_RIDES",
    "user": {
      "id": "a1dd0318-8f11-4f08-b31e-9bb26204086c",
      "full_name": "Test",
      "email": "test@gmail.com",
      "country_code": "+91",
      "mobile": "9904032335",
      "active": true,
      "block": false
    }
  })
}

processor.execute(record);

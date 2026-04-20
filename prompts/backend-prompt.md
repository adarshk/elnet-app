You are an expert backend engineer, come up with the architecture but try to keep it simple and extensible
The app is about fetching electricity consumption data and then showing that to the user so that the user can track the data consumption

There are primarily 2 parts to the backend. 

First fetch the data from a few endpoints and then write that to a database. The goal is to track keep tracking data in the db and then show the client usage over time


The first endpoint is login

POST /api/Dashboard/login with json body with the following
{
    "InputType": ""
}

how is the input type for the login endpoint defined? Its the base64 encoded, AES encrypted version of the following json body

Given a certain json with the following structure

{
  "Password" : "",
  "Access" : "Live",
  "FCMID" : "",
  "UserName" : ""
}

AES encrypt it with the secret key given with 256 bits CBC encryption mode, and a given static IV
and base64 encode it, this gives us the input type, 

The response to this returns us the following:

```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "RefreshToken": "",
    "AuthToken": "",
    "UserName": "",
    "FlatName": "",
    "FlatId": 1,
    "UserID": 1,
    "MobileNo": "",
    "EmailID": "",
    "Address1": "",
    "Address2": "",
    "Access": "User",
    "DigitalInputs": [
      {
        "Name": "Digital Input-1"
      },
      {
        "Name": "Digital Input-2"
      },
      {
        "Name": "Digital Input-3"
      },
      {
        "Name": "Digital Input-4"
      }
    ],
    "GoalAmount": 1000.0,
    "ChangePassword": false,
    "MerchantName": ""
  }
}
```

During login of the client the user provides the userid, password and the endpoint which is an ipaddress:port

After login, store both the inputType and the response in the db, reuse the inputType for subsequent requests during login if required, if the user provides new details, then replace it with the new generated inputType


The comes the 2nd endpoint
POST /api/Dashboard/PasswordExpired - with a certain json input body


and respone is of format

```
{
  "Status": "Success",
  "Message": "Password Not Expired",
  "Data": false
}
```

The json input is the same process of AES encrypted with the same key, static IV of the following json

{
  "UserId" : 479,
  "MeterID" : "478"
}

here the meterId is the flatId that we get from the /api/Dashboard/login endpoint


the following are the endpoints that need to be polled to keep getting details:


1. POST /api/Dashboard/GetDashboardDetails with with json body of 
{
    "InputType": "<base64 encrypted token>"
}

The string in InputType is the same process of AES encrypted 256 bits, CBC, with secret key and static IV of the following json

```
{
  "MeterID" : "478"
}

```
The MeterID is the flatId from /login endpoint response, note that the value of meterId is a string


sample response structure for this api
```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "AvgEB": 0.0,
    "AvgDG": 0.0,
    "AvgSolar": 0.0,
    "AvgEnergy": 546.96,
    "AvgCost": 4612.08,
    "Balance": 2066.54,
    "ExpRechargeDays": 13
  }
}
```

here we are interested in AvgEnergy, AvgCost, Balance and ExpRechargeDays

2. POST /api/Dashboard/GetLiveUpdates with with json body of 
{
    "InputType": "<base64 encrypted token>"
}

The string in InputType is the same process of AES encrypted 256 bits, CBC, with secret key and static IV of the following json

```
{
  "MeterID" : 478
}

```
The MeterID is the flatId from /login endpoint response, note that the value here is a number, not a string

response
```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "Supply": 0,
    "PresentLoad": 1.2,
    "Balance": 2066.09,
    "EB": 16128.94,
    "DG": 81.23,
    "SanctionEB": 52.0,
    "SanctionDG": 10.0,
    "UpdatedOn": "11-04-2026 22:32:50",
    "Solar": 0.0
  }
}
```

here we are interested in all the metrics except solar, EB stands for normal consumption and DG is when its on generator which costs higher. The Supply value indicates if its EB or DG, 0 indicates EB and non-zero value indicates DG


3. POST /api/Dashboard/HomeData with with json body of 
{
    "InputType": "<base64 encrypted token>"
}

The string in InputType is the same process of AES encrypted 256 bits, CBC, with secret key and static IV of the following json

```
{
  "MeterID" : "478"
}

```
The MeterID is the flatId from /login endpoint response, note that the value of meterId is a string

Response
```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "DeviceId": 478,
    "kWhRecToday": 0.0,
    "kvahRecToday": 0.0,
    "kWhDelToday": 0.0,
    "SolarToday": 0.0,
    "kvahDelToday": 0.0,
    "kWhRecMonth": 0.0,
    "kvahRecMonth": 0.0,
    "kWhDelMonth": 0.0,
    "SolarMonth": 0.0,
    "kvahDelMonth": 0.0,
    "MeterBal": 2067.01,
    "RelStatus": "ON",
    "EBDGStatus": 0,
    "kwh_kvah_Status": 0,
    "CurrentDay_EB": 0.0,
    "CurrentDay_DG": 0.0,
    "CurrentDay_Solar": 0.0,
    "FixedChargesToday": 0.0,
    "CurrentMonth_EB": 0.0,
    "CurrentMonth_DG": 0.0,
    "CurrentMonth_Solar": 0.0,
    "FixedChargesMonth": 0.0,
    "Meter_SN": "3067842",
    "IsCoilEnable": false,
    "IsEB": true,
    "IsDG": true,
    "IsSolar": false,
    "IsFixedCharge": false
  }
}
```

we are interested in Meter_SN, DeviceId

4. POST /api/Dashboard/RechargeHistory with json input body of 

```
{
    "InputType": ""
}
```

The string in InputType is the same process of AES encrypted 256 bits, CBC, with secret key and static IV of the following json

{
  "Month" : 0,
  "MeterID" : "478",
  "Year" : 0
}

The MeterID is the flatId from /login endpoint response, for now the month and year can be statically set to 0

sample response structure for this api

```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "TotalRecharge": 30,
    "RechargeHistory": [
      {
        "SerialNo": 3067842,
        "DateTime": "2026-04-10T01:10:49",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-04-09T02:41:33",
        "Amount": 7500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-03-29T09:04:20",
        "Amount": 3000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-03-22T13:48:07",
        "Amount": -246.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-03-18T08:47:55",
        "Amount": 2500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-03-10T01:10:12",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-03-08T22:04:34",
        "Amount": 7500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-02-22T10:20:38",
        "Amount": 3000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-02-20T16:05:13",
        "Amount": -261.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-02-10T01:10:39",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-02-07T08:52:19",
        "Amount": 8500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-01-28T07:34:01",
        "Amount": 3000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-01-22T13:45:42",
        "Amount": -211.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-01-16T11:29:56",
        "Amount": 3000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-01-10T01:10:37",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2026-01-05T08:48:40",
        "Amount": 9000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-12-29T08:14:34",
        "Amount": 2000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-12-20T20:56:29",
        "Amount": 3000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-12-20T16:45:45",
        "Amount": -206.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-12-10T01:10:46",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-12-04T13:19:16",
        "Amount": 10000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-28T09:44:46",
        "Amount": 2000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-20T16:17:18",
        "Amount": -205.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-20T06:58:59",
        "Amount": 2500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-10T01:10:11",
        "Amount": -5568.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-08T11:40:05",
        "Amount": 2000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-11-02T08:55:19",
        "Amount": 8000.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-10-23T12:25:10",
        "Amount": -168.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-10-21T08:30:57",
        "Amount": 2500.0,
        "Status": "success"
      },
      {
        "SerialNo": 3067842,
        "DateTime": "2025-10-10T01:10:36",
        "Amount": -5568.0,
        "Status": "success"
      }
    ]
  }
}
```

we are interested in keeping track of charges over time

5. POST /api/Dashboard/GetResourcesDetails with json input body of 

```
{
    "InputType": ""
}
```

The string in InputType is the same process of AES encrypted 256 bits, CBC, with secret key and static IV of the following json

{
  "Input" : 7,
  "EndDate" : "",
  "StartDate" : "",
  "Type" : 1,
  "MeterID" : 478
}
The MeterID is the flatId from /login endpoint response

sample response structure for this api

```
{
  "Status": "Success",
  "Message": "Data Available",
  "Data": {
    "DigitalInputs": [
      {
        "Name": "EB"
      },
      {
        "Name": "DG"
      },
      {
        "Name": "Solar"
      }
    ],
    "Resources": []
  }
}
```
above response returns all the inputs available

For all endpoints set the following headers

Content-Type: application/json; charset=UTF-8
Accept: */*
Connection: keep-alive
User-Agent: 
Accept-Language: en-US;q=1.0, en-GB;q=0.9, te-US;q=0.8, co-US;q=0.7

make the user-agent and env var that is provided, also add the Auth bearer token all endpoints except login, the bearer token is the one received in the /login response

look at test-encrypt-decrypt-prompt.md and write the tests to pass those cases

Above all are one service to keep polling and writing to db


the next part is to create a backend that serves the client this data from the db
create a backend service that is able to different clients include from web and mobile. 

It should have the following features
provide routes for the following:
- when client requests for data, return the data from db
- have a route for login
- have a route when the client clicks on manual refresh and all of the endpoints are then refethed, saved to db and updated data returned to client
- have route to return data of arbitrary time range to keep track of consumption over time and for visualization on the client
- be able to support multiple sites, supporting multiple users is not required

Ask any questions if required

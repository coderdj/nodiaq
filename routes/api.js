var express = require("express");
var url = require("url");
var bcrypt = require('bcrypt');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();

var status_enum = [
  "idle",
  "arming",
  "armed",
  "running",
  "error",
  "unknown"
];

function checkKey(req, res, next) {
  var q = url.parse(req.url, true).query;
  var user = q.api_user;
  var key = q.api_key;
  if (typeof(user) == 'undefined' || typeof(key) == 'undefined') {
    return res.json({});
  }
  var collection = req.users_db.get("users");
  var query = {lngs_ldap_uid: user};
  var options = {api_key: 1, groups: 1};
  collection.findOne(query, options, function(e, doc) {
    if (e) {
      return res.json({message: e.message});
    }
    if (typeof doc == 'undefined' || typeof(doc.api_key) == 'undefined')
      return res.json({message: 'Access denied'});
    bcrypt.compare(key, doc.api_key, function(err, ret) {
      if (err) return res.json({message: err});
      if (ret == true) {
        req.user.is_daq = typeof doc.groups != 'undefined' && doc.groups.includes('daq');
        return next();
      } // if (ret == true)
      return res.json({message: 'Access Denied'});
    });
  });
}

router.get("/helloworld", checkKey, function(req, res) {
  var today = new Date();
  return res.json({message: 'Hello to you too. The current time is ' + today.toUTCString()});
});

router.get("/getstatus/:host", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = req.params.host;
  var time_sec = 0;
  var collection = req.db.get('status');
  try {
    time_sec = parseInt(q.time_seconds);
  } catch(error){
  }
  var query = {host: host};
  var options = {sort: {'_id': -1}};
  if (time_sec > 0) {
    query['time'] = {$gte: new Date(new Date()-time_sec*1000)};
  } else {
    options['limit'] = 1;
  }
  collection.find(query, options, function(err, docs) {
    if (err) {
      return res.json({message: err.message});
    }
    return res.json(docs);
  });
});

router.get("/geterrors", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var min_level = 2;
  var collection = req.db.get('log');
  try{
    min_level = parseInt(q.level);
  } catch(error){
  }
  var query = {priority: {$gte: min_level, $lt: 5}};
  var options = {sort: {'_id': -1}, limit: 1};
  collection.find(query, options).then( (docs) => {
    return res.json(docs);
  }).catch( (err) => {
    return res.json({message: err.message});
  });
});

function GetControlDoc(collection, detector) {
  return collection.aggregate([
    {$match: {detector: detector}},
    {$sort: {_id: -1}},
    {$group: {
      _id: '$field',
      value: {$first: '$value'},
      user: {$first: '$user'},
      time: {$first: '$time'}
    }},
    {$group: {
      _id: null,
      keys: {$push: '$_id'},
      values: {$push: '$value'},
      users: {$push: '$user'},
      times: {$push: '$time'}
    }},
    {$project: {
      detector: detector,
      _id: 0,
      state: {$arrayToObject: {$zip: {inputs: ['$keys', '$values']}}},
      user: {$arrayElemAt: ['$users', {$indexOfArray: ['$times', {$max: '$times'}]}]}
    }}
  ]);
}

function GetDetectorStatus(collection, detector, callback) {
  var timeout = 30;
  var query = {detector: detector, time: {$gte: new Date(new Date()-timeout*1000)}};
  var options = {sort: {'_id': -1}, limit: 1};
  return collection.find(query, options);
}

router.get("/getcommand/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("detector_control");
  GetControlDoc(collection, detector).then( docs => {
    if (docs.length == 0)
      return res.json({message: "No control doc for detector " + detector});
    return res.json(docs[0]);
  }).catch( err => {
    return res.json({message: err.message});
  });
});

router.get("/detector_status/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("aggregate_status");
  GetDetectorStatus(collection, detector).then( docs => {
    if (docs.length == 0)
      return res.json({message: "No status update within the last 30 seconds"});
    return res.json(docs[0]);
  }).catch( err => {
    return res.json({message: err.message});
  });
});

router.post("/setcommand/:detector", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var user = q.api_user;
  var data = req.body;
  var detector = req.params.detector;
  var ctrl_coll = req.db.get("detector_control");
  var agg_coll = req.db.get("aggregate_status");
  var options_coll = req.db.get("options");
  promises = [GetControlDoc(ctrl_coll, detector)];
  if (detector != 'tpc') {
    promises.push(GetControlDoc(ctrl_coll, 'tpc'));
  }
  if (data.active == 'true') {
    promises.push(options_coll.count({name: data.mode}, {}));
  }
  Promise.all(promises).then( values => {
    if (values[0].length == 0)
      throw {message: "Something went wrong"};
    var det = values[0][0].state;
    // first - is the detector in "remote" mode?
    if (det.remote != 'true' && !req.user.is_daq)
      throw {message: "Detector must be in remote mode to control via the API"};
    // check linking status
    if (detector == "tpc" && (det.link_nv != "false" || det.link_mv != "false"))
      throw {message: 'All detectors must be unlinked to start TPC via API'};
    if (detector != 'tpc') {
      var tpc = values[1][0].state;
      if (detector == "neutron_veto" && tpc.link_nv != "false")
        throw {message: 'NV must be unlinked to control via API'};
      if (detector == "muon_veto" && tpc.link_mv != "false")
        throw {message: 'MV must be unlinked to control via API'};
    }
    // now we validate the incoming command
    var changes = [];
    for (var key in det) {
      if (typeof data[key] != 'undefined' && data[key] != '' && data[key] != det[key]) {
        if (key == 'stop_after') {
          try{
            data[key] = parseInt(data[key]);
          }catch(error){
            continue;
          }
        } else if (key == 'mode' && values[values.length-1] == 0) {
          throw {message: "No options document named \"" + data.mode + "\""};
        } else {
        }
        changes.push([key, data[key]]);
      }
    }
    if (changes.length > 0) {
      ctrl_coll.insert(changes.map((val) => ({detector: detector, user: user,
        time: new Date(), field: val[0], value: val[1], key: detector+'.'+val[0]})))
      .then( () => res.json({message: "Update successful"}))
      .catch( (err) => {throw err});
    }
  }).catch((err) => res.json({message: err.message}));
});

module.exports = router;

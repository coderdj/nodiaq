// routes/api.js
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
  collection.find(query, options, function(e, docs) {
    if (e) {
      return res.json({message: e.message});
    }
    if (docs.length == 0 || typeof(docs[0].api_key) == 'undefined')
      return res.json({message: 'Access denied'});
    bcrypt.compare(key, docs[0].api_key, function(err, ret) {
      if (err) return res.json({message: err});
      if (ret == true) {
        req.is_daq = typeof docs[0].groups != 'undefined' && docs[0].groups.includes('daq');
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
  var keys = ['active', 'comment', 'mode', 'remote', 'softstop', 'stop_after'];
  var p = keys.map(k => collection.findOne({key: `${detector}.${k}`}, {sort: {_id: -1}}));
  return Promise.all(p).then(values => {
    var ret = {};
    var latest = values[0].time;
    var user = "";
    values.forEach(doc => {
      ret[doc.field] = doc.value;
      if (doc.time > latest) {
        user = doc.user;
        latest = doc.time;
      }
    });
    ret['user'] = user;
    return ret;
  }).catch(err => {console.log(err.message); return {};});
}

function GetDetectorStatus(collection, detector) {
  var timeout = 30;
  var query = {detector: detector, time: {$gte: new Date(new Date()-timeout*1000)}};
  var options = {sort: {'_id': -1}, limit: 1};
  return collection.find(query, options);
}

router.get("/getcommand/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("detector_control");
  GetControlDoc(collection, detector)
    .then(doc => res.json({detector: detector, user: doc.user, state: doc}))
    .catch(err => res.json({}));
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

function GetCurrentMode(options_coll, ctrl_coll, detector) {
  return ctrl_coll.findOne({key: `${detector}.mode`},{sort: {_id: -1}})
    .then(doc => options_coll.findOne({name: doc.value}))
    .catch(err => ({}));
}

router.post("/setcommand/:detector", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var user = q.api_user;
  var data = req.body;
  var detector = req.params.detector;
  var ctrl_coll = req.db.get("detector_control");
  var options_coll = req.db.get("options");
  promises = [GetControlDoc(ctrl_coll, detector)];
  if (typeof data.mode != 'undefined') {
    promises.push(options_coll.findOne({name: data.mode}));
  } else {
    promises.push(GetCurrentMode(options_coll, ctrl_coll, detector));
  }
  Promise.all(promises).then( values => {
    var det = values[0];
    // first - is the detector in "remote" mode?
    if (det.remote != 'true' && !req.is_daq)
      throw {message: "Detector must be in remote mode to control via the API"};
    // is the mode valid?
    if (values[1] === null) {
      throw {message: "Invalid mode provided"};
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
        } else if (key == 'active' && data[key] == 'true' && values[1].detector !== detector) {
          // check linking
          throw {message: 'Incompatible mode'};
        } else if (key == 'mode' && typeof values[1].detector != 'string') {
          throw {message: 'Linked modes not available for API use'};
        } else {
        }
        changes.push([key, data[key]]);
      } // if key is valid
    } // for all keys
    if (changes.length > 0) {
      ctrl_coll.insert(changes.map((val) => ({detector: detector, user: user,
          time: new Date(), field: val[0], value: val[1],
          key: `${detector}.${val[0]}`})))
        .then( () => res.json({message: "Update successful"}))
        .catch( (err) => {throw err});
    } else {
      throw {message: "No changes registered"};
    }
  }).catch((err) => res.json({message: err.message}));
});

function GetSystemMonitorStatus(collection, host) {
  var query = {host: host,};
  var options = {sort: {'_id': -1}, limit: 1};
  return collection.find(query, options);
}
router.get("/gethoststatus/:host", checkKey, function(req, res) {
  var host = req.params.host
  var collection = req.db.get("system_monitor");
  GetSystemMonitorStatus(collection,host).then( docs => {
    if (docs.length == 0)
      return res.json({message: "No status update found for this host"});
    return res.json(docs[0]);
  }).catch( err => {
    return res.json({message: err.message});
  });
});
module.exports = router;

var express = require("express");
var url = require("url");
var bcrypt = require('bcrypt');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();

var last_api_call = {};
const MAX_STORED_CALLS = 20;
const MAX_TIME_FOR_CALLS = 10000; // ms
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
  var query = {api_username: user};
  var options = {api_key: 1};
  collection.findOne(query, options, function(e, docs) {
    if (e) {
      return res.json({message: e.message});
    }
    if (docs.length == 0 || typeof(docs.api_key) == 'undefined')
      return res.json({message: 'Access denied'});
    bcrypt.compare(key, docs.api_key, function(err, ret) {
      if (err) return res.json({message: err});
      if (ret == true) {
        return next();
/*        if (typeof(last_api_call[user]) == 'undefined') {
          last_api_call[user] = [];
        }
        if (last_api_call[user].length == MAX_STORED_CALLS) {
          var now = new Date();
          last_api_call[user].push(now);
          var then = last_api_call[user].shift();
          if (Math.abs(now - then) < MAX_TIME_FOR_CALLS) {
            return res.json({message: 'Chill'});
          } else {
            return next();
          }
        } else { // if number of calls
          last_api_call[user].push(new Date());
          return next();
        } */
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
  collection.find(query, options, function(err, docs) {
    if (err) {
      return res.json({message: err.message});
    }
    return res.json(docs);
  });
});

function GetControlDoc(collection, detector, callback) {
  var query = {detector: detector};
  collection.find(query, function(err, docs) {
    if (err) {
      callback(err.msg, null);
    }
    if (docs.length == 0) {
      callback("No control doc for detector " + detector, null);
    }
    callback(null, docs[0]);
  });
}

function GetDetectorStatus(collection, detector, callback) {
  var timeout = 30;
  var query = {detector: detector, time: {$gte: new Date(new Date()-timeout*1000)}};
  var options = {sort: {'_id': -1}, limit: 1};
  collection.find(query, options, function(err, docs) {
    if (err) {
      callback(err.message, null);
    }
    if (docs.length == 0) {
      callback("No status update within the last 30 seconds", null);
    }
    callback(null, docs[0]);
  });
}

router.get("/getcommand/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("detector_control");
  GetControlDoc(collection, detector, function(err, doc) {
    if (err) {
      return res.json({message: err});
    }
    return res.json(doc);
  });
});

router.get("/detector_status/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("aggregate_status");
  GetDetectorStatus(collection, detector, function(err, doc) {
    if (err) {
      return res.json({message: err});
    }
    return res.json(doc);
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
  GetControlDoc(ctrl_coll, detector, function(err, doc) {
    if (err) {
      return res.json({message: err});
    }
    // first - is the detector in "remote" mode?
    if (doc.remote == "false") {
      return res.json({message: "Detector must be in remote mode to control via the API"});
    }
    // is the detector startable?
    if (data.active == "true" && doc.active != "false") {
      return res.json({message: "Detector must be stopped first"});
    }
    // is the detector stoppable?
    if (data.active == "false" && doc.active != "true") {
      return res.json({message: "Detector must be running to stop it"});
    }
    // check linking status
    GetControlDoc(ctrl_coll, 'tpc', function(errtpc, tpc) {
      if (errtpc) {
        return res.json({message: errtpc});
      }
      if (detector == "tpc" && (tpc.link_nv != "false" || tpc.link_mv != "false")) {
        return res.json({message: 'All detectors must be unlinked to start TPC via API'});
      }
      if (detector == "neutron_veto" && tpc.link_nv != "false") {
        return res.json({message: 'NV must be unlinked to control via API'});
      }
      if (detector == "muon_veto" && tpc.link_mv != "false") {
        return res.json({message: 'MV must be unlinked to control via API'});
      }
      // now we check the detector status
      GetDetectorStatus(agg_coll, detector, function(errstat, status_doc) {
        if (errstat) {
          return res.json({message: errstat});
        }
        if (status_doc.status != 0 && data.active != "false") {
          return res.json({message: "Detector " + detector + 
            " must be IDLE (0) but is " + status_enum[status_doc.status] + 
            " (" + status_doc.status + ")"});
        }
        // now we validate the incoming command
        var update_doc = {};
        var query = {detector: detector};
        var options = {};
        if (data.active == "false") {
          ctrl_coll.update({detector: detector},
            {$set: {active: 'false', user: user}}, options,
            function(updateerr, result) {
              if (updateerr) return res.json({message: err.message});
              return res.json({message: 'Update successful'});
            });
        } else {
          options_coll.count({name: data.mode}, options, function(counterr, count) {
            if (counterr) return res.json({message: err.message});
            if (count == 0) return res.json({message: 'No options document named ' + data.mode});
            // FINALLY we can tell the system to do something
            // now that the user input is sanitized to ISO-5
            var update = {mode: data.mode, user: user,
                          link_nv: "false", link_mv: "false"};
            if (typeof data.comment != 'undefined') update.comment = data.comment;
            if (typeof data.stop_after != 'undefined') {
              try {
                update.stop_after = parseInt(data.stop_after);
              } catch (error) {}
            }
            ctrl_coll.update({detector: detector}, {$set: update}, options,
                function(updateerr, result) {
                  if (updateerr) return res.json({message: err.message});
                  return res.json({message: 'Update successful'});
            });
          }); // count options docs
        } // data.active
      }); // get status
    }); // get tpc
  }); // get detector
});

module.exports = router;

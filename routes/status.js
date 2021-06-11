// routes/status.js
var express = require('express');
var url = require('url');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();
var axios = require('axios');

function TemplateInfo(req) {
  var template_info = req.template_info_base;
  template_info.readers = [["reader0", "reader0_reader_0"], ["reader1", 'reader1_reader_0'], ["reader2", 'reader2_reader_0'], ["Muon Veto", "reader5_reader_0"], ["Neutron Veto", "reader6_reader_0"], ["Neutron Veto", "reader6_reader_1"]];
  template_info.controllers = [["TPC controller", "reader0_controller_0"], ["MV controller", "reader5_controller_0"], ["NV controller", "reader6_controller_0"]];
  template_info.eventbuilders = ['eb0', 'eb1', 'eb2', 'eb3', 'eb4', 'eb5'];
  return template_info;
}

router.get('/', function(req, res) {
  res.render('status', TemplateInfo(req));
});

router.get('/template_info', function(req, res) {
  return res.json(TemplateInfo(req));
});

router.get('/get_detector_status', function(req, res){
  var db = req.db;
  var collection = db.get('aggregate_status');

  var q = url.parse(req.url, true).query;
  var detector = q.detector;

  collection.find({"detector": detector}, {"sort": {"_id": -1}, "limit": 1})
  .then( docs => {
    if (docs.length == 0)
      return res.json({});
    docs[0]['checkin'] = parseInt((new Date() - docs[0]['time'])/1000, 10);
    return res.json(docs[0]);
  })
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/get_process_status', function(req, res) {
  var db = req.db;
  var collection = db.get('status');

  var q = url.parse(req.url, true).query;
  var proc = q.process;

  collection.find({"host": proc},{"sort": {"_id": -1}, "limit": 1})
  .then(docs => {
    if (docs.length == 0)
      return res.json({});
    docs[0]['checkin'] = parseInt((new Date() - docs[0]['time'])/1000, 10);
    return res.json(docs[0]);
  })
  .catch(err => {console.log(err.message); return res.json({});});
});

function objectIdWithTimestamp(timestamp) {
  //https://stackoverflow.com/questions/8749971/can-i-query-mongodb-objectid-by-date
  // Convert string date to Date object (otherwise assume timestamp is a date)
  if (typeof(timestamp) == 'string') {
    timestamp = new Date(timestamp);
  }
  // Convert date object to hex seconds since Unix epoch
  var hexSeconds = Math.floor(timestamp/1000).toString(16);
  // Create an ObjectId with that hex timestamp
  var constructedObjectId = ObjectId(hexSeconds + "0000000000000000");
  return constructedObjectId;
}

router.get('/get_reader_history', function(req,res){
  var db = req.db;
  var collection = db.get('status');

  var q = url.parse(req.url, true).query;
  var reader = q.reader;
  var limit  = parseInt(q.limit);
  var resolution = parseInt(q.res);

  if(typeof limit == 'undefined')
    limit = 86400; // 1d into past
  if(typeof reader == 'undefined')
    return res.json({});
  if(typeof res == 'undefined')
    resolution = 60; //1m

  var t = new Date() - limit*1000;
  var id = objectIdWithTimestamp(t);
  // Fancy-pants aggregation to take binning into account
  var query = {"host": reader, "_id": {"$gt": id}};
  collection.aggregate([
    {$match: query},
    {$project: {
      time_bin: {
        $trunc: {
          $divide : [
            {$convert: {input: {$subtract: [{$toDate: "$_id"}, t]},
              to: 'decimal'
            }
            },
            1000*resolution
          ]
        }
      },
      insertion_time: {$toDate: "$_id"}, _id: 1, rate: 1, buffer_length: 1, host: 1
    }},
    {$group: {
      _id: '$time_bin',
      rate: {$avg: '$rate'},
      buff: {$avg: '$buffer_length'},
      host: {$first: '$host'}
    }},
    {$project: {
      _id: 1,
      time: {$convert: {input: {$add: [{$multiply: ['$_id', resolution, 1000]}, t]},
        'to': 'long'
      }},
      rate: 1,
      buff: 1,
      host: 1,
    }},
    {$sort: {time: 1}},
    {$group: {
      _id: '$host',
      rates: {$push: '$rate'},
      buffs: {$push: '$buff'},
      times: {$push: '$time'},
    }},
    {$project: {
      host: '$_id',
      rate: {$zip: {inputs: ['$times', '$rates']}},
      buff: {$zip: {inputs: ['$times', '$buff']}},
    }},
  ])
  .then( docs => {
    var ret = {};
    docs.forEach(doc => {ret[doc.host] = doc;});
    return res.json(ret);
  })
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/get_command_queue', function(req,res){
  var db = req.db;
  var collection = db.get("control");

  var q = url.parse(req.url, true).query;
  var limit = q.limit;
  if(typeof limit === 'undefined')
    limit = 10;
  var query = {};
  var last_id = q.id;
  if(typeof last_id !== 'undefined' && last_id != '0'){
    var oid = new req.ObjectID(last_id);
    query = {"_id": {"$gt": oid}};
  }

  collection.find(query, {"sort": {"_id": -1}, "limit": parseInt(limit, 10)})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/get_eb_status', function(req, res) {
  var q = url.parse(req.url, true).query;
  var collection = req.db.get("eb_monitor");
  var host = q.eb;
  if (typeof host == 'undefined')
    return res.json({});
  var ret = {};
  collection.findOne({host: host + '.xenon.local'}, {sort: {_id: -1}})
  .then(doc => {
    for (var key in doc) ret[key] = doc[key];
    ret['checkin'] = new Date()-doc['time'];
    return res.json(ret);
  }).catch(err => {console.log(err.message); return res.json({});});
});

router.get('/get_fill', function(req, res) {
  var url = "https://xenonnt.lngs.infn.it/slowcontrol/GetSCLastValue";
  url += "?name=XE1T.WLP_INDLEVL_H20_1.PI";
  url += "&username="+process.env.SC_API_USER;
  url += "&api_key="+process.env.SC_API_KEY;
  //console.log('GETTING FILL');
  //  console.log(url);
  axios.get(url)
    .then(response => res.send(response.data))
    .catch(err => res.send({message: err}));
});

module.exports = router;

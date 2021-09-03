// routes/monitor.js
var express = require("express");
var url = require("url");
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;
var gp = '';


function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect(gp+'/login');
}

function time_string_to_OID(timestamp, offset = 0){
    return(ObjectID(Math.floor((new Date(timestamp).getTime()+offset)/1000).toString(16) + "0000000000000000"))
}



router.get('/', ensureAuthenticated, function(req, res) {
  res.render('monitor', req.template_info_base);
});

router.get('/cable_map.json', ensureAuthenticated, function(req,res){
  req.db.get('cable_map').find({})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/board_map.json', ensureAuthenticated, function(req,res){
  req.db.get('board_map').find({})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});



// get last update on individual reader
router.get('/update/:reader', ensureAuthenticated, function(req,res){
  var query = {host: req.params.reader};
  var opts = {limit: 1, sort: {_id: -1}};
  req.db.get('status').find(query,opts)
    .then(docs => res.json(docs))
    .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/update_timestamp/:reader/:time', ensureAuthenticated, function(req,res){
  var oid_min = time_string_to_OID(req.params.time, -500)
  var oid_max = time_string_to_OID(req.params.time, 500)

  var query = {
    host: req.params.reader,
    _id: {
      $gte: oid_min,
      $lte: oid_max
    }
  }
  var opts = {limit: 1};
  req.db.get('status').find(query,opts)
    .then(docs => res.json(docs))
    .catch(err => {console.log(err.message); return res.json(query);});
    
});

router.get('/history/:reader/:pmts/:time_min/:time_max', ensureAuthenticated, function(req,res){
  var pmts = req.params.pmts.split(",");
  
  var oid_min = time_string_to_OID(req.params.time_min, -500)
  var oid_max = time_string_to_OID(req.params.time_max, 500)


  channels_list = {};
  for(pmt of pmts){
    channels_list[""+pmt] = 1
  }

  var mongo_pipeline = [
    {"$match":{
      host: req.params.reader,
      _id: {
        $gte: oid_min,
        $lte: oid_max
      }
    }},
    {$sort:{_id:1}},
    {"$project":{
      _id: 1,
      time: 1,
      host: 1,
      number: 1,
      channels: channels_list
    }}
  ];

    //res.json(mongo_pipeline)
  req.db.get('status').aggregate(mongo_pipeline)
    .then(docs => res.json(docs))
    .catch(err => {console.log(err.message); return res.json(mongo_pipeline);});
});


module.exports = router;

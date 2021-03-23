// routes/monitor.js
var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  res.render('monitor', req.template_info_base);
});

router.get('/get_updates', ensureAuthenticated,function(req,res){
  var readers = ['reader0_reader_0', 'reader1_reader_0', 'reader2_reader_0'];
  var db = req.db;
  var collection = db.get('status');
  ObjectID = req.ObjectID;

  var q = {host: {$in: readers}};
  if (typeof req.query.unixtime != 'undefined') {
    try{
      var unixtime = parseInt(req.query.unixtime);
      q._id = {$gt: ObjectID((unixtime-1).toString(16) + "0000000000000000"),
               $lt: ObjectID((unixtime+1).toString(16) + "0000000000000000")};
    }catch(err){
    }
  }
  collection.find(q, {sort: {_id: -1}, limit: 1})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json({});});
});
  // start mongo pipeline with empty array
  var mongo_pipeline = []
  mongo_pipeline.push({"$match":{"host":{'$in': tpc_readers}}});
  mongo_pipeline.push({"$sort": {"_id":-1}});
  mongo_pipeline.push({"$limit": 15});
  mongo_pipeline.push({"$group": {_id: "$host", lastid:{"$last": "$_id"}, channels:{"$last":"$channels"}}});


  // append time filter if parameter unixtime is given in url
  var int_unixtime = parseInt(req.query.unixtime);
  if(!isNaN(int_unixtime)){

    if(int_unixtime > 0){
      str_unixtime_min = (int_unixtime-1).toString(16) + "0000000000000000";
      str_unixtime_max = (int_unixtime+1).toString(16) + "0000000000000000";

      var oid_min = ObjectID(str_unixtime_min);
      var oid_max = ObjectID(str_unixtime_max);

      mongo_pipeline[0]["$match"]["_id"] = {
        "$gt": oid_min,
        "$lt": oid_max
      }
    }
  }
  //console.log(mongo_pipeline[0]["$match"]);
  collection.aggregate(
    mongo_pipeline,
    function(e,docs){
      res.json(docs);
    }

  );
});



// returns data that are back in time
// requires int_time_start, int_time_end and int_time_averaging_window
// averages then the data over int_time_averaging_window
router.get('/get_history', ensureAuthenticated,function(req,res){
    var db = req.db;
    var collection = db.get('status');
        ObjectID = req.ObjectID;
    
    
    // initialize used variables
    var json_pmts = [];
    var int_time_start = false;
    var int_time_end   = false;
    var int_time_averaging_window = false;
    
    // get all the time specifics
    var tmp = parseInt(req.query.int_time_start);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_start = tmp
    }
    var tmp = parseInt(req.query.int_time_end);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_end = tmp
    }
    var tmp = parseInt(req.query.int_time_averaging_window);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_averaging_window = tmp
    }
    
    
    // create time objects for comparission
    var str_time_start = (int_time_start).toString(16) + "0000000000000000";
    var oid_time_start = ObjectID(str_time_start);
    var str_time_end = (int_time_end+1).toString(16) + "0000000000000000";
    var oid_time_end = ObjectID(str_time_end);
    
    
    // get all pmt ids that are required
    var tmp_json_pmts = req.query.str_pmts.split(",");
    // check which entry is a number
    for(var i = 0; i < tmp_json_pmts.length; i = i+1){
        tmp = parseInt(tmp_json_pmts[i]);
        // keep value if its numeric and at learst zero
        if(!isNaN(tmp) && tmp >= 0){
            json_pmts.push(tmp);
        }
    }
    
    // test if data given was ok
    if(
        json_pmts.length == 0 ||
        int_time_start == false ||
        int_time_end == false ||
        int_time_averaging_window == false
    ){
        //console.log("something is zero")
        res.send("false");
        return(404);
    } else {
        //console.log("oK")
    }
    
    
    var json_project_pmts = {};
    var json_zero_pmts    = {};
    for(var i = 0; i < json_pmts.length;i += 1){
        var str_channel_pmt  = "channels."+String(json_pmts[i]);
        var str_channel_pmt2 = "$" + str_channel_pmt
        json_project_pmts[String(json_pmts[i])] = 1;
        json_zero_pmts[str_channel_pmt] = {$ifNull: [ str_channel_pmt2, -1 ] };
    
    }
    
    
    
    var mongo_pipeline = [];
    // roughly filter data to relevant hosts and timeframe
    mongo_pipeline.push(
    {"$match":{
        "_id":{"$gt": oid_time_start,"$lt": oid_time_end},
        "host":{$in: tpc_readers}}
    });
    
    // create time in seconds and kick out unnecesarry pmts
    mongo_pipeline.push({
        '$project': {
            time:{
                '$divide':[
                    {'$subtract': [ {"$toDate":"$_id"}, new Date(int_time_start*1000) ]},
                    1000
                ]
            },
            "_id": 0,
            channels: json_project_pmts,
        },
    },{
        '$group':{
            _id: "$time",
            channels: {"$mergeObjects": "$channels"}
        }
    });
    
    // complicateed setup to generate propper json to check if a rate is not set
    // set it to -1 so max one step later does not ignore thos timebins
    $project =  {
        timebin:{
            '$trunc': [
                {'$divide': [
                    "$_id",
                    int_time_averaging_window
                ]}
            ],
        }
    }
    for(var key in json_zero_pmts){
        value = json_zero_pmts[key];
        $project[key] = value;
    }
    
    
    
    // merge into timebins
    mongo_pipeline.push({
        $project
    })
    
    if(true){
        mongo_pipeline.push({
            '$group':{
                _id: {
                    '$add':[
                        {'$multiply': [
                            "$timebin",
                            int_time_averaging_window
                        ]},
                        int_time_start
                    ]
                },
                channels: {"$max": "$channels"},
            }
        })
    };
    // and sort by id again
    mongo_pipeline.push({
        '$sort': {
            "_id": 1,
        }
    });
    
    //console.log(mongo_pipeline);
    //res.json(mongo_pipeline);
    
    collection.aggregate(
        mongo_pipeline,
        function(e,docs){
            res.json(docs);
        }
    );
    
});


// get last update on individual reader
router.get('/update/:reader', ensureAuthenticated,function(req,res){
    var runs_db = req.runs_db;
    var collection = runs_db.get('status');
    
    collection.find({host: "reader"+req.params.reader+"_reader_0"},{limit:1, sort:{_id:-1}},function(e,docs){
        res.json(docs);
    })
});


module.exports = router;

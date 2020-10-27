var express = require('express');
var url = require('url');
var ObjectId = require('mongodb').ObjectID;
var router = express.Router();


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    var clients = {
	fdaq00_reader_0: { status: 'none', rate: 0, buffer_length: 0},
	fdaq00_reader_1: { status: 'none', rate: 0, buffer_length: 0}
    };
    res.render('status', { clients: clients, user: req.user});
    //    res.render('index', { clients: clients });
});

router.get('/get_detector_status', ensureAuthenticated, function(req, res){
	var db = req.db;
	var collection = db.get('aggregate_status');
	
	var q = url.parse(req.url, true).query;
	var detector = q.detector;
	
	collection.find({"detector": detector},
	{"sort": {"_id": -1}, "limit": 1},
	function(e, sdoc){
		if(sdoc.length === 0)
			return res.json({});
		var rdoc = sdoc[0];
		var now = new Date();
		var oid = new req.ObjectID(rdoc['_id']);
		var indate = Date.parse(oid.getTimestamp());
		rdoc['checkin'] = parseInt((now-indate)/1000, 10);
		rdoc['timestamp'] = indate;
		return res.json(rdoc);
	});
});

router.get('/get_controller_status', ensureAuthenticated, function(req, res){
	var db = req.db;
	var collection = db.get('status');
	
	var q = url.parse(req.url, true).query;
	var controller = q.controller;
	
	collection.find({"host": controller},
	{"sort": {"_id": -1}, "limit": 1},
	function(e, sdoc){
		if(sdoc.length === 0)
			return res.json({});
		var rdoc = sdoc[0];
		var now = new Date();
		var oid = new req.ObjectID(rdoc['_id']);
		var indate = Date.parse(oid.getTimestamp());
		rdoc['checkin'] = parseInt((now-indate)/1000, 10);
		rdoc['timestamp'] = indate;
		return res.json(rdoc);
	});
});

router.get('/get_reader_status', ensureAuthenticated, function(req, res){
    var db=req.db;
    var collection = db.get('status');

    var q = url.parse(req.url, true).query;
    var host = q.reader;
    
    collection.find(
	{'host': host}, {'sort': {'_id': -1}, 'limit': 1},
	function(e, sdoc){
	    if(sdoc.length == 0)
		return res.json({});
	    var rdoc = sdoc[0];
	    // console.log(rdoc);
	    // Basically return sdoc but we want to add time
	    // since client time may vary we assume server time
	    // is correct
	    var now = new Date();
	    var oid = new req.ObjectID(rdoc['_id']);
	    var indate = Date.parse(oid.getTimestamp());
	    rdoc['checkin'] = parseInt((now-indate)/1000, 10);
	    rdoc['ts'] = indate;
	    return res.json(rdoc);
	});
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

router.get('/get_reader_history', ensureAuthenticated, function(req,res){
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
    ], function(err, result){
	var ret = {};
	if(result.length > 0){
	    retval = result[0];
	    ret[retval['_id']] =  {'rates': [], 'buffs': []};
	    for(var i in retval['rates']){
		ret[retval['_id']]['rates'].push([retval['times'][i],
						  retval['rates'][i]]);
		ret[retval['_id']]['buffs'].push([retval['times'][i],
						  retval['buffs'][i]]);
	    };
	}
	else
	    ret = {'error': err};
	
	return res.json(ret);
    });
});

router.get('/get_command_queue', ensureAuthenticated, function(req,res){
	var db = req.db;
	var collection = db.get("control");
	
	var q = url.parse(req.url, true).query;
	var limit = q.limit;
	if(typeof limit === 'undefined')
		limit = 10;
	var findstr = {};
	var last_id = q.id;
	if(typeof last_id !== 'undefined' && last_id != '0'){
		var oid = new req.ObjectID(last_id);
		findstr = {"_id": {"$gt": oid}};
	}

	collection.find(findstr, {"sort": {"_id": -1},"limit": parseInt(limit, 10)}, 
	function(e, docs){
		return res.json(docs);
	});
});

router.get('/get_bootstrax_status', ensureAuthenticated, function(req, res) {
  var q = url.parse(req.url, true).query;
  var collection = req.db.get("eb_monitor");
  var now = new Date();
  collection.aggregate([
    {$sort : {_id : -1}},
    {$group : {
      _id : {$substr : ['$host', 0, 3]},
      state : {$first : '$state'},
      time : {$first : {$divide : [{$subtract : [now, '$time']}, 1000]}},
      target : {$first : '$target'},
      cores : {$first : '$cores'},
      run : {$first : {$ifNull : ['$run_id', 'none']}},
    }},
    {$sort : {_id : 1}}
  ], function(e, docs) {
    return res.json(docs);
  });
});

module.exports = router;

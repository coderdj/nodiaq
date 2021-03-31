var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('runsui', { title: 'Runs UI', user: req.user });
});

router.get('/get_run_doc', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var q = url.parse(req.url, true).query;
  var num = q.run;
  if(typeof num !== 'undefined')
    num = parseInt(num, 10);
  if(typeof num === "undefined")
    return res.json({});
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);
  collection.find({"number": num}, function(e, docs){
    if(docs.length ===0)
      return res.json({});
    return res.json(docs[0]);
  });
});

router.post('/addtags', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

  var runs = req.body.runs;
  var tag = req.body.tag;
  if (tag[0] === '_') // underscore tags are protected
    return res.sendStatus(403);
  var user = req.user.lngs_ldap_uid;

  // Convert runs to int
  var runsint = runs.map((val) => parseInt(val, 10));
  // Update many
  collection.update({"number": {"$in": runsint}, tags: {$elemMatch: {name {$ne: tag}}}},
    {"$push": {"tags": {"date": new Date(), "user": user,
      "name": tag}}},
    {multi:true}, function(){
      return res.sendStatus(200);
    });
});

router.post('/removetag', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

  var run = req.body.run;
  var tag = req.body.tag;
  var tag_user = req.body.user;

  if (tag[0] === '_') // underscore tags are protected
    return res.sendStatus(403);

  // Convert runs to int
  runint = parseInt(run);
  // Update one
  collection.update({"number": runint},
    {"$pull": {"tags": {"name": tag, "user": tag_user}}},
    {multi:false}, function(){
      return res.sendStatus(200);
    });
});


router.post('/addcomment', ensureAuthenticated, function(req, res){
    var db = req.runs_db;
    var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

    var runs = req.body.runs;
    var comment = req.body.comment;
    var user = req.user.lngs_ldap_uid;

    // Convert runs to int
    var runsint = [];
    for(var i=0; i<runs.length; i+=1)
	  runsint.push(parseInt(runs[i], 10));
    //console.log(runsint);
    // Update many
    collection.update({"number": {"$in": runsint}},
		      {"$push": {"comments": {"date": new Date(), "user": user,
					  "comment": comment}}},
		      {multi:true}, function(){
			  return res.sendStatus(200);
		      });

});

router.get('/runsfractions', ensureAuthenticated, function(req, res){
    var db = req.runs_db;
    var collection = db.get(process.env.RUNS_MONGO_COLLECTION);
    var q = url.parse(req.url, true).query;
    var days = q.days;
    if( typeof days === 'undefined')
	days = 30;
    var total = days*86400*1000;
    var querydays = new Date(new Date() - total);
    collection.aggregate([
      {$match : {detectors : 'tpc', start : {$gt : querydays}}},
      {$project : {mode : 1, user : 1, start : 1, end : 1}},
      {$group : {
        _id : '$mode',
        runtime : {
          $sum : {
            $divide : [
              {$subtract : [
                {$ifNull : ['$end', new Date()]},
                '$start'
              ]}, // subtract
              total] // divide
          } // sum
        } // runtime
      }}], function(e, docs) {
        return res.json(docs);
      });
});

module.exports = router;

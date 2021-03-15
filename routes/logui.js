var express = require("express");
var url = require("url");
var router = express.Router();
var pf = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(pf+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('logui', { title: 'Help', user:req.user });
});

router.get('/areThereErrors', ensureAuthenticated, function(req, res){
    var db=req.db;
    var collection=db.get('log');
    var error_codes = [2, 3, 4]; //warning, error, fatal
    collection.find({"priority": {"$in": error_codes}}, {}, function(e, docs){
	var ndocs = docs.length;
	return res.json({"error_docs": ndocs});
    });
});			

router.get('/getMessages', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('log');
    var q = url.parse(req.url, true).query;
    var limit = q.limit;
    var include = q.get_priorities;
    if (typeof include == 'undefined')
	include = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    else
	include = include.map(Number);

    if (typeof limit == 'undefined')
        limit = 100; //sure, why not
    collection.aggregate([
      {$match: {priority: {$in: include}}},
      {$sort: {_id: -1}},
      {$limit: parseInt(limit)},
      {$project: {time: {$toDate: '$_id'}}}
    ).then(docs => res.json(docs))
    .catch(err => {console.log(err.message); return res.json([]);});
});


router.post('/new_log_message', ensureAuthenticated, (req, res) => {
    var db = req.db;
    var collection = db.get("log");
    var p = 5;
    if(typeof req.body.priority != 'undefined')
      p=parseInt(req.body.priority);
    var idoc = {
	"user": req.user.last_name,
	"message": req.body.entry,
	"priority": p,
	"time": new Date()
    }
    collection.insert(idoc);
    return res.json(idoc);
});

router.post('/acknowledge_errors', ensureAuthenticated, (req, res) => {
    var db = req.db;
    var collection = db.get("log");
    var error_codes = [2, 3, 4]; //warning, error, fatal
    var matchdoc = {"priority": {"$in": error_codes}};
    var updatedoc = {
        "$inc": {"priority": 10},
        "$set": {
            "closing_user": req.user.last_name,
            "closing_message": req.body.message,
            "closing_date": new Date()
        } 
    }
    collection.update(matchdoc, updatedoc, {"multi": true},
		      function(err, doc){
			  if(err == null)
			      return res.json(updatedoc);
			  else
			      return res.status(400).send('Failed to update DB');
		      });
    
});
module.exports = router;

var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  var template = template_info_base;
  template['experiment'] = 'XENONnT'
  res.render('runsui', req.template_info_base);
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
  collection.findOne({"number": num})
  .then( doc => res.json(doc === null ? {} : doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.post('/addtags', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

  var runs = req.body.runs;
  var tag = req.body.tag;
  var user = req.user.lngs_ldap_uid;

  if (tag[0] === '_') { // underscore tags are protected
    return res.sendStatus(403);
  }

  // Convert runs to int
  runsint = runs.map(val => parseInt(val, 10));
  // Update many
  var query = {number: {$in: runsint}};
  var update = {$push: {tags: {date: new Date(), user: user, name: tag}}};
  collection.updateMany(query, update)
  .then( () => res.sendStatus(200))
  .catch(err => {console.log(err.message); return res.sendStatus(200);});
});

router.post('/removetag', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

  var run = req.body.run;
  var tag = req.body.tag;
  var tag_user = req.body.user;

  if (tag[0] === '_') { // underscore tags are protected
    return res.sendStatus(403);
  }
  // Convert runs to int
  runint = parseInt(run, 10);
  // Update one
  var query = {number: runint};
  var update = {$pull: {tags: {name: tag, user: tag_user}}};
  collection.updateOne(query, update)
  .then(() => res.sendStatus(200))
  .catch(err => {console.log(err.message); return res.sendStatus(200);});
});


router.post('/addcomment', ensureAuthenticated, function(req, res){
  var db = req.runs_db;
  var collection = db.get(process.env.RUNS_MONGO_COLLECTION);

  var runs = req.body.runs;
  var comment = req.body.comment;
  var user = req.user.lngs_ldap_uid;

  // Convert runs to int
  var runsint = runs.map(val => parseInt(val, 10));
  // Update many
  var query = {number: {$in: runsint}};
  var update = {$push: {comments: {date: new Date(), user: user, comment: comment}}};
  collection.updateMany(query, update)
  .then( () => res.sendStatus(200))
  .catch(err => {console.log(err.message); return res.sendStatus(200);});
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
    }}])
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]););
});

module.exports = router;

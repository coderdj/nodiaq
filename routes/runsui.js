// routes/runsui.js
var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';
const SCRIPT_VERSION = '20210407';

router.get('/', function(req, res) {
  var template = req.template_info_base;
  template['experiment'] = 'XENONnT'
  res.render('runsui', template);
});

router.get('/get_run_doc', function(req, res){
  var q = url.parse(req.url, true).query;
  var num = q.run;
  if(typeof num !== 'undefined')
    num = parseInt(num, 10);
  if(typeof num === "undefined")
    return res.json({});
  req.runs_coll.findOne({"number": num})
  .then( doc => res.json(doc === null ? {} : doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.post('/addtags', function(req, res){
  var runs = req.body.runs;
  var tag = req.body.tag;
  if (typeof req.body.version == 'undefined' || req.body.version != SCRIPT_VERSION)
    return res.json({err: "Please hard-reload your page (shift-f5 or equivalent)"});
  if (tag[0] === '_') // underscore tags are protected
    return res.sendStatus(403);
  var user = req.user.lngs_ldap_uid;

  if (tag[0] === '_') { // underscore tags are protected
    return res.sendStatus(403);
  }

  // Convert runs to int
  var runsint = runs.map(parseInt);
  // Update many
  var query = {number: {$in: runsint}, 'tags.name': {$ne: tag}};
  var update = {$push: {tags: {date: new Date(), user: user, name: tag}}};
  var opts = {multi: true};
  req.runs_coll.update(query, update, opts)
  .then( () => res.status(200).json({}))
  .catch(err => {console.log(err.message); return res.status(200).json({err: err.message});});
});

router.post('/removetag', function(req, res){
  var run = req.body.run;
  var tag = req.body.tag;
  var tag_user = req.body.user;
  if (typeof req.body.version == 'undefined' || req.body.version != SCRIPT_VERSION)
    return res.json({err: "Please hard-reload your page (shift-f5 or equivalent)"});

  if (tag[0] === '_') { // underscore tags are protected
    return res.sendStatus(403);
  }
  // Convert runs to int
  runint = parseInt(run, 10);
  // Update one
  var query = {number: runint};
  var update = {$pull: {tags: {name: tag, user: tag_user}}};
  req.runs_coll.update(query, update)
  .then(() => res.status(200).json({}))
  .catch(err => {console.log(err.message); return res.status(200).json({err: err.message});});
});

router.post('/addcomment', function(req, res){
  var runs = req.body.runs;
  var comment = req.body.comment;
  var user = req.user.lngs_ldap_uid;

  if (typeof req.body.version == 'undefined' || req.body.version != SCRIPT_VERSION)
    return res.json({err: "Please hard-reload your page (shift-f5 or equivalent)"});

  // Convert runs to int
  var runsint = runs.map(parseInt);
  // Update many
  var query = {number: {$in: runsint}};
  var update = {$push: {comments: {date: new Date(), user: user, comment: comment}}};
  var opts = {multi: true};
  req.runs_coll.update(query, update, opts)
  .then( () => res.status(200).json({}))
  .catch(err => {console.log(err.message); return res.status(200).json({err: err.message});});
});

router.get('/runsfractions', function(req, res){
  var q = url.parse(req.url, true).query;
  var days = q.days;
  if( typeof days === 'undefined')
    days = 30;
  var total = days*86400*1000;
  var querydays = new Date(new Date() - total);
  req.runs_coll.aggregate([
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
  .catch(err => {console.log(err.message); return res.json([]);});
});

module.exports = router;

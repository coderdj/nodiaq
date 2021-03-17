var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  res.render('options', { title: 'Options', user:req.user });
});

router.get("/options_list", ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get('options');
  collection.aggregate([
    {$unwind: '$detector'},
    {$sort: {name: 1}},
    {$group: {_id: '$detector', modes: {$push: '$name'}}},
    {$sort: {_id: -1}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get("/options_json", ensureAuthenticated, function(req, res){
  var query = url.parse(req.url, true).query;
  var name = query.name;
  if(typeof name == "undefined")
    return res.json({"ERROR": "No name provided"});

  var db = req.db;
  var collection = db.get('options');
  collection.findOne({"name": name}, {})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({'ERROR': 'No config found'});});
});

router.post("/set_run_mode", ensureAuthenticated, function(req, res){
  doc = JSON.parse(req.body.doc);
  if (typeof doc._id != 'undefined')
    delete doc._id;
  doc['last_modified'] = new Date();

  var db = req.db;
  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"res": "I can't allow you to do that Dave"});

  var collection = db.get('options');
  if(typeof doc['name'] === 'undefined')
    return res.redirect("/options");
  collection.remove({name: doc['name']}, {})
    .then( () => collection.insert(doc, {}))
    .then( () => res.sendStatus(200))
    .catch((err) => {console.log(err.message); return res.json({"res": err.message});});
});

router.get("/remove_run_mode", ensureAuthenticated, function(req, res){
  var query = url.parse(req.url, true).query;
  var name = query.name;
  var db = req.db;
  var collection = db.get('options');

  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"res": "I can't allow you to do that Dave"});

  collection.remove({'name': name}, {})
  .then(() => res.sendStatus(200)))
  .catch(err => {console.log(err.message); return res.redirect("/options");});
});


module.exports = router;

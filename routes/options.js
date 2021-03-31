// routes/options.js
var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  var template_info = req.template_info_base;
  template_info['extra_detectors'] = [['include', 'Includes']];
  res.render('options', template_info);
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
  collection.findOne({"name": name})
  .then( doc => res.json(doc))
  .catch(error => res.json({"error": error.message}));
});

router.post("/set_run_mode", ensureAuthenticated, function(req, res){
  doc = JSON.parse(req.body.doc);
  if (typeof doc._id != 'undefined')
    delete doc._id;
  doc['last_modified'] = new Date();

  var db = req.db;
  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"err": "I can't allow you to do that Dave"});

  var collection = db.get('options');
  if(typeof doc['name'] === 'undefined')
    return res.redirect("/options");
  collection.remove({name: doc['name']})
    .then( () => collection.insert(doc, {}))
<<<<<<< HEAD
    .then( () => res.status(200).json({}))
    .catch(err => {console.log(err.message); return res.json({"err": err.message});});
=======
    .then( () => res.json({msg: "Success"}))
    .catch((err) => {console.log(err.message); return res.json({"res": err.message});});
>>>>>>> master
});

router.get("/remove_run_mode", ensureAuthenticated, function(req, res){
  var query = url.parse(req.url, true).query;
  var name = query.name;
  var db = req.db;
  var collection = db.get('options');

  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"err": "I can't allow you to do that Dave"});

<<<<<<< HEAD
  collection.deleteOne({'name': name})
  .then( () => res.status(200).json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
=======
  collection.remove({'name': name}, {})
  .then(() => res.json({msg: 'Success'}))
  .catch(err => {console.log(err.message); return res.redirect("/options");});
>>>>>>> master
});


module.exports = router;

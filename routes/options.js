// routes/options.js
var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';
const SCRIPT_VERSION = '20210622';

function TemplateInfo(req) {
  var template_info = req.template_info_base;
  template_info['extra_detectors'] = [['include', 'Includes']];
  return template_info;
}

router.get('/', function(req, res) {
  res.render('options', TemplateInfo(req));
});

router.get('/template_info', function(req, res) {
  return res.json(TemplateInfo(req));
});

router.get("/options_list", function(req, res){
  req.db.get('options').aggregate([
    {$unwind: '$detector'},
    {$sort: {name: 1}},
    {$group: {_id: '$detector', modes: {$push: '$name'}}},
    {$sort: {_id: -1}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get("/options_json", function(req, res){
  var query = url.parse(req.url, true).query;
  var name = query.name;
  if(typeof name == "undefined")
    return res.json({"ERROR": "No name provided"});

  req.db.get('options').findOne({"name": name})
  .then( doc => res.json(doc))
  .catch(error => res.json({"error": error.message}));
});

router.post("/set_run_mode", function(req, res){
  doc = JSON.parse(req.body.doc);
  if (typeof doc._id != 'undefined')
    delete doc._id;
  doc['last_modified'] = new Date();
  if (typeof req.body.version == 'undefined' || req.body.version != SCRIPT_VERSION)
    return res.json({res: "Please hard-reload your page (shift-f5 or equivalent)"});

  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"err": "I can't allow you to do that Dave"});

  if(typeof doc['name'] === 'undefined')
    return res.redirect("/options");
  req.db.get('options').remove({name: doc['name']})
    .then( () => req.db.get('options').insert(doc, {}))
    .then( () => res.status(200).json({}))
    .catch(err => {console.log(err.message); return res.json({"err": err.message});});
});

router.get("/remove_run_mode", function(req, res){
  var query = url.parse(req.url, true).query;
  var name = query.name;
  if (typeof query.version == 'undefined' || query.version != SCRIPT_VERSION)
    return res.json({res: 'Please hard-reload the page (shift-f5 or equivalent)'});

  // Check permissions
  if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
    return res.json({"err": "I can't allow you to do that Dave"});

  req.db.get('options').remove({'name': name})
  .then( () => res.status(200).json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});


module.exports = router;

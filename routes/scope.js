// routes/scope.js
var express = require("express");
var http = require("http");
var url = require("url");
var { URL } = require("url");
var router = express.Router();
var gp = '';
const BA = "https://xenonnt.lngs.infn.it";

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('scope', req.template_info_base);
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
  var collection = req.runs_db.get(process.env.RUNS_MONGO_COLLECTION);
  var query = {'data.host' : /eb[0-5]\.xenon\.local/};
  var options = {};
  collection.distinct('number', query, options)
  .then(docs => res.json(docs))
  .catch(err => res.json({message: err.message}));
});

router.get("/available_targets", ensureAuthenticated, function(req, res) {
  var q = url.parse(req.url, true).query;
  var run = q.run;
  if (typeof run === 'undefined') return res.json({message : 'Invalid run'});
  var collection = req.runs_db.get(process.env.RUNS_MONGO_COLLECTION);
  try {
    var query = {number : parseInt(run)};
  }catch(err){
    return res.json({message : err.message});
  }
  var options = { data : 1};
  collection.findOne(query, options)
  .then(doc => res.json(doc.data.filter(entry => /eb[0-5]\.xenon\.local/.test(entry)).map(entry => entry.type)))
  .catch(err => res.json({message: err.message}));
});

router.get("/get_data", ensureAuthenticated, function(req, res) {
  var collection = req.db.get("eb_monitor");
  collection.find({host : 'eb2.xenon.local'}, {sort : {_id : -1}, limit : 1}, function(err, docs) {
      if (err || docs.length == 0) {
        return res.json({message : 'Microstrax is currently unavailable, please try again later'});
      }
      var dt = new Date() - docs[0]['time'];
      var timeout = 120*1000; // 2 minutes
      if (dt > timeout) {
        return res.json({message : 'Microstrax is currently unavailable, please try again later'});
      }
  try{
    var sp = new URL(req.url, BA).searchParams;
  }catch(err){
    return res.json({message : err.message});
  };
  var run = sp.get('run_id');
  var target = sp.get('target');
  var max_n = sp.get('max_n');
  var channel = sp.get('channel');
  if (typeof run === 'undefined' || typeof target === 'undefined' || typeof max_n === 'undefined')
    return res.json({message : "Invalid input"});
  try {
    run = parseInt(run);
    max_n = parseInt(max_n);
    channel = parseInt(channel);
  }catch(err){
    return res.json({message : 'Invalid input: ' + err.message});
  }
  var url = "http://eb2:8000/get_data?";
  url += "run_id=" + run + "&target=" + target + "&max_n=" + max_n;
  if (target.search(/records/) != -1 || target === 'veto_regions' || target === 'lone_hits')
    url += "&selection_str=channel==" + channel;
  http.get(url, (resp) => {
    let data = "";
    resp.on('data', (chunk) => {
      data += chunk;
    }).on('end', () => {
      return res.send(data);
    }).on('error', (err) => {
      return res.json({message : err.message});
    });
  }); // http.get
  }); // eb2 is available
});

module.exports = router;

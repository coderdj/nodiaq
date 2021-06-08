var express = require("express");
var url = require("url");
var router = express.Router();
var gp='';
const SCRIPT_VERSION = '20210407';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('control', { title: 'Control', user:req.user });
});

router.get('/modes', ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get("options");
  var q = url.parse(req.url, true).query;
  var detector = q.detector;
  collection.aggregate([
    {$match: {detector: {$ne: 'include'}}},
    {$addFields: {_detector: '$detector'}},
    {$unwind: '$detector'},
    {$sort: {name: 1}},
    {$group: {
      _id: '$detector',
      options: {$push: '$name'},
      desc: {$push: '$description'},
      link: {$push: {$cond: [{$isArray: '$_detector'}, '$_detector', ['$_detector']]}}
    }},
    {$project: {configs: {$zip: {inputs: ['$options', '$desc', '$link']}}}}
  ]).then( (docs) => res.json(docs))
  .catch( (err) => {console.log(err.message); return res.json({error: err.message})});
});

function GetControlDoc(collection, detector) {
  var keys = ['active', 'comment', 'mode', 'remote', 'softstop', 'stop_after'];
  var p = keys.map(k => collection.findOne({key: `${detector}.${k}`}, {sort: {_id: -1}}));
  return Promise.all(p).then(values => {
    var ret = {detector: detector};
    var latest = values[0].time;
    var user = values[0].user;
    values.forEach(doc => {
      ret[doc.field] = doc.field == 'stop_after' ? parseInt(doc.value) : doc.value;
      if (doc.time > latest) {
        user = doc.user;
        latest = doc.time;
      }
    });
    ret['user'] = user;
    return ret;
  }).catch(err => {console.log(err.message); return {};});
}

router.get("/get_control_doc", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("detector_control");
  var detector = url.parse(req.url, true).query.detector;
  if (typeof detector == 'undefined' || detector == '')
    return res.json({});
  GetControlDoc(collection, detector)
    .then(doc => res.json(doc))
    .catch(err => {console.log(err.message); return res.json({});});
});

router.post('/set_control_docs', ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get("detector_control");
  if (typeof req.user.lngs_ldap_uid == 'undefined')
    return res.sendStatus(403);
  var data = req.body.data;
  if (typeof data.version == 'undefined' || data.version != SCRIPT_VERSION)
    return res.json({'err': 'Please hard-reload your page (shift-f5 or equivalent)'});
  var count = 0;
  ['tpc', 'muon_veto', 'neutron_veto'].forEach(det => {
    GetControlDoc(collection, det).then(olddoc => {
      var newdoc = data[det];
      if (typeof newdoc == 'undefined') {
        if (++count >= 3) return res.status(200).json({});
        return;
      }
      for (var key in olddoc) {
        if (key == 'user' || key == 'detector')
          continue;
        if (typeof newdoc[key] != 'undefined' && newdoc[key] != olddoc[key]){
          collection.insert({detector: det, field: key, value: key == 'stop_after' ? parseInt(newdoc[key]) : newdoc[key], user: req.user.lngs_ldap_uid, time: new Date(), key: `${det}.${key}`});
        }
      }
      if (++count >= 3) return res.status(200).json({});
    })
    .catch(err => {
      console.log(err.message);
      if (++count >= 3) return res.status(200).json({err: err.message});
    });
  }); // forEach
});

module.exports = router;

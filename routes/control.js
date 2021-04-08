var express = require("express");
var url = require("url");
var router = express.Router();
var gp='';

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
    {$addFields: {_detector: '$detector'}},
    {$unwind: '$detector'},
    {$match: {detector: {$ne: 'include'}}},
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
  console.log('Getting control doc for ' + detector);
  var keys = ['active', 'comment', 'mode', 'remote', 'stop_after', 'softstop'];
  var p = keys.map(k => collection.findOne({key: `${detector}.${k}`}, {sort: {_id: -1}}));
  return Promises.all(p).then(values => {
    console.log('Got doc for ' + detector);
    var latest = null;
    var ret = {detector: detector};
    for (var i = 0; i < values.length; i++) {
      var doc = values[i];
      ret[doc.field] = doc.value;
      if (latest == null || doc.time > latest) {
        latest = doc.time;
        ret['user'] = doc.user;
      }
    }
    return ret;
  }).catch(err => {
    console.log(err.message);
    return {};
  });
}

router.get("/get_control_docs", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("detector_control");
  var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
  Promises.all(detectors.map(det => GetControlDoc(collection, det)), docs => {
    res.json(docs);
  }).catch(err => {console.log(err.message); return res.json({});});
});

router.post('/set_control_docs', ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get("detector_control");

  if (typeof req.user.lngs_ldap_uid == 'undefined')
    return res.sendStatus(403);
  var data = req.body.data;
  var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
  Promise.all(detectors.map(det => GetControlDoc(collection, det)), docs => {
    var updates = [];
    for (var i in docs) {
      var olddoc = docs[i];
      var newdoc = data[olddoc['detector']];
      if (typeof newdoc == 'undefined')
        continue;
      for (var key in olddoc.state)
        if (typeof newdoc[key] != 'undefined' && newdoc[key] != olddoc.state[key])
          updates.push({detector: olddoc['detector'], field: key, value: newdoc[key], user: req.user.lngs_ldap_uid, time: new Date(), key: olddoc['detector']+'.'+key});
    }
    if (updates.length > 0)
      return collection.insert(updates);
    else
      return 0;
  }).then( () => res.sendStatus(200))
    .catch((err) => { console.log(err.message); return res.sendStatus(451);});
});

module.exports = router;

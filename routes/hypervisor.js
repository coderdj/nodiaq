var express = require('express');
var url = require('url');
var router = express.Router();


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated() && typeof req.user.groups != 'undefined' && req.user.groups.includes('daq'))
    return next();
  return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  res.render('hypervisor');
});

router.get('/vme_status', ensureAuthenticated, function(req, res) {
  req.db.get('system_monitor').find({host: 'vme'}, {sort: {_id: -1}, limit: 1})
  .then( (docs) => {
    if (docs.length == 0)
      return res.json({});
    docs[0]['checkin'] = new Date()-docs[0]['time'];
    return res.json(docs[0]);
  }).catch( (err) => res.json({err: err.message}));
});

router.post('/control', ensureAuthenticated, function(req, res) {
  data = req.body.data;
});

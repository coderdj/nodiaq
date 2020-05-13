var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('help', { title: 'Help', user: req.user });
});

router.get('/monitor', ensureAuthenticated, function(req, res) {
    res.render('help_monitor', { title: 'Monitor Help', user: req.user });
});



module.exports = router;

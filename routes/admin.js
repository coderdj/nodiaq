var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '/xenonnt';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('admin', { title: 'Admin', user: req.user });
});



module.exports = router;
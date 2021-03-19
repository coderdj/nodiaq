// routes/users.js
var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  res.render('users', req.template_info_base);
});

router.post('/getDirectory', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get("users");
    collection.find({}, {"sort": {"last_name": -1}},
		    function(e, docs){
			return res.json({"data": docs});
		    });
});

router.post('/addUserGroup', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get("users");
    var user_id = req.body.the_user;
    var group = req.body.the_group;

    // Just quietly fail if you didn't get the required info
    if(typeof(user_id) == 'undefined' || typeof(group) == 'undefined')
	return res.json({"res": "bad_input"});
    console.log(req.user.groups);
    if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("admin"))
	return res.json({"res": "not_allowed"});

    // Update the doc
    collection.update({"_id": user_id}, {"$push": {"groups": group}});
    return res.json({"res": "success", "group": group});
});

router.post('/removeUserGroup', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get("users");
    var user_id= req.body.the_user;
    var group =req.body.the_group;

    // Just quietly fail if you didn't get the required info
    if(typeof(user_id) == 'undefined' || typeof(group) == 'undefined')
        return res.json({"res": "bad_input"});
    if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("admin"))
	return res.json({"res": "not_allowed"});


    // Update the doc
    collection.update({"_id": user_id}, {"$pull": {"groups": group}});
    return res.json({"res": "success", "group": group});
});

module.exports = router;

var express = require('express');
var url = require('url');
var http = require('https');
var router = express.Router();
var gp="";

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}  

/* GET home page. */
router.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', req.template_info_base);
});

router.get('/detector_history', ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get('aggregate_status');

  // Get limit from GET
  var q = url.parse(req.url, true).query;
  var limit = q.limit;
  var detector = q.detector;

  if(typeof(limit) == 'undefined')
    limit = 1;
  if(typeof(detector) == 'undefined')
    return res.json({});

  collection.find({'detector': detector}, {'sort': {'_id': -1}, 'limit': parseInt(limit)})
  .then(docs => {
    ret = { "rates": [], "buffs": []};
    docs.forEach(doc => {
      //var oid = new req.ObjectID(docs[i]['_id']);
      //var dt = Date.parse(oid.getTimestamp());
      ret['rates'].unshift([doc['time'], doc['rate']]);
      ret['buffs'].unshift([doc['time'], doc['buff']]);
    });
    return res.json(ret);
  })
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/get_current_shifters', ensureAuthenticated, function(req, res){
  var db = req.users_db;
  var collection = db.get("shifts");

  var today = new Date();
  collection.aggregate([
    {$match: {start: {$lte: today}, end: {$gte: today}}},
    {$lookup: {from: 'users', localField: 'shifter', foreignField: 'lngs_ldap_uid', as: 'userdoc'}},
    {$project: {udoc: {$first: '$userdoc'}, shifter: 1, type: 1}},
    {$project: {
      'shifter': '$udoc.lngs_ldap_uid',
      'shift_type': '$type',
      'shifter_name': {$concat: ['$udoc.first_name', ' ', '$udoc.last_name']},
      'shifter_email': {$ifNull: ['$udoc.email', 'Not set']},
      'shifter_phone': {$ifNull: ['$udoc.cell', 'Not set']},
      'shifter_skype': {$ifNull: ['$udoc.skype', 'Not set']},
      'shifter_github': {$ifNull: ['$udoc.github', 'Not set']}
    }}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', { user: req.user });
});

router.get('/account/request_github_access', ensureAuthenticated, function(req, res){

    var owner = process.env.GITHUB_ADMIN_USER;
    var password = process.env.GITHUB_ADMIN_PASSWORD;
    var gid = req.user.github;
    var q = url.parse(req.url, true).query;
    var group = q.group;

    // Just in case
    if(group != 'xenon1t' && group != 'xenonnt'){
	console.log(group);
	return res.json({"error": "sneaky"});
    }

  axios.post('https://api.github.com/orgs/xenonnt/invitations',
    {"invitee_id": gid,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET
    },
    {headers: {'Accept': 'application/vnd.github.v3+json'}},

    options = {
	hostname: 'api.github.com',
	port: 443,
	path: '/orgs/' + group + '/memberships/' + gid,
	method: 'PUT',
	body: {
	    "role": "member",
	    "state": "active"
	},
	auth: owner + ":" + password,
	headers: {
	    "User-Agent": "Other"
	}
	//'Content-Type': 'application/x-www-form-urlencoded',
	//'Content-Length': Buffer.byteLength(postData)
	//}
    };
    console.log(options);
    const request = http.request(options, (response) => {
	response.setEncoding('utf8');
	response.on('data', (chunk) => {
	    console.log(`BODY: ${chunk}`);
	    //return response.json(chunk);
	});
	response.on('end', () => {
	    console.log('No more data in response.');
	});
    });
    request.on('error', (e) => {
	console.error(`problem with request: ${e.message}`);
    });
    request.end();    
    
});

router.get('/account/request_api_key', ensureAuthenticated, function(req, res){
    
    var api_username = req.user.lngs_ldap_uid;
    if (typeof req.user.lngs_lap_uid == 'undefined')

    // Generate API key
    var apikey = require("apikeygen").apikey;
    var key = apikey();

    // Hash it
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    //var salt = bcrypt.genSaltSync(saltRounds);
    //var hash = bcrypt.hashSync(key, salt);
    var db = req.runs_db;
    var collection = db.get("users");
    bcrypt.hash(key, saltRounds, function(err, hash) {

        collection.update({"lngs_ldap_uid": req.user.lngs_ldap_uid},
		          {"$set": {"api_key": hash}});
        req.user.api_key = key;
        return res.redirect(gp+"/account");
    });
});

router.post('/updateContactInfo', ensureAuthenticated, (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    var idoc = {};
    if(req.body.email != ""){
	idoc['email'] = req.body.email;
	req.user.email = req.body.email;
    }
    if(req.body.skype != ""){
        idoc["skype"] = req.body.skype;
	req.user.skype = req.body.skype;
    }
    if(req.body.cell != ""){	
        idoc["cell"] = req.body.cell;
	req.user.cell = req.body.cell;
    }
    if(req.body.favorite_color != ""){
        idoc["favorite_color"] = req.body.favorite_color;
	req.user.favorite_color = req.body.favorite_color;
    }
    collection.update({"first_name": req.user.first_name,
		       "last_name": req.user.last_name},
		      {"$set": idoc});
    //console.log(req.user);
    //console.log(idoc);    
    return(res.redirect(gp+'/account'));
}); 

router.get('/login', function(req, res){
    res.render('login', { user: req.user });
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});


router.get("/verify", function(req, res){
    var db = req.runs_db;
    var collection = db.get("users");
    var q = url.parse(req.url, true).query;
    var code = q.code;
    var timeout = 10*1000*60;
    collection.find({"github_hash": code},
		    function(e, docs){
			if(docs.length == 1){
                console.log('GITHUB verification at ' + new Date() + ' | ' + docs[0]["auth_time"]);
                if (new Date() - docs[0]["auth_time"] > timeout) {
                    collection.update({"_id": docs[0]["_id"]},
                        {$unset: {github_temp: 1, github_hash: 1, auth_time: 1
                        }});
                    return res.render("confirmationLander",
                        {message: "That code has expired"});
                }
			    collection.update({'_id': docs[0]['_id']},
					      {$set: {github: docs[0]['github_temp']},
					       $unset: {github_temp: 1, github_hash: 1, auth_time: 1}});
			    return res.render("confirmationLander",
					      {message: "Account linked, you can now login"});
			}
			else
			    res.render("confirmationLander",
				       {message: "Couldn't find an account to link"});
		    });

});

router.get("/verify_ldap", function(req, res){
    var db = req.runs_db;
    var collection = db.get("users");
    var q = url.parse(req.url, true).query;
    var code = q.code;
    var timeout = 10*1000*60;
    collection.find({"ldap_hash": code},
                    function(e, docs){
                        if(docs.length == 1){
                            console.log('LDAP verification at ' + new Date() + ' + ' + docs[0]["auth_time"]);
                            if (new Date() - docs[0]["auth_time"] > timeout) {
                                collection.update({
                                    "_id": docs[0]["_id"]},
                                    {"$unset": {
                                        "ldap_temp": 1,
                                        "ldap_hash": 1,
                                        "auth_time": 1
                                    }});
                                return res.render("confirmationLander",
                                    {message: "That code has expired"})
                            }
                            collection.update({'_id': docs[0]['_id']},
                                              {$set: {lngs_ldap_uid: docs[0]['ldap_temp']},
                                               $unset: {ldap_temp: 1, ldap_hash: 1, auth_time: 1}});
                            return res.render("confirmationLander",
                                              {message: "Account linked, you can now login"});
                        }
                        else
                            res.render("confirmationLander",
                                       {message: "Couldn't find an account to link"});
                    });

});

function SendConfirmationMail(req, random_hash, link, callback){
    // send mail
    var transporter = req.transporter;
    var mailOptions = {
        from: process.env.DAQ_CONFIRMATION_ACCOUNT,
        to: req.body.email,
        subject: 'XENONnT Account Confirmation',
        html: '<p>Please click <a href="https://xenon1t-daq.lngs.infn.it/'+link+'?code='+random_hash+'">here</a> within the next 10 minutes to verify your email.</p><p>If you did not request this email please delete.</p>'
    };
    
    transporter.sendMail(mailOptions, function(error, info){
	if (error) {
            console.log(error);
	    callback(false);
	}
	callback(true);
    });
}

function ConvertToDate(value){
    // The member sheet contains a lot of different date formats. 
    // We will try here to convert the string to a date object.
    var moment = require('moment');
    
    // wtf
    var allowedDateFormats = ['YYYY', 'MMM. YYYY', 'MMM.YYYY', 'MMM-YY', 'MMM. YY', 'MMM.YY',
			      'MMM YYYY'];
    if(moment(value, allowedDateFormats, true).isValid())
	return moment(value, allowedDateFormats, true).toDate();
    
    // Try second time with non-strict mode
    if(moment(value, allowedDateFormats, false).isValid())
	return moment(value, allowedDateFormats, false).toDate();

    // I give up, maybe it's in Portuguese. Return some dummy date so querying easy.
    return moment("1999-01-01").toDate();

}


// Use Google APIs to search our membership spreadsheet
const {google} = require('googleapis');
let privatekey = require("/etc/googleapikey.json");

router.post("/linkLDAP", function(req, res) {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.lngs_id != "" && req.body.email != ""){
	collection.find({"email": req.body.email},
			function(e, docs){
			    //TryToFindUser(docs, req.body.email, collection, function(haveUser){
				//if(!haveUser)
                if (docs.length == 0)
				    return res.render(
					"confirmationLander",
					{message: "You don't seem to be in our database"});
				
				// Synchronous
				const cryptoRandomString = require('crypto-random-string');
				const random_hash = cryptoRandomString({length: 64, type: 'url-safe'});
				collection.update({"email": req.body.email},
						  {"$set": {"ldap_temp": req.body.lngs_id,
                                    "ldap_hash": random_hash,
                                    "auth_time": new Date()}});
				// Send Mail
				SendConfirmationMail(req, random_hash, 'verify_ldap', function(success){
				    if(success)
					return res.render("confirmationLander",
							  {message: "Check your email"});
				    else
					return res.render(
					    "confirmationLander",
					    {message: "Failed to send email confirmation"});
				    }); // end confirmation mail callback
			//}); // end try to find user callback
			}); // end mongo query callback
    }
    else
        return res.render("confirmationLander", 
			  {message: "You must provide a valid email and LDAP ID"});
});

router.post("/linkGithub", function(req, res) {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.github != "" && req.body.email != ""){
	// set github ID to github_temp and send mail
	collection.find({"email": req.body.email},
			function(e, docs){
			    //TryToFindUser(docs, req.body.email, collection, function(haveUser){
                //                if(!haveUser)
                if (docs.length == 0)
                                    return res.render(
                                        "confirmationLander",
                                        {message: "You don't seem to be in our database"});

				// Synchronous
				const cryptoRandomString = require('crypto-random-string');
				var random_hash = cryptoRandomString({length : 64, type : 'url-safe'});
				collection.update({"email": req.body.email},
						  {"$set": {"github_temp": req.body.github,
							        "github_hash": random_hash,
                                    "auth_time": new Date()}});
				// Send Mail
                SendConfirmationMail(req, random_hash, 'verify', function(success){
                                    if(success)
					return res.render("confirmationLander",
							  {message: "Check your email"});
                                    else
					return res.render("confirmationLander",
							  {message: "Failed to send email confirmation"});
				}); // End email callback
//			    }); // End user callback
			});	// End mongo callback
    }
    else
	return res.render("confirmationLander", 
			  {message: "You must provide a valid email and GitHub account ID"});
});


module.exports = router;

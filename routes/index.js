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
    res.render('index', { title: 'Express', user: req.user });
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

    collection.find({'detector': detector}, {'sort': {'_id': -1}, 'limit': parseInt(limit)},
		    function(e, docs){
			ret = { "rates": [], "buffs": []};
			for(i in docs){
			    var oid = new req.ObjectID(docs[i]['_id']);
			    var dt = Date.parse(oid.getTimestamp());
			    ret['rates'].unshift([dt, docs[i]['rate']]);
			    ret['buffs'].unshift([dt, docs[i]['buff']]);
			}
			return res.json(ret);
		    });
});

router.get('/get_current_shifters', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get("shifts");

    var today = new Date();
    collection.find(
	{"start": {"$lte": today},"end": {"$gte": today}},
	function(e, docs){
	    var users = [];
	    var qusers = [];
	    for(var i in docs){
		users.push({"shifter": docs[i]['shifter'], 
			    "shift_type": docs[i]['type']});
		qusers.push(docs[i]['shifter']);
	    }
	    var user_collection = db.get("users");
	    user_collection.find(
		{"daq_id": {"$in": qusers}},
		function(err, cursor){
		    for(var i in cursor){
			for(var j in users){
			    if(cursor[i]['daq_id'] === users[j]['shifter']){
				users[j]['shifter_name'] = cursor[i]['first_name'] + cursor[i]['last_name'];
				
				fields = [ ['shifter_email', 'email'], ['shifter_phone', 'cell'],
					   ['shifter_skype', 'skype'], ['shifter_github', 'github']];
				for(var k in fields){
				    try{
					users[j][fields[k][0]] = cursor[i][fields[k][1]];
				    }
				    catch(error){
					users[j][fields[k][0]] = 'Not set';
				    }
				}
			    }
			}
		    }
		    return res.json(users);
		});
	});
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
    
    var api_username = req.user.daq_id;
    	
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
    
        collection.update({"first_name": req.user.first_name,
		           "last_name": req.user.last_name},
		          {"$set": {"api_username": api_username,
				    "api_key": hash}});
        req.user.api_key = key;
        req.user.api_username = api_username;
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
                        {"$unset": {
                            "github_temp": 1,
                            "github_hash": 1,
                            "auth_time": 1
                        }});
                    return res.render("confirmationLander",
                        {message: "That code has expired"});
                }
			    collection.update({'_id': docs[0]['_id']},
					      {"$set": {"github": docs[0]['github_temp']},
					       "$unset": {"github_temp": 1, "github_hash": 1}});
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
                                              {"$set": {"lngs_ldap_uid": docs[0]['ldap_temp']},
                                               "$unset": {"ldap_temp": 1, "ldap_hash": 1}});
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

function TryToFindUser(cursor, email, collection, callback){

    // If we have the user in DB just return callback without hitting API
    if(cursor.length == 1){
	callback(true);
	return;
    }

    // Authenticate and set up google API
    let spreadsheetId = process.env.USER_SPREADSHEET_ID;
    let sheetName = 'Members'
    let sheets = google.sheets('v4');
    let jwtClient = new google.auth.JWT(
       privatekey.client_email,
       null,
       privatekey.private_key,
       ['https://www.googleapis.com/auth/spreadsheets']);
    //authenticate request
    jwtClient.authorize(function (err, tokens) {
	if (err) {
	    console.log(err);
	    callback(false);
	    return;
	} else {
	    console.log("Successfully connected!");
	}
    });

    sheets.spreadsheets.values.get({
	auth: jwtClient,
	spreadsheetId: spreadsheetId,
	range: sheetName
    }, function (err, response) {
	if (err) {
	    console.log('The API returned an error: ' + err);
	    callback(false);
	} else {
	    //console.log('Member list:');
	    var institute = '';
	    for (let row of response.data.values) {

		// We've reached the end of our new users
		if(row[0] == 'People that left the collaboration')
		    break;
		if(row[0] != '')
		    institute = row[0];
		var checkmail = row[3];
		if(row[3] == undefined)
		    continue;
		if(checkmail.toLowerCase() == email.toLowerCase()){
		    //console.log(row);
		    // New collaboration member! Put in DB
		    var pct_xe = row[5];
		    pct_xe = pct_xe.substring(0, pct_xe.length - 1);
		    
		    var doc = {
			"last_name": row[1],
			"first_name": row[2],
			"institute": institute,
			"email": email.toLowerCase(),
			"start_date": ConvertToDate(row[6]),
			"percent_xenon": parseInt(pct_xe),
			"position": row[4]
		    };
		    //console.log(doc);
		    collection.insert(doc);

		    callback(true);
		    return;
		}
	    }

	    // Can't find our person
	    callback(false);
	}
	
    });
}

router.post("/linkLDAP", (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.lngs_id != "" && req.body.email != ""){
	collection.find({"email": req.body.email},
			function(e, docs){
			    TryToFindUser(docs, req.body.email, collection, function(haveUser){
				if(!haveUser)
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
			}); // end try to find user callback
			}); // end mongo query callback
    }
    else
        return res.render("confirmationLander", 
			  {message: "You must provide a valid email and LDAP ID"});
});

router.post("/linkGithub", (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.github != "" && req.body.email != ""){
	// set github ID to github_temp and send mail
	collection.find({"email": req.body.email},
			function(e, docs){
			    TryToFindUser(docs, req.body.email, collection, function(haveUser){
                                if(!haveUser)
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
			    }); // End user callback
			});	// End mongo callback
    }
    else
	return res.render("confirmationLander", 
			  {message: "You must provide a valid email and GitHub account ID"});
});


module.exports = router;

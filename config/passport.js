
var passport = require('passport');
var monk = require('monk');
var runs_cstr = process.env.USERS_URI;
var runs_db = monk(runs_cstr, {authSource: process.env.USERS_MONGO_AUTH_DB});
//console.log("Runs db in user auth ");

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


function isEmpty(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

async function PopulateProfile(mongo_doc, github_profile, ldap_profile, callback){

    var ret_profile = {};

    // This step important. We need a unique identifier for each user. The user
    // doesn't actually need to see this but it's important for some internal 
    // things.     
    console.log("Populating profile for " + mongo_doc.last_name);

    var extra_fields = ['skype', 'cell',
                        'favorite_color', 'email', 'lngs_ldap_uid',
                        'last_name', 'first_name', 'institute', 'position',
                        'percent_xenon', 'start_date', 'github',
                        'picture_url', 'github_home', 'groups'];
    for(var i in extra_fields){
        if(typeof mongo_doc[extra_fields[i]]==='undefined')
            ret_profile[extra_fields[i]] = "not set";
        else
            ret_profile[extra_fields[i]] = mongo_doc[extra_fields[i]];
    }
    if(!(isEmpty(github_profile))){
	ret_profile['github_info'] = github_profile;
        // This field has a bunch of funny characters that serialize poorly
        ret_profile['github_info']['_raw'] = '';
        ret_profile['picture_url'] = github_profile._json.avatar_url;
        ret_profile['github_home'] = github_profile._json.html_url;

    }
    if(!(isEmpty(ldap_profile)))
	ret_profile['ldap_info'] = ldap_profile;
    // display API key set or not
    if(typeof mongo_doc['api_key'] !== 'undefined')
        ret_profile['api_key'] = "SET";

    callback(ret_profile);
}

// GithubStrategy
var GitHubStrategy = require('passport-github2').Strategy;
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_OATH_CLIENT_ID,
    clientSecret: process.env.GITHUB_OATH_CLIENT_SECRET,
    callbackURL: "https://xenonnt.lngs.infn.it/auth/github/callback",
    scope: ['user:email', 'user:name', 'user:login', 'user:id', 'user:avatar_url'],
},
    function(accessToken, refreshToken, profile, done) {

        // asynchronous verification 
        process.nextTick(function () {
            var collection = runs_db.get("users");
            collection.find({"github": profile._json.login},
                function(e, docs){
                    console.log('Github authorization for ' + profile._json.login);

                    if(docs.length===0){
                        console.log("Couldn't find user in run DB, un "+profile._json.login);
                        return done(null, false, "Couldn't find user in DB");
                    }
                    var doc = docs[0];
                    PopulateProfile(doc, profile, {}, function(ret_profile){
                        // Save a couple things from the github profile
                        collection.update({"github": profile._json.login},
                            {"$set": { "picture_url": profile._json.avatar_url,
                                "github_home": profile.html_url}
                            });

                        return done(null, ret_profile);
                    });
                });
        });
    }));


var LdapStrategy = require('passport-ldapauth').Strategy;
var OPTS = {
  server: {
    url: process.env.LDAP_URI,
    bindDn: process.env.LDAP_BIND_DN,
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS,
    searchBase: 'ou=xenon,ou=accounts,dc=lngs,dc=infn,dc=it',
      searchFilter: '(uid={{username}})' //'(uid=%(user)s)'
  },
    usernameField: 'user',
    passwordField: 'password'
};
passport.use(new LdapStrategy(OPTS,
    function(user, done) {

        console.log('LDAP authorization for ' + user.uid);
        // Need to verify uid matches
        var collection = runs_db.get("users");
        collection.find({"lngs_ldap_uid": user.uid},
            function(e, docs){
                if(docs.length===0){
                    console.log("No user " + user.uid + " in DB");
                    return done(null, false, "Couldn't find user in DB");
                }
                var doc = docs[0];
                var ret_profile = PopulateProfile(doc, {}, user, function(ret_profile){
                    // Save a couple things from the github profile 
                    collection.update({"lngs_ldap_uid": user.uid},
                        {"$set": { 
                            "lngs_ldap_email": user.mail,
                            "lngs_ldap_cn": user.cn
                        }
                        });
                    return done(null, ret_profile);
                });
            }); // end mongo query
    }));


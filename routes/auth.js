var express = require("express");
var url = require("url");
var passport = require("passport");
var router = express.Router(); 
var gp='';

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
router.get('/github',
	passport.authenticate('github', { scope: [ 'user:email' ] }),
	   function(req, res){	       
	    // The request will be redirected to GitHub for authentication, so this
	    // function will not be called.
	});

router.post('/ldap',
	    passport.authenticate('ldapauth', {
		successRedirect: gp+'/',
		failureRedirect: gp+'/login'}), 
	    function(req, res){
              console.log('Does this work?');
		res.redirect(gp);
	    });

router.post('/password', 
  passport.authenticate('local', { failureRedirect: gp+'/login' }),
  function(req, res) {
    res.redirect(gp);
 });
// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/github/callback',
	passport.authenticate('github', { failureRedirect: gp+'/login' }),
	   function(req, res) {	   
	       res.redirect('/');
	   });

module.exports = router;

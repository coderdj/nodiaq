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
    console.log(detector);
    collection.find({"detector": detector},
		    {"sort": {"name": 1}},
		    function(e, docs){
			var ret = [];
			for(var i=0; i<docs.length; i++){
			    var rs = docs[i]["name"];
			    var rd = "";
			    if(typeof docs[i]['description'] != 'undefined')
				rd = docs[i]['description'];
			    ret.push([rs, rd]);
			}
			return res.send(JSON.stringify(ret));
		    });
});

router.get("/get_control_docs", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("detector_control");
    
    // Fetch n entries that have not been processed
    collection.find({},
		    function(e, docs){
			    return res.send(JSON.stringify(docs));
	});

});

router.post('/set_control_docs', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("detector_control");

    var data = req.body.data;
    var j = 0;
    for(var i=0; i<data.length; i+=1){
    	data[i]['user'] = req.user.last_name;
    	collection.update({"detector": data[i]['detector']}, data[i],  {upsert:true},
    	function(){
    	  if(++j===data.length)
    	    return res.sendStatus(200);
    	});
    }
});



module.exports = router;

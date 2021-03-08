var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('options', { title: 'Options', user:req.user });
});

router.get("/options_list", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('options');
    collection.aggregate([
        {$unwind: '$detector'},
        {$project: {name: 1, detector: 1}},
        {$sort: {name: 1}},
        {$group: {_id: '$detector', modes: {$push: '$name'}}},
        {$sort: {_id: -1}} // puts 'include' at the bottom
    ]).then(docs => res.json(docs))
    .catch(err => {console.log(err.message); return res.json([]);});
 /*   collection.find({}, {"sort": {"name": 1}},
		    function(e, docs){
			retlist = {};
			for(var i in docs){
				if(typeof retlist[docs[i]['detector']] === 'undefined'){
					retlist[docs[i]['detector']] = [];
				}
                if (typeof docs[i]['detector'] === 'object') { // ['tpc', 'muon_veto']
                    for (var j in docs[i]['detector'])
                        retlist[docs[i]['detector'][j]].push(docs[i]['name']);
                } else {
			        retlist[docs[i]['detector']].push(docs[i]['name']);
                }
		    }

			return res.json(retlist);
		    }); */
});

router.get("/options_json", ensureAuthenticated, function(req, res){
    var query = url.parse(req.url, true).query;
    var name = query.name;
    if(typeof name == "undefined")
	return res.json({"ERROR": "No name provided"});

    var db = req.db;
    var collection = db.get('options');
    collection.findOne({"name": name}, {},
		       function(e, doc){
			   try{
			       return res.json(doc);
			   }
			   catch(error){
			       return res.send(JSON.stringify({"ERROR":
							       "couldn't find that doc"}));
			   }
		       });
});

router.post("/set_run_mode", ensureAuthenticated, function(req, res){
    doc = JSON.parse(req.body.doc);
    delete doc._id;
    doc['last_modified'] = new Date();
    var db = req.db;

    // Check permissions
    if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
	return res.json({"res": "I can't allow you to do that Dave"});
    
    var collection = db.get('options');
	if(typeof doc['name'] === 'undefined')
		return res.render("options", {title: "Options", user:req.user});
    collection.remove({name: doc['name']}, {}).then( () => collection.insert(doc, {}))
    .then( () => res.render("options", {title: "Options", user:req.user}))
    .catch((err) => res.json({"res": err.message}));
});

router.get("/remove_run_mode", ensureAuthenticated, function(req, res){
    var query = url.parse(req.url, true).query;
    var name = query.name;
    var db = req.db;
    var collection = db.get('options');

    // Check permissions
    if(typeof(req.user.groups) == "undefined" || !req.user.groups.includes("daq"))
	return res.json({"res": "I can't allow you to do that Dave"});
    
    collection.remove({'name': name}, {},
		      function(e){
			  return res.render("options", {"title": "Options", user:req.user});
		      });
});


module.exports = router;

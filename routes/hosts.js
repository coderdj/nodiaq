var express = require("express");
var url = require("url");
var router = express.Router();
var gp='';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('hosts', { title: 'Hosts', user: req.user });
});

router.get("/get_host_status", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('system_monitor');
    
    var q = url.parse(req.url, true).query;
    var host = q.host;

  collection.find({"host": host},
    {"sort": {"_id": -1}, "limit": 1},
    function(e, sdoc){
      if(sdoc.length == 0)
        return res.json({});
      sdoc[0]['checkin'] = new Date() - sdoc[0]['time'];
      return res.json(sdoc[0]);
    });
});

router.get("/get_host_history", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("system_monitor");

    var q = url.parse(req.url, true).query;
    var host = q.host;
    var limit = parseInt(q.limit);
    if(typeof(limit)=="undefined")
	limit = 1;
    collection.find({"host": host},
		    {"sort": {"_id": -1}, "limit": limit},
		    function(e, sdoc){
			if(typeof(sdoc)=="undefined")
			    console.log(e);
			if(sdoc.length==0)
			    return res.json({});

			// Mem %, CPU %, Disk % on each disk
			r = {"mem": [], "cpu": [], "swap": []};
			names = {"mem": "Memory%", "cpu": "CPU%", "swap": "Swap%"};
			for(i in sdoc){
			    var oid = new req.ObjectID(sdoc[i]['_id']);
			    var dt = Date.parse(oid.getTimestamp());
			    r["cpu"].unshift([dt, sdoc[i]['cpu_percent']]);
			    r["mem"].unshift([dt, sdoc[i]['virtual_memory']['percent']]);
			    r["swap"].unshift([dt, sdoc[i]['swap_memory']['percent']]);
			    for(j in sdoc[i]['disk']){
				if(!(j in r)){
				    r[j] = [];
				    names[j] = "Disk%("+j+")";
				}
				r[j].unshift([dt, sdoc[i]['disk'][j]['percent']]);
			    }
			}
			ret = [];
			for(i in r)
			    ret.push({"type": "area", "name": names[i], "data": r[i]})

			return res.json(ret);
		    });
});

module.exports = router;

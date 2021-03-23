// routes/equipment.js
var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
  res.render('equipment', req.template_info_base);
});

router.get('/getEquipment', ensureAuthenticated, function(req, res){
  var db = req.db;
  var collection = db.get('equipment');

  // We never really have so much equipment (i.e. never more
  // than O(10e3) pieces) so there's no reason to not just
  // do a collection scan.
  collection.find({},  {"sort":{"type": -1}},
    function(e,docs){
      var ret = [];
      for(var i in docs){
        var appdoc = docs[i];
        if(typeof appdoc['location'] == 'undefined'){
          appdoc['location'] = 'unknown';
          if(appdoc['actions'].length > 0)
            appdoc['location'] = appdoc['actions'][appdoc['actions'].length-1]['location'];
        }
        ret.push(appdoc);

      }
      return res.json(ret);
    });
});


router.post('/record_update', ensureAuthenticated, (req, res) => {
  // Types: Record creation, item action,
  // record update, flag remove

  var db = req.db;
  var collection = db.get("equipment");
  if(typeof req.body.priority == 'undefined')
    return res.json({"result": "no priority"});

  // Case, item action
  if(req.body.priority == 'add_item'){
    if(typeof req.body.data == 'undefined')
      return res.json({"result": "no item to add"});
    var newItemData = req.body.data;
    var req_fields = ['manufacturer', 'model', 'type', 'serial', 'status', 'purchaser'];
    for(var i in req_fields){
      if(typeof newItemData[req_fields[i]] === 'undefined')
        return res.json({"result": "missing field " +
          req_fields[i]});
    }
    var extra_fields = ['location', 'comment'];
    for(var i in extra_fields){
      if(typeof newItemData[req_fields[i]] === 'undefined')
        newItemData[i]='NA';
    }
    newItemData['entry_date'] = new Date();

    var idocs = [];
    var sstring = newItemData['serial'].split(',');
    for(var i in sstring){
      // A bit verbose because copying objects weird in JS
      var ndoc = {};
      for(var key in newItemData)
        ndoc[key] = newItemData[key];
      ndoc['serial'] = sstring[i];

      ndoc['actions'] = [];
      ndoc['actions'].push({
        comment: "Database record created",
        date: new Date(),
        type: "Record creation",
        user: req.user.daq_id
      });

      idocs.push(ndoc);
    }
    collection.insert(idocs, function(err, result){
      if(err==null)
        return res.json({"result": 'success'});
      else
        return res.status(400).json({"result": err});
    });
  }
  else if(req.body.priority == 'update_field'){
    if(typeof req.body.field != "undefined" &&
      typeof req.body.id != 'undefined' &&
      typeof req.body.value != "undefined"){
      console.log("HERE");
      collection.find({"_id": req.body.id}, function(e,docs){
        if(docs.length != 1)
          return res.status(400).json({"result": "database error"});
        var doc = docs[0];
        var oldvalue = "[NOT SET]";
        if(typeof doc[req.body.field] !== "undefined")
          oldvalue = doc[req.body.field];
        var actiondoc = {
          type: "record update",
          user: req.user.daq_id,
          date: new Date(),
          comment: ("Update field '" + req.body.field + "' from '" +
            oldvalue + "' to '" + req.body.value + "'")
        };

        var updatedoc = {"$set": {}, "$push": {"actions": actiondoc}};
        updatedoc["$set"][req.body.field] = req.body.value; // lol JS
        console.log(updatedoc);
        collection.update({"_id": req.body.id}, updatedoc,
          function(err, doc){
            if(err == null)
              return res.json({"result": "success"});
            else
              return res.status(400).json({"result": "database error"});
          });
      });
    }
    else
      return res.status(400).json({"result": "missing required fields in request"});
  }
  else
    return res.status(400).send("Didn't include priority");

});

module.exports = router;

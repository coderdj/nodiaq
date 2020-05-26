var mongoose = require('mongoose');
var DataTable = require('mongoose-datatable').default;
var runsModel1T;
var dbURI = process.env.RUNS_URI_1T;
var runsdb = mongoose.connection;
var runs_1t;
var runsTableSchema;
var xenon1tRunsSchema;
var xenon1t_runs_collection = 'runs_new';

DataTable.configure({ verbose: true, debug : true });
mongoose.plugin(DataTable.init);
mongoose.connect(dbURI, {authSource : process.env.RUNS_MONGO_AUTH_DB});


runsdb.on('error', console.error.bind(console, 'connection error:'));
runsdb.once('open', function callback ()
	{
	    xenon1tRunsSchema = new Schema(
		{
		    number: {type: Number, required: true},
		    detector: String,
		    start: Date,
		    end: Date,
		    user: String,
		    mode: String,
		    source: { type: {type: String} },
		    tags: [ {user: String, date: Date, name: String} ],
                    comments: [{user: String, date: Date, text: String}],
                },
		{ collection: xenon1t_runs_collection });
	    runs_1t = mongoose.model('runs_new', xenon1tRunsSchema);
	    runsModel1T = require('mongoose').model(xenon1t_runs_collection);

	});

exports.getDataForDataTable = function getData (request, response) {

    var conditions = {};
    if(typeof request.query['conditions'] !== 'undefined')
	conditions = JSON.parse(request.query['conditions']);
    // Date filtering
    if(request.query['date_min'] !== undefined){
	if(request.query['date_min'] !== '' && 
	   request.query['date_max'] == '' && 
	   !('start' in Object.keys(conditions)))
	    conditions['start'] = {"$gt": new Date(request.query['date_min'])};
	else if(request.query['date_min'] !== '' &&
		request.query['date_max'] !== '' &&
		!('start' in Object.keys(conditions)))
	    conditions['start'] = {"$gt": new Date(request.query['date_min']),
				   "$lt": new Date(request.query['date_max'])};
	else if(request.query['date_min'] == '' &&
		request.query['date_max'] !== '' &&
		!('start' in Object.keys(conditions)))
	    conditions['start'] = {"$lt": new Date(request.query['date_max'])};
    }
	var i = -1;
	var query = request.query;
	for(var j=0; j<query.columns.length; j+=1)
	    if(query.columns[j].data =='bootstrax')
		i=j;
	if(i != -1)
	    query.columns.splice(i, 1);
	runsModel1T.dataTable(query,  {"conditions": conditions}).then(
                            function (data) {
                                response.send(data);
                            }).catch(function(err){
				console.log("We had an error!");
				console.log(err);
			    });
    
};

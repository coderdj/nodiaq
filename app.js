var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var mongo = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var monk = require('monk');
mongo_pw = process.env.MONGO_PASSWORD
var db = monk('web:'+mongo_pw+'@localhost:27017/dax', {authSource: 'dax'});
var runs_db = monk('web:'+mongo_pw+'@localhost:27017/run', {authSource: 'dax'});

var bodyParser = require("body-parser");

// For Runs DB Datatable
var runs_mongo = require("./runs_mongo");


// Define detectors
var detectors = {
    "det_0": ["fdaq00_reader_0",
	    "fdaq00_reader_1"]
};

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var optionsRouter = require('./routes/options');
var playlistRouter = require('./routes/playlist');
var hostsRouter = require('./routes/hosts');
var runsRouter = require('./routes/runsui');
var logRouter = require('./routes/logui');
var helpRouter = require('./routes/help');
var statusRouter = require('./routes/status');

var app = express();

// For parsing POST data from request body
app.use(bodyParser.urlencoded({extended: true}));                                                    

// Aliases for paths to node_modules
app.use('/bs', express.static(__dirname + '/node_modules/bootstrap3/dist/'));
app.use('/jq', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/je', express.static(__dirname + '/node_modules/jsoneditor/dist/'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    req.runs_db = runs_db;
    req.ObjectID = ObjectID;
    req.detectors = detectors;
    next();
});

app.get('/runtable/getDatatable', runs_mongo.getDataForDataTable) //Here's the line that we're looking at specifically

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/options', optionsRouter);
app.use('/hosts', hostsRouter);
app.use('/playlist', playlistRouter);
app.use('/runsui', runsRouter);
app.use('/logui', logRouter);
app.use('/help', helpRouter);
app.use('/status', statusRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

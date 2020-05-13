var prefix = '';

$("#pie_button :input").change(function() {
console.log(this.val());
});

function PopulateShifters(shift_div){
    var shifter_template = '<div class="row" style="margin-top:10px;"><div style="background-color:#e5e5e5;color:#555;margin-left:5px;margin-right:5px;width:100%;"><strong style="padding-left:10px">{{shift_type}}</strong></div><div class="col-12">{{shifter_name}}</div><div class="col-12"><i class="fa fa-envelope"></i>&nbsp;{{shifter_email}}</div><div class="col-12"><i class="fa fa-phone"></i>&nbsp;{{shifter_phone}}</div><div class="col-12"><i class="fab fa-skype"></i>&nbsp;{{shifter_skype}}</div><div class="col-12"><i class="fab fa-github"></i>&nbsp;{{shifter_github}}</div></div>';
    
    $.getJSON(prefix+"/shifts/get_current_shifters", function(data){
	
	console.log(data);
	var html ="";
	for(var i in data){
	    blank_shifts = {"shifter_name": "Nobody",
                            "shifter_email": "d.trump@whitehouse.gov",
                            "shifter_phone": "",
                            "shifter_skype": "",
                            "shifter_github": "mklinton",
                            "shift_type": "Expert shifter"
                           };
	    if(data[i]['shifter'] !=='none') 
		html += Mustache.render(shifter_template, data[i]);
	    else
		html+=Mustache.render(shifter_template, blank_shifts);
	}
        if(html != "")
	    document.getElementById(shift_div).innerHTML = html;
    });
}

function DrawPie(pie_div, ndays){

    $.getJSON(prefix+"/runsui/runsfractions?days="+ndays, function(data){

	if(typeof(document.piechart) != 'undefined')
            document.piechart.destroy;
	var series = [];
        var active=0;
	for(var i in data) {
	    series.push({"name": data[i]['_id'], "y": data[i]['runtime']});
            active += data[i]['runtime'];
        }
        series.push({"name" : "idle", "y" : 1.0-active});
	document.piechart = Highcharts.chart(pie_div, {
	    chart: {
		plotBackgroundColor: null,
		plotBorderWidth: null,
		plotShadow: false,
		type: 'pie'
	    },
	    credits: {enabled: false},
	    title: {text: null},
	    tooltip: {
		pointFormat: '{series.name}: <b>{point.percentage:.2f}%</b>'
	    },
	    plotOptions: {
		pie: {
		    allowPointSelect: true,
		    cursor: 'pointer',
		    dataLabels: {
			enabled: true,
			format: '<b>{point.name}</b>: {point.percentage:.2f} %',
			style: {
			    color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
			}
		    }
		}
	    },
	    series: [{
		name: 'Modes',
		colorByPoint: true,
		data: series,
	    }]
	});
    });
}







// Everything under this point is likely deprecated



function GetStatus(i){
    var STATUSES = [
        "<span style='color:blue'><strong>Idle</strong></span>",
        "<span style='color:cyan'><strong>Arming</strong></span>",
        "<span style='color:cyan'><strong>Armed</strong></span>",
        "<span style='color:green'><strong>Running</strong></span>",
	"<span style='color:red'><strong>Error</strong></span>",
        "<span style='color:red'><strong>Timeout</strong></span>",
        "<span style='color:yellow'><strong>Undecided</strong></span>"
    ];
    return STATUSES[i];
}

function GetOptionsFiles(callback){
    var tpc_boards = "xenon1t_board_definitions";
    var tpc_cc = "xenon1t_cc_definition";
    var tpc_cable_map = "xenon1t_cable_map";
    var n_maps = 3;

    document.cabling_json_data = {};

    $.getJSON(prefix+"options/options_json?name="+tpc_boards, function(data){
	document.cabling_json_data['tpc_boards'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
	    ParseOptions(callback);	
    });
    $.getJSON(prefix+"options/options_json?name="+tpc_cc,function(data){
	document.cabling_json_data['tpc_cc'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
            ParseOptions(callback);
    });
    $.getJSON(prefix+"options/options_json?name="+tpc_cable_map,function(data){
	document.cabling_json_data['tpc_cable_map'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
            ParseOptions(callback);
    });
}

function ParseOptions(callback){
    // Puts option files into node list format and returns
    var tpc_boards = document.cabling_json_data['tpc_boards']['boards'];
    var tpc_readers = {};
    var node_list = [];
    var key = 0;
    
    // Add TPC parent
    document.detector_keys = {"tpc": 0};
    var dispatcher_parent = 0;
    node_list.push({
	"key": key,
	"name": "TPC",
	"type": 'detector',
	//'rate': '0',
	//'mode': 'none',
	'status': 0,
	//'number': 0
    });
    key += 1;
    
    // First pass through board list to get readers
    for(var i in tpc_boards){	
	var k = Object.keys(tpc_readers);
	var in_list = false;
	for(var j in k){
	    if(k[j] == tpc_boards[i]['host']){
		in_list = true;
		break;
	    }
	}
	if(in_list)
	    continue;
	var type = "reader";
	if(tpc_boards[i]['type'] != 'V1724')
	    type = 'crate_controller';
	node_list.push({
	    "key": key,
	    "parent": dispatcher_parent,
	    "name": tpc_boards[i]['host'],
	    "type": type,
	    //"rate": "0",
	    "check-in": "-1",
	    "status": "none",
	    "buffer": "0"
	});
	tpc_readers[tpc_boards[i]['host']] = key;
	key+=1;
    }
    document.reader_keys = tpc_readers;
    
    // Second pass through board list to get digitizers
    var boards = {};
    for(var i in tpc_boards){
	node_list.push({
	    "key": key,
	    "parent": tpc_readers[tpc_boards[i]['host']],
	    "name": tpc_boards[i]['board'].toString(),
	    "type": tpc_boards[i]['type'],
	    //"rate": 0,
	});
	boards[tpc_boards[i]['board'].toString()] = key;
	key += 1;
    }
    document.board_key_list = boards;

    //Now render tree
    document.tree_node_list = node_list;
    callback();
}

function DrawTree(){
    var $ = go.GraphObject.make;  // for conciseness in defining templates
    myDiagram =
        $(go.Diagram, "graph_canvas",  // must be the ID or reference to div
          {
            "toolManager.hoverDelay": 100,  // 100 milliseconds instead of the default 850
              allowCopy: false,
              layout:  // create a TreeLayout for the family tree
              $(go.TreeLayout,
                { //angle: 90, //nodeSpacing: 20, 
		  //layerSpacing: 40, 
		  //layerStyle: go.TreeLayout.LayerUniform,
		  alignment: go.TreeLayout.AlignmentBusBranching,
		})
          });

    // On click we want to plot the rate history of our object
    myDiagram.addDiagramListener(
	"ObjectSingleClicked",
	function(e){
	    var dat = document.goDiagram.model.findNodeDataForKey(e.subject.part.data.key);
	    PlotThingOnDiv(dat);	    
	});
    var bluegrad = '#151675';
    var pinkgrad = '#f64870';
    var greengrad = '#00d5a0';
    
      // Set up a Part as a legend, and place it directly on the diagram
    /*myDiagram.add(
        $(go.Part, "Table",
          { position: new go.Point(50, -100), selectable: false },
          $(go.TextBlock, "Key",
            { row: 0, font: "700 14px Droid Serif, sans-serif" }),  // end row 0
          $(go.Panel, "Horizontal",
            { row: 1, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: bluegrad, margin: 5 }),
            $(go.TextBlock, "Readers",
              { font: "700 13px Droid Serif, sans-serif" })
          ),  // end row 1
          $(go.Panel, "Horizontal",
            { row: 2, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: pinkgrad, margin: 5 }),
            $(go.TextBlock, "Digitizers",
              { font: "700 13px Droid Serif, sans-serif" })
          ),  // end row 2
	  $(go.Panel, "Horizontal",
            { row: 3, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: greengrad, margin: 5 }),
            $(go.TextBlock, "Crate Controller",
              { font: "700 13px Droid Serif, sans-serif" })
          )  // end row 3 
         ));
    */

    // get tooltip text from the object's data
      function tooltipTextConverter(obj) {
        var str = "";
        str += "Type: " + obj.type;          
        return str;
      }

    // define tooltips for nodes
      var tooltiptemplate =
        $("ToolTip",
          { "Border.fill": "whitesmoke", "Border.stroke": "black" },
          $(go.TextBlock,
            {
              font: "bold 8pt Helvetica, bold Arial, sans-serif",
              wrap: go.TextBlock.WrapFit,
              margin: 5
            },
            new go.Binding("text", "", tooltipTextConverter))
        );

    // define Converters to be used for Bindings
      function typeBrushConverter(node) {
          if (node['type'] === "reader" || node['type'] === "crate_controller" || 
	      node['type'] === 'detector') {
	      if(node['status'] === 0)
		  return '#aaaaaa';
	      if(node['status'] === 1 || node['status'] === 2)
		  return 'orange';
	      if(node['status'] === 3)
		  return greengrad;
	      return 'red';
	  }
          if (node['type'] === "V1724") return bluegrad;
	  if (node['type'] === "V2718") return '#888888';
          return "orange";
      }
    function rateConverter(node){
	if(node['type'] === 'reader' || node['type'] === 'V1724' ||
	  node['type'] === 'detector') return node['rate'];
	return null;//'';
    }
    // replace the default Node template in the nodeTemplateMap
      myDiagram.nodeTemplate =
        $(go.Node, "Auto",
          { deletable: false, toolTip: tooltiptemplate },
          new go.Binding("text", "name"),
          $(go.Shape, "Rectangle",
            {
              fill: "lightgray",
              stroke: null, strokeWidth: 0,
              stretch: go.GraphObject.Fill,
              alignment: go.Spot.Center
            },
            new go.Binding("fill", "", typeBrushConverter)),
	  $(go.Panel, "Table",
            $(go.TextBlock,
              {
		  font: "700 12px Droid Serif, sans-serif",
		  textAlign: "center",
		  stroke: 'white',
		  margin: 5, maxSize: new go.Size(160, NaN),
		  row: 0, column: 0
              },
              new go.Binding("text", "name")),
	    $(go.TextBlock,
              {
		  font: "700 12px Droid Serif, sans-serif",
		  textAlign: "left",
		  stroke: 'white',
		  margin: 5, 
		  maxSize: new go.Size(160, NaN),
		  row: 1, column: 0,
		  visible: false,
              },
              new go.Binding("text", "", rateConverter),
	      new go.Binding("visible", "", function(data){
		  if(typeof(data['rate'])!='undefined') return true; return false;}),	
	    ),
	    $(go.TextBlock,
              {
                  font: "700 12px Droid Serif, sans-serif",
                  textAlign: "left",
                  stroke: 'white',
                  margin: 5,
                  maxSize: new go.Size(160, NaN),
                  row: 2, column: 0,
                  visible: false,
              },
              new go.Binding("text", "mode"),
              new go.Binding("visible", "", function(data){
                  if(typeof(data['mode'])!='undefined') return true; return false;}),
            ),
	    $(go.TextBlock,
              {
                  font: "700 12px Droid Serif, sans-serif",
                  textAlign: "left",
                  stroke: 'white',
                  margin: 5,
                  maxSize: new go.Size(160, NaN),
                  row: 3, column: 0,
                  visible: false,
              },
              new go.Binding("text", "number", function(number){ return "Run "+number.toString();}),
              new go.Binding("visible", "", function(data){
                  if(typeof(data['number'])==typeof(int) && data['number'] >= 0) return true; return false;}),
            
	   )),

        );

      // define the Link template
      myDiagram.linkTemplate =
        $(go.Link,  // the whole link panel
          { routing: go.Link.Orthogonal, corner: 5, selectable: false },
          $(go.Shape, { strokeWidth: 3, stroke: '#424242' }));  // the gray link shape
    // create the model for the family tree
    myDiagram.model = new go.TreeModel(document.tree_node_list);

    //document.getElementById('zoom_to_fit').addEventListener('click', function() {
//	myDiagram.zoomToFit();
  //  });

    document.goDiagram = myDiagram;
    //document.getElementById('centerRoot').addEventListener('click', function() {
    //myDiagram.scale = 1;
    //myDiagram.scrollToRect(myDiagram.findNodeForKey(0).actualBounds);
    //});
}

function UpdateFromReaders(){
    var readers = ["reader0_reader_0", 'reader2_reader_2',
                   'reader3_reader_3', 'reader4_reader_4', 'reader6_reader_6',
                   'reader7_reader_7'];
    var controllers = ['reader0_controller_0'];
    if(typeof(document.goDiagram)!='undefined'){
	for(i in readers){
            var reader = readers[i];
            $.getJSON(prefix+"status/get_reader_status?reader="+reader, function(data){
		var rd = data['host'];
		
		// Get key for this node
		var key = document.reader_keys[rd];
		var dat = document.goDiagram.model.findNodeDataForKey(key);
		document.goDiagram.model.setDataProperty(dat, "rate", data['rate'].toFixed(2) + " MB/s");
		document.goDiagram.model.setDataProperty(dat, "status", (data['status']));
		document.goDiagram.model.setDataProperty(dat, "buffer", data['buffer_length'].toFixed(2) + " MB/s");
		Object.keys(data['boards']).forEach(function(digi) {
		    var key = document.board_key_list[digi.toString()];
		    var dat = document.goDiagram.model.findNodeDataForKey(key);
		    document.goDiagram.model.setDataProperty(dat, "rate", 
							     data['boards'][digi].toFixed(2) + " MB/s");
		});
            });
	}
	for(i in controllers){
            var controller = controllers[i];
	    $.getJSON(prefix+"status/get_controller_status?controller="+controller, function(data){
		var rd = data['host'];
		
		// Get key for this node
		var key = document.reader_keys[rd];
            var dat = document.goDiagram.model.findNodeDataForKey(key);
		//document.goDiagram.model.setDataProperty(dat, "rate", data['rate'].toFixed(2) + " MB/s");
		document.goDiagram.model.setDataProperty(dat, "status", (data['status']));
		//document.goDiagram.model.setDataProperty(dat, "buffer", data['buffer_length'].toFixed(2) + " MB/s");
	    });
	}
	document.goDiagram.zoomToFit();
    }

    UpdateDetectors(function(){setTimeout(UpdateFromReaders, 5000)});
}

function UpdateDetectors(callback){
    $.getJSON(gp+"/status/get_broker_status", function(data){
	if(typeof(document.goDiagram) != 'undefined'){
	    for(var i in data){
		var doc = data[i];
		var det = doc['detector'];
		console.log(doc);
		
		var key = document.detector_keys[det];
		if(typeof(key) === 'undefined')
		    continue;
		var dat = document.goDiagram.model.findNodeDataForKey(key);
		console.log(dat);
		document.goDiagram.model.setDataProperty(dat, "rate",
							 doc['rate'].toFixed(2) + " MB/s");
		document.goDiagram.model.setDataProperty(dat, 'status', doc['status']);
		document.goDiagram.model.setDataProperty(dat, 'mode',doc['mode']);
		document.goDiagram.model.setDataProperty(dat, 'number',doc['number']);	    
		
	    }
	}
	callback();
    });
}

function PlotThingOnDiv(node){
    var type = node['type'];
    var name = node['name'];
    var dets = {"TPC": 'tpc', "Muon Veto": 'muon_veto', "Neutron Veto": "neutron_veto"};
    if(type === 'detector'){
	$.getJSON(gp+"/detector_history?limit=1000&detector="+dets[name], (function(name){
            return function(data){
		console.log(data);
		DrawHistoryPlot(name, 'detector', data['rates']);
	    }
	}(name)));
    }
    else if(type === 'reader'){
	var reader = node['name'];
	var limit = (new Date()).getTime() - parseInt(3600*24)*1000;
	$.getJSON(gp+"/status/get_reader_history_dumb?limit=3600&res=60&reader="+reader,
		  (function(name, type, reader){
		      return function(data){
			  console.log(data);
			  DrawHistoryPlot(name, type, data['rates']);
		      }
		  }(name, type, reader)));    
    }
    else if(type === "V1724"){
	var parent_dat = document.goDiagram.model.findNodeDataForKey(node['parent']);
        reader = parent_dat['name'];
	var limit = (new Date()).getTime() - parseInt(3600*24)*1000;
	$.getJSON(gp+"/status/get_digitizer_history?limit="+3600+"&res=60&reader="+reader+"&digitizer="+name.toString(),
                  (function(name, type, reader){
                      return function(data){
                          console.log(data);
                          DrawHistoryPlot(name, type, data['rates']);
                      }
                  }(name, type, reader)));
    }
}

function DrawHistoryPlot(name, type, data){
    var series = [
        {"type": "area", "name": "transfer rate", "data": data, "color": "#151675"},
    ];
    console.log("SERIES");
    console.log(series);
    var div = "plot_div";
    document.chart = Highcharts.chart(
        div, {
            chart: {
                zoomType: 'x',
                //marginLeft: 100,
                //marginTop: 50,
                //marginBottom: 50,
                //marginRight:10
            },
            plotOptions: {
                series: {
                    fillOpacity: 0.3,
                    lineWidth: 1
                }
            },
	    credits: {
                enabled: false,
            },
            title: {
                text: 'Transfer rate for '+type+' '+name,
            },
            xAxis: {
                type: 'datetime',
		title: {text: "Time"}
            },
            yAxis: {
                title: {
		    text: "MB/s",
                },
                min: 0,
	    },
            legend: {
                enabled: false,
            },
            series: series
        });
};



var gp='/xenonnt';
function UpdateOverviewPage(){

    var statuses = [
	"<strong style='color:blue'>Idle</strong>",
	"<strong style='color:cyan'>Arming</strong>",
        "<strong style='color:cyan'>Armed</strong>",
        "<strong style='color:green'>Running</strong>",
        "<strong style='color:red'>Error</strong>",
	"<strong style='color:black'>(unknown)</strong>"
    ];
    
    var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
    var hrdetectors = {"tpc": "TPC  ", "muon_veto": "Muon Veto  ", "neutron_veto": "Neutron Veto  "};

   /* for(var i=0; i<detectors.length; i+=1){
	var detector = detectors[i];
	document.getElementById("det_name_"+detector).innerHTML = hrdetectors[i];
	$.getJSON("/status/get_detector_status?detector="+detector, (function(det){
	    return function(data){
		// Set status
		var status;
		if(typeof(data['status'])=="undefined" || data['status'] == -1)
		    status = statuses[5];
		else
		    status = statuses[data['status']];
		document.getElementById("status_"+det).innerHTML = status;
		
		// Set attributes
		var atts = ["number", "mode", "rate", "buff", "readers", "time"];
		for(j in atts){
		    if(typeof(data[atts[j]])!="undefined"){
			if(atts[j]=="time")
			    document.getElementById(det+"_"+atts[j]).innerHTML =
			    	moment(data[atts[j]]).format('DD. MMM. hh:mm');
			else if(atts[j] == "rate")
			    document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]].toFixed(2) + " MB/s";
			else if(atts[j] == "buff")
				document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]].toFixed(2) + " MB";
		 	else
		 		document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]];
		    }
		    else
				document.getElementById(det+"_"+atts[j]).innerHTML = '-';
		}

		// Update charts if needed
		var ts = new Date(data['time']).getTime();
		if(typeof(document.last_time_charts) != "undefined" &&
		   det in document.last_time_charts &&
		   !isNaN(ts) && document.last_time_charts[det] != ts){
		    document.last_time_charts[det] = ts;
		    UpdateOverviewChart(det, ts, data['rate'], data['buff']);
		}
	    }
	}(detector)));
    }*/
   $.getJSON(gp+"/status/get_broker_status", function(data){
   		for(var i in data){
   			var doc = data[i];
   			var det = doc['detector'];
   			document.getElementById("det_name_"+det).innerHTML = hrdetectors[det];
   			
   			// Set Status
   			var status;
			if(typeof doc['status'] === "undefined" || doc['status'] === -1)
		    	status = statuses[5];
			else
		    	status = statuses[doc['status']];
			document.getElementById("status_"+det).innerHTML = status;
			
			// Set attributes
			var atts = ["number", "mode", "rate", "buff", "readers", "time"];
			for(j in atts){
		    	if( typeof doc[atts[j]] !== "undefined"){
					if(atts[j]==="time")
			    		document.getElementById(det+"_"+atts[j]).innerHTML =
			    			moment(doc[atts[j]]).format('DD. MMM. hh:mm');
					else if(atts[j] === "rate")
			    		document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]].toFixed(2) + " MB/s";
					else if(atts[j] === "buff")
						document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]].toFixed(2) + " MB";
		 			else
		 				document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]];
		   		 }
		   		 else
					document.getElementById(det+"_"+atts[j]).innerHTML = '-';
			}
			
			// Update charts if needed
			var ts = new Date(doc['update_time']).getTime();
			console.log(doc);
			console.log(document.last_time_charts[det]);
			if(typeof document.last_time_charts !== "undefined" &&
		   			det in document.last_time_charts &&
		   			!isNaN(ts) && document.last_time_charts[det] !== ts){
					    document.last_time_charts[det] = ts;
		    			UpdateOverviewChart(det, ts, doc['rate'], doc['buff']);
   			}
   			
   		} // End for
    	setTimeout(UpdateOverviewPage, 5000);
	});

}

function UpdateOverviewChart(detector, ts, rate, buff){
    if(detector in (document.charts) && document.charts[detector] != null){
	//var tss = (new Date(ts)).getTime();
	document.charts[detector].series[0].addPoint([ts, rate], true, true);
	document.charts[detector].series[1].addPoint([ts, buff], true, true);
    }
}

function DrawOverviewCharts(){
    document.charts = {};
    document.last_time_charts = {};
    var detectors = ["tpc", "muon_veto", "neutron_veto"];
	var colors = {"tpc": "#1c0877", "muon_veto": "#df3470", "neutron_veto": "#3dd89f"}
    for(i in detectors){
	var detector = detectors[i];
	$.getJSON(gp+"/detector_history?limit=1000&detector="+detector, (function(det){
	    return function(data){
		console.log(data);
		// No data no chart
		if(Object.keys(data).length==0)
		    return;
		if(typeof(data['rates'][0])=='undefined' || data['rates'][0].length != 2) 
		    return;
		document.last_time_charts[det] = data['rates'][data['rates'].length-1][0];
		var series = [
		    {"type": "area", "name": "transfer rate", "data": data['rates'], "color": colors[det]},
		    {"type": "area", "name": "buffered data", "data": data['buffs'], "color": "#222222"}
		];
		var div = det+"_chartdiv";
		document.charts[det] = Highcharts.chart(
		    div, {
			chart: {
			    zoomType: 'x',
			    marginLeft: 44,
			    marginTop: 20,
			    marginBottom: 30,
			    marginRight:10
			},
			plotOptions: {
            	series: {
               	 	fillOpacity: 0.3,
               	 	lineWidth: 1
            	}	
        	},
			credits: {
			    enabled: false,
			},
			title: {
			    text: '',
			},
			xAxis: {
			    type: 'datetime',
			},
			yAxis: {
			    title: {
				text: "MB/s",
			    },
			    min: 0,
			},
			legend: {
			    enabled: false,
			},
			series: series
		    });	    
	    };
	}(detector)));
    }
}

var gp = "";

function FYouButton(buttonid){
    $("#"+buttonid).mouseover(function(){
        var t = ($(window).height()-80)*Math.random() + 80;
        var l = ($(window).width()-40)*Math.random();
        $("#"+buttonid).css({'z-index': 10, //'height': '31px',
                             'top': t, 'left': l, 'position':'absolute'});

        var rand = Math.random() * 30;
        if(rand<1){
            var ahahah = document.getElementById("ahahah");
            ahahah.pause();
            ahahah.currentTime = 0;
            ahahah.play();
        }

    });
}

var statii = ["IDLE", "ARMING", "ARMED", "RUNNING", "ERROR", "UNKNOWN"];

function DetectorInfoLoop(){
    FillDetectorInfo('tpc', function(){});
    FillDetectorInfo('muon_veto', function(){});
    FillDetectorInfo('neutron_veto', function(){});
    setTimeout(DetectorInfoLoop, 10000);
}

function FillDetectorInfo(det, callback){
    var status_classes = [
	'fa-minus-circle', // idle
	'fa-spinner', // arming
	'fa-spinner', // armed
	'fa-plus-circle',  // running
	'fa-times-circle', // error
	'fa-exclamation-triangle',      // timeout
	'fa-question-circle'	 //unknown
    ];
    var status_colors = [
	'white',
	'yellow',
	'orange',
	'green',
	'red',
	'red',
	'red'
    ];
    var detnames = { "tpc": "TPC", "muon_veto": "Muon Veto", "neutron_veto": "Neutron Veto"};
    var title_text = [' is IDLE', ' is ARMING', ' is ARMED', ' is RUNNING', ' is IN ERROR',
		      ' is TIMING OUT', ' is UNKNOWN'];
   
    $.getJSON("status/get_detector_status?detector="+det,
	      function(data){
		  if($("#"+det+"_status").length){
		      document.getElementById(det+"_status").innerHTML = statii[data['status']];
		      document.getElementById(det+"_mode").innerHTML = data['mode'];
		      document.getElementById(det+"_run").innerHTML = data['number'];
		      document.getElementById(det+"_rate").innerHTML = data['rate'].toFixed(2);
		      document.getElementById(det+"_readers").innerHTML = data['readers'];
		  }
		  for(var i in status_classes)
		      $("#"+det+"_status_icon").removeClass(status_classes[i]);
		  $("#"+det+"_status_icon").removeClass('fa-spin');
		  if(data['status'] == null)
		      data['status'] = 6;
		  $("#"+det+"_status_icon").addClass(status_classes[data['status']]);
		  if(data['status'] == 1 || data['status'] == 2)
		      $("#"+det+"_status_icon").addClass('fa-spin');
		  $("#"+det+"_status_icon").css("color", status_colors[data['status']]);
		  $("#"+det+"_status_icon").attr('title', detnames[det] + title_text[data['status']]);
		  callback();
	      });
}

function GetFillLevel(){
  $.getJSON('status/get_fill', (data) => {
    //console.log(data);
    if (typeof data.message != 'undefined' || data.length == 0) {
        console.log('Err ' + data.message);
      return;
    }
    var x = "linear-gradient(";
    var step = 0.5; // this is in m
    for (var i = 10; i > 0; i-= step) {
      if (data[0].value > i)
        x += "Blue,";
      else
        x += "White,";
    }
      x = x.slice(0, x.length-1);
    x += ");"
      //console.log(x);
    $("#content").css("background-image", x.slice(0,x.length-1));
  });
}

function CheckForErrors(){
	$.getJSON("logui/areThereErrors", 
		  function(data){
		      if(data['error_docs']>0){
			  if(!($("#errorbar").hasClass("active")))
			      $("#errorbar").addClass("active");
			  document.flashDatButton=true;
			  //var h = window.innerHeight - $('#errorbar').height();
			  $('.main-container').css('height', 'calc(100vh-'+$('#errorbar').height()+'px)');
			  
			  // Disable start run button if there are errors
			  if(document.getElementById("submit_changes")!=null 
			     && !($("#submit_changes").hasClass("FYOU"))){
			      //FYouButton('submit_changes');
			      //$("#submit_changes").addClass("FYOU");
			  }
		      }
		      else{
			  if($("#errorbar").hasClass("active"))
			      $("#errorbar").removeClass('active');
			  document.flashDatButton=false;
			  
			  // Re-enable button that would let you start a run
			  if($("#submit_changes").hasClass("FYOU")){
			      $("#submit_changes").unbind("mouseover");
			      $("#submit_changes").removeClass("FYOU");
			  }
		      }
		      // Callback chain
		      FillDetectorInfo("tpc", function(){
			  FillDetectorInfo("muon_veto", function(){
			      FillDetectorInfo("neutron_veto",  function(){
				  setTimeout(CheckForErrors, 5000)});});});
		  });
}
function DrawActiveLink(page){
    var pages = [
	"#lindex", "#lplaylist", "#lstatus", "#lhosts", "#loptions", "#lruns",
	"#llog", "#lusers", "#lhelp", "#laccount", "#lcontrol", "#lshifts", "#lmonitor", "#lequipment"
    ];
    for(var i in pages){
		if(pages[i] !== page)
	    	$(pages[i]).removeClass("active");
		else
	    	$(pages[i]).addClass("active");
    }
}


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function SetNavbar(fc){
    var hcol = hexToRgb(fc);
    if(hcol!=null){
      complement = "#eeeeee";
      if((hcol['r']+hcol['g']+hcol['b'])/3 > 128)
         complement="#333333";
    $("#sidebar").css("cssText", "background-color: " + fc +
		 "!important;color:"+complement+" !important");
		$(".colored").css("cssText", "background-color: " + fc +
			 "!important;color:"+complement+" !important");
			 $(".anticolored").css("cssText", "background-color: " + complement +
			 "!important");
	//$("#navbar > .navbar-brand").css("cssText", "color: "+ complement+ "!important");
	//$(".nav-item > a").css("cssText", "color:"+complement+"!important");
    }
}

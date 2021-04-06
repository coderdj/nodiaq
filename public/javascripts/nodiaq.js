var gp = "";
var statii = ["IDLE", "ARMING", "ARMED", "RUNNING", "ERROR", "UNKNOWN"];
var detectors = {};

function SetDetectors() {
  $.getJSON("template_info", data => {
    data.detectors.forEach(val => {detectors[val[0]] = val[1];});
  });
}

function DetectorInfoLoop(){
  if (Object.keys(detectors).length == 0) return;
  for (var key in detectors)
    FillDetectorInfo(key);
}

function FillDetectorInfo(det){
  var status_classes = [
    'fa-minus-circle', // idle
    'fa-spinner', // arming
    'fa-spinner', // armed
    'fa-plus-circle',  // running
    'fa-times-circle', // error
    'fa-exclamation-triangle',      // timeout
    'fa-question-circle' //unknown
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
  var title_text = [' is IDLE', ' is ARMING', ' is ARMED', ' is RUNNING', ' is IN ERROR',
    ' is TIMING OUT', ' is UNKNOWN'];

  $.getJSON("status/get_detector_status?detector="+det,
    function(data){
      if($("#"+det+"_status").length){
        ['mode', 'number'].forEach( field => {
          $("#"+det+"_"+field).html(data[field]);
        });
        $('#'+det+"_status").html(statii[data['status']]);
        $('#'+det+"_rate").html(data['rate'].toFixed(2));
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
      $("#"+det+"_status_icon").attr('title', detectors[det] + title_text[data['status']]);
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
  $.getJSON("logui/areThereErrors", function(data){
    if(data['error_docs']>0){
      if(!($("#errorbar").hasClass("active")))
        $("#errorbar").addClass("active");
      document.flashDatButton=true;
      $('.main-container').css('height', 'calc(100vh-'+$('#errorbar').height()+'px)');

    }
    else{
      if($("#errorbar").hasClass("active"))
        $("#errorbar").removeClass('active');
      document.flashDatButton=false;
    }
  });
}

function DrawActiveLink(this_page){
  ["#lindex", "#lplaylist", "#lstatus", "#lhosts", "#loptions", "#lruns",
    "#lhypervisor", "#llog", "#lusers", "#lhelp", "#laccount", "#lcontrol",
    "#lshifts", "#lmonitor", "#lequipment"].forEach(page => {
    if (page !== this_page)
      $(page).removeClass('active');
    else
      $(page).addClass('active');
  });
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
  }
}

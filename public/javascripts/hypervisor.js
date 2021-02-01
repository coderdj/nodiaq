var eb2 = ['eb2'];
var not_eb2 = ['eb0', 'eb1', 'eb3', 'eb4', 'eb5'];
var all_hosts = ['reader0', 'reader1', 'reader2', 'reader3', 'reader4', 'reader5',
  'reader6', 'eb0', 'eb1', 'eb2', 'eb3', 'eb4', 'eb5', 'oldmaster'];
var all_readout = ['reader0_controller_0', 'reader0_reader_0', 'reader1_reader_0', 'reader2_reader_0', 'reader3_reader_0'];
var all_bootstrax = ['eb0.xenon.local', 'eb1.xenon.local', 'eb3.xenon.local', 'eb4.xenon.local', 'eb5.xenon.local'];
var all_ajax = ['ajax.eb0.xenon.local', 'ajax.eb1.xenon.local', 'ajax.eb3.xenon.local', 'ajax.eb4.xenon.local', 'ajax.eb5.xenon.local'];

function ControlBase(task, targets) {
  $.ajax({
    type: 'POST',
    url: 'hypervisor/control',
    data: {data: {task: task, targets: targets}},
    success: () => {},
    error: (jqXHR, text, error) => {alert("Error " + error + ": " + text);}
  });
}
/*
function VMEControl(crate, onoff) {
  ControlBase('vmectl_'+ onoff, crate == 'all' ? ['vme0', 'vme1', 'vme2', 'vme3', 'vme4'] : ['vme'+crate]);
}

function StartRedax(reader, proc="reader") {
  var targets = reader == 'all' ? all_readout : ["reader" + reader + "_" + proc + "_0"];
  ControlBase("redaxctl_start", targets);
}

function StopRedax(reader, proc="reader") {
  var targets = reader == 'all' ? all_readout : ["reader" + reader + "_" + proc + "_0"];
  ControlBase("redaxctl_stop", targets);
}

function StartBootstrax(eb) {
  ControlBase('bootstraxctl_start', eb == 'all' ? not_eb2 : ['eb'+eb]);
}

function StopBootstrax(eb) {
  ControlBase('bootstraxctl_stop', eb == 'all' ? not_eb2 : ['eb'+eb]);
}

function StartAjax(eb) {
  ControlBase('ajaxctl_start', eb == 'all' ? not_eb2 : ['eb'+eb])
}

function StopAjax(eb) {
  ControlBase('ajaxctl_stop', eb == 'all' ? not_eb2 : ['eb'+eb]);
}

function EBSync(eb) {
  var targets = [];
  if (eb == 'all')
    targets = ['eb0', 'eb1', 'eb2', 'eb3', 'eb4', 'eb5'];
  else
    targets = ['eb'+eb];
  ControlBase('ebctl_sync', targets);
}

function Microstrax(cmd) {
  ControlBase('microstraxctl_'+cmd, eb2);
}
*/
function UpdateHosts() {
  var timeout = 5000;
  var svgobj = document.getElementById("svg_frame").contentDocument;
  for (var i in all_hosts) {
    $.getJSON('hosts/get_host_status?host='+all_hosts[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      try{
        var p = /xenon\.local/; // ebx.xenon.local
        if (p.test(data['host']))
          data['host'] = data['host'].substr(0,3);
        if (data['checkin'] > timeout) {
          svgobj.getElementById(data['host']+"_status").style.fill='red';
        } else {
          svgobj.getElementById(data['host']+"_status").style.fill='lime';
        }
      }catch(error){
        console.log(error);
        console.log(data);
      }
    });
  }
}

function UpdateVME() {
  var timeout = 10000;
  var svgobj = document.getElementById("svg_frame").contentDocument;
  $.getJSON('hosts/get_host_status?host=vme', (data) => {
    if (Object.entries(data).length == 0) return;
    if (typeof data.err != 'undefined') {
      console.log(data);
      return;
    }
    //console.log(data);
    try{
      svgobj.getElementById("vme_timeout").style.fill=data['checkin'] > timeout ? "black" : "red";

      for (var i = 0; i < 5; i++) {
        var d = data[i];
        var ON = d["IMON_0"] > 0;
        svgobj.getElementById("vme"+i+"_current").textContent = d['IMON_0'] + '/' + d['ISET_0'];
        svgobj.getElementById("vme"+i+"_bkg").style.fill = ON ? "red" : "FF7777";
        svgobj.getElementById("vme"+i+"_btn").children[0].textContent = ON ? "OFF" : "ON";
      }
    }catch(error){
      console.log(error);
      console.log(data);
    }
  });
}

function UpdateReadout() {
  var timeout = 5000;
  var svgobj = document.getElementById("svg_frame").contentDocument;
  for (var i in all_readout) {
    $.getJSON('hypervisor/readout_status?host='+all_readout[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      try{
        var host_i = data.host[6];
        if (data.checkin > timeout) {
          svgobj.getElementById(data.host+"_status").style.fill='red';
          svgobj.getElementById(data.host+"_label").textContent="START";
        } else {
          svgobj.getElementById(data.host+"_status").style.fill='lime';
          svgobj.getElementById(data.host+"_label").textContent="STOP";
        }
      }catch(error){
        console.log(error);
        console.log(data);
      }
    });
  }
}

function UpdateBootstrax() {
  var timeout = 20000;
  var svgobj = document.getElementById("svg_frame").contentDocument;
  for (var i in all_bootstrax) {
    $.getJSON('hypervisor/eb_status?host='+all_bootstrax[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      var host = data['host'].substr(5,8);
      if (data.checkin > timeout) {
        svgobj.getElementById(data.host+"_bootstrax_status").style.fill='red';
        svgobj.getElementById(data.host+"_bootstrax_label").textContent="START";
      } else {
        svgobj.getElementById(data.host+"_bootstrax_status").style.fill='lime';
        svgobj.getElementById(data.host+"_bootstrax_label").textContent="STOP";
      }
    });
  }
}

function UpdateAjax() {
  var timeout = 3600*1000*1.5;
  var svgobj = document.getElementById("svg_frame").contentDocument;
  for (var i in all_ajax) {
    $.getJSON('hypervisor/eb_status?host='+all_ajax[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefiend') {
        console.log(err);
        return;
      }
      var host = data['host'].substr(5,8);
      if (data.checkin > timeout) {
        $("#"+host+"_ajax_label").textContent="START";
        $("#"+host+"_ajax_status").style.fill="red";
      } else {
        $("#"+host+"_ajax_label").textContent="STOP";
        $("#"+host+"_ajax_status").style.fill="lime";
      }
    });
  }
}

function UpdateLoop() {
  UpdateHosts();
  UpdateVME();
  UpdateReadout();
  UpdateBootstrax();
  UpdateAjax();
  $.getJSON('hypervisor/eb_status?host=microstrax.eb2.xenon.local', (data) => {
    if (Object.entries(data).length == 0) return;
    if (typeof data.err != 'undefined') {
      console.log(err);
      return;
    }
    var svgobj = document.getElementById("svg_frame").contentDocument;
    var timeout = 30000;
    if (data.checkin > timeout) {
      $("#eb2_microstrax_label").textContent="START";
      $("#eb2_microstrax_status").style.fill="red";
    } else {
      $("#eb2_microstrax_label").textContent="STOP";
      $("#eb2_microstrax_status").style.fill="green";
    }
  });
}


var eb2 = ['eb2'];
var noteb2 = ['eb0', 'eb1', 'eb3', 'eb4', 'eb5'];
var all_hosts = ['reader0', 'reader1', 'reader2', 'reader3', 'reader4', 'reader5',
  'reader6', 'eb0.xenon.local', 'eb1.xenon.local', 'eb2.xenon.local', 'eb3.xenon.local', 'eb4.xenon.local', 'eb5.xenon.local', 'oldmaster'];
var all_readout = ['reader0_controller_0', 'reader0_reader_0', 'reader1_reader_0', 'reader2_reader_0', 'reader3_reader_0'];
var all_bootstrax = ['bootstrax.eb0.xenon.local', 'bootstrax.eb1.xenon.local',
  'bootstrax.eb3.xenon.local', 'bootstrax.eb4.xenon.local', 'bootstrax.eb5.xenon.local'];
var all_ajax = ['ajax.eb0.xenon.local', 'ajax.eb1.xenon.local', 'ajax.eb3.xenon.local',
  'ajax.eb4.xenon.local', 'ajax.eb5.xenon.local'];

function ControlBase(task, targets) {
  $.ajax({
    type: 'POST',
    url: 'hypervisor/control',
    data: {data: {task: task, targets: targets}},
    success: () => {},
    error: (jqXHR, text, error) => {alert("Error " + error + ": " + text);}
  });
}

function VMEControl(crate, onoff) {
  ControlBase('vmectl_'+ onoff, crate == 'all' ? ['vme0', 'vme1', 'vme2', 'vme3', 'vme4'] : ['vme'+crate]);
}

function StartRedax(reader, proc="reader") {
  var targets == 'all' ? all_readout : ["reader" + reader + "_" + proc + "_0"];
  ControlBase("redaxctl_start", targets);
}

function StopRedax(reader, proc="reader") {
  var targets == 'all' ? all_readout : ["reader" + reader + "_" + proc + "_0"];
  ControlBase("redaxctl_stop", targets);
}

function StartBootstrax(eb) {
  ControlBase('bootstraxctl_start', eb == 'all' ? noteb2 : ['eb'+eb]);
}

function StopBootstrax(eb) {
  ControlBase('bootstraxctl_stop', eb == 'all' ? noteb2 : ['eb'+eb]);
}

function StartAjax(eb) {
  ControlBase('ajaxctl_start', eb == 'all' ? noteb2 : ['eb'+eb])
}

function StopAjax(eb) {
  ControlBase('ajaxctl_stop', eb == 'all' ? noteb2 : ['eb'+eb]);
}

function EBSync(eb) {
  var targets = [];
  if (eb == 'all')
    targets = ['eb0', 'eb1', 'eb2', 'eb3', 'eb4', 'eb5'];
  else
    targets = ['eb'+eb];
  ControlBase('eb_sync', targets);
}

function Microstrax(cmd) {
  ControlBase('microstraxctl_'+cmd, eb2);
}

function UpdateHosts() {
  var timeout = 5000;
  for (var i in allhosts) {
    $.getJSON('hosts/get_host_status?host='+allhosts[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      var p = /xenon\.local/;
      if (p.test(data['host']))
        data['host'] = data['host'].substr(0,3);
      if (data['checkin'] > timeout) {
        $('#'+data['host']+"_status").css('color', 'red');
        $('#'+data['host']+"_label").css('color', 'red');
      } else {
        $('#'+data['host']+"_status").css("color", "green");
        $('#'+data['host']+"_label").css('color', 'green');
      }
    });
  }
}

function UpdateVME() {
  var timeout = 10000;
  $.getJSON('hosts/get_host_status?host=vme', (data) => {
    if (Object.entries(data).length == 0) return;
    if (typeof data.err != 'undefined') {
      console.log(data);
      return;
    }
    for (var i = 0; i < 5; i++) {
      $("#vme"+i+"_current").text(data['IMON_0'] + '/' + data['ISET_0']);
      $("#vme"+i+"_bkg").css("color", data["IMON_0"] > 0 ? "red" : "770000");
    }
  });
}

function UpdateReadout() {
  var timeout = 5000;
  for (var i in all_readout) {
    $.getJSON('hypervisor/readout_status?host='+all_readout[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      $("#"+data.host+"_label").css("color", data.checkin > timeout ? "red" : "green");
    });
  }
}

function UpdateBootstrax() {
  var timeout = 10000;
  for (var i in all_bootstrax) {
    $.getJSON('hypervisor/eb_status?proc=bootstrax&host='+all_bootstrax[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      var host = data['host'].substr(5,8);
      if (data.checkin > timeout) {
        $("#"+host+"_bs_btn").attr("onclick", `StartBootstrax(${host[2]})`);
        $("#"+host+"_bs_btn_label").text("START");
        $("#"+host+"_bs_btn_label").css("color", "red");
      } else {
        $("#"+host+"_bs_btn").attr("onclick", `StopBootstrax(${host[2]})`);
        $("#"+host+"_bs_btn_label").text("STOP");
        $("#"+host+"_bs_btn_label").css("color", "green");
      }
    });
  }
}

function UpdateAjax() {
  var timeout = 10000;
  for (var i in all_ajax) {
    $.getJSON('hypervisor/eb_status?proc=ajax&host='+all_ajax[i], (data) => {
      if (Object.entries(data).length == 0) return;
      if (typeof data.err != 'undefiend') {
        console.log(err);
        return;
      }
      var host = data['host'].substr(5,8);
      if (data.checkin > timeout) {
        $("#"+host+"_aj_btn").attr("onclick", `StartAjax(${host[2]})`);
        $("#"+host+"_aj_btn_label").text("START");
        $("#"+host+"_aj_btn_label").css("color", "red");
      } else {
        $("#"+host+"_aj_btn").attr("onclick", `StopAjax(${host[2]})`);
        $("#"+host+"_aj_btn_label").text("STOP");
        $("#"+host+"_aj_btn_label").css("color", "green");
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
  $.getJSON('hypervisor/eb_status?proc=microstrax&host=eb2', (data) => {
    if (Object.entries(data).length == 0) return;
    if (typeof data.err != 'undefined') {
      console.log(err);
      return;
    }
    var timeout = 30000;
    if (data.checkin > timeout) {
      $("#eb2_us_btn_label").text("START");
      $("#eb2_us_btn_label").css("color", "red");
      $("#eb2_us_btn").attr("onclick", `Microstrax('start')`);
    } else {
      $("#eb2_us_btn_label").text("STOP");
      $("#eb2_us_btn_label").css("color", "green");
      $("#eb2_us_btn").attr("onclick", `Microstrax('stop')`);
    }
  });
}

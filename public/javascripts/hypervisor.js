var eb2 = ['eb2'];
var noteb2 = ['eb0', 'eb1', 'eb3', 'eb4', 'eb5'];
var allhosts = ['reader0', 'reader1', 'reader2', 'reader3', 'reader4', 'reader5',
  'reader6', 'eb0', 'eb1', 'eb2', 'eb3', 'eb4', 'eb5', 'oldmaster'];

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

function RedaxCycle(reader, proc="reader") {
  var targets = [];
  if (reader == 'all') {
    targets = ["reader0_reader_0", "reader1_reader_0", "reader2_reader_0", "reader3_reader_0"];
  } else {
    targets = ["reader" + reader + "_" + proc + "_0"];
  }
  ControlBase("redax_ctl", targets);
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
    $.getJSON('/host_status?host='+allhosts[i], (data) => {
      if (typeof data.err != 'undefined') {
        console.log(data);
        return;
      }
      var p = /xenon\.local/;
      if (p.test(data['host']))
        doc['host'] = doc['host'].substr(0,3);
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
  var timeout = 5000;
  $.getJSON('/host_status?host=vme', (data) => {
    if (typeof data.err != 'undefined') {
      console.log(data);
      return;
    }
    for (var i = 0; i < 5; i++) {
      $("#vme"+i+"_current").text(data['IMON_0'] + '/' + data['ISET_0']);
    }
    if (data['IMON_0'] > 0) { // crate is "on"
      $("#vme"+i+"_bkg").css("color", "770000");
    } else {
      $("#vme"+i+"_bkg").css("color", "red");
    }
  });
}

function UpdateLoop() {
  UpdateHosts();
  UpdateVME();
}

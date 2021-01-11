
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
  var targets = [];
  if (eb == 'all')
    targets = ['eb0', 'eb1', 'eb3', 'eb4', 'eb5'];
  else
    targets = ['eb'+eb];
  ControlBase('bootstraxctl_start', targets);
}

function StopBootstrax(eb) {
  var targets = [];
  if (eb == 'all')
    targets = ['eb0', 'eb1', 'eb3', 'eb4', 'eb5'];
  else
    targets = ['eb'+eb];
  ControlBase('bootstraxctl_stop', targets);
}

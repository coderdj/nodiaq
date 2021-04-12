var initial_control = {};
var detectors = [];
const SCRIPT_VERSION = '20210407';

function SetDetectors() {
  $.getJSON('control/template_info', data => {
    detectors = data.detectors.map(val => val[0]);
    PopulateOptionsLists(PullServerData);
    DefineButtonRules();
  }
}

function DefineButtonRules(){
  // handle LZ buttons first
  $("#lz_remote").removeClass("det_control").removeClass("det_remote").change(function(){
    document.page_ready = false;
    if(!$("#lz_remote").is(":checked")){
      alert("Local control of LZ is only available from SURF");
      $("#lz_remote").bootstrapToggle('on');
    }
    document.page_ready = true;
  });

  $("#lz_active").removeClass("det_control").removeClass("det_active").change(function(){
    document.page_ready = false;
    if (!$("#lz_active").is(":checked")) {
      alert("You can't stop LZ");
      $("#lz_active").bootstrapToggle("on");
    }
    document.page_ready = true;
  });

  $("#lz_softstop").removeClass("det_control").removeClass("det_softstop").change(function(){
    document.page_ready = false;
    if($("#lz_softstop").is(":checked")){
      alert("You want to go soft on LZ? I hope you aren't an AC");
      $("#lz_softstop").bootstrapToggle('off');
    }
    document.page_ready = true;
  });

  $("#lz_user").val("rgaitskell");

  $(".det_control").change(function(){
    if(document.page_ready == true) {
      $("#confirm_div").fadeIn("fast");
      CheckLinking();
    }
  });

  $(".det_remote").change(function() {
    if (document.page_ready) {
      document.page_ready = false;
      var det = this.id.substr(0, this.id.length-'_remote'.length);
      if ($(`#${det}_remote`).is(":checked")) {
        $(`#${det}_active`).bootstrapToggle('off');
      }
      SetRemote(det);
      document.page_ready = true;
    }
  });

  $(".det_active").change(function() {
    if (document.page_ready) {
      document.page_ready = false;
      var det = this.id.substr(0, this.id.length-'_active'.length);
      // If we're in remote mode, fail. We shouldn't get here, but still
      if ($(`#${det}_remote`).is(":checked")) {
        alert(`You cannot control the ${det.replace('_',' ')} when it is in remote mode`);
        $(`#${det}_active`).bootstrapToggle('toggle');
      }
      document.page_ready = true;
    }
  });

} // DefineButtonRules

function SetRemote(detector){
  if (detector == 'lz') return;
  var is_remote = $(`#${detector}_remote`).is(":checked");
  ['active', 'softstop', 'stop_after', 'comment', 'mode'].forEach(att => $(`#${detector}_${att}`).prop('disabled', is_remote));
  if (is_remote) {
    $(`#${detector}_active`).bootstrapToggle('off');
  } else {

  }
}

function CheckLinking() {
  if (detectors.length == 0) return;
  var modes = detectors.map(det => $(`#${det}_mode`).val());
  var links = detectors.map(det => $(`#${det}_mode :selected`).attr("link_type").split(","));
  var active = detectors.map(det => $(`#${det}_active`).is(":checked"));
  var remote = detectors.map(det => $(`#${det}_remote`).is(":checked"));
  var softstop = detectors.map(det => $(`#${det}_softstop`).is(":checked"));
  var stopafter = detectors.map(det => $(`#${det}_stop_after`).val());
  var invalid = false;
  var is_linked = [[null, false, false], [null, null, false]];

  // check these combos: tpc-mv, tpc-nv, mv-nv
  for (var i = 0; i < detectors.length-1; i++) {
    for (var j = i+1; j < detectors.length; j++) {
      if (links[i].includes(detectors[j]) || links[j].includes(detectors[i]))
        invalid ||= (modes[i] != modes[j] || active[i] != active[j] || stopafter[i] != stopafter[j] || softstop[i] != softstop[j] || remote[i] || remote[j]);
      is_linked[i][j] = links[i].includes(detectors[j]) && links[j].includes(detectors[i]);
    }
  }
  var case_e = is_linked[0][1] == false && is_linked[0][2] == false && is_linked[1][2] == true;

  var html = "";
  if (!case_e) {
    var mv = is_linked[0][1] ? "" : "un";
    var nv = is_linked[0][2] ? "" : "un";
    html = `MV <i class="fas fa-${mv}link"></i> TPC <i class="fas fa-${nv}link"></i> NV`;
  } else {
    html = `TPC <i class="fas fa-unlink"></i> NV <i class="fas fa-link"></i> MV`;
  }
  $("#linking_span").html(html);
  $("#linking_span").css("color", invalid ? "red" : "black");
  $("#submit_changes").prop("disabled", invalid);
  $("#submit_changes").text(invalid ? "Invalid combination" : "Submit");
}

function PopulateOptionsLists(callback){
  $("#lz_remote").bootstrapToggle('on');
  $("#lz_softstop").bootstrapToggle('off');
  $("#lz_mode").html("<option value='shit'><strong>xenon leak mode</strong></option><option value='goblind'><strong>HV spark mode</strong></option><option value='oops'><strong>find dark matter but it turns out not to be dark matter mode</strong></option><option value='n'><strong>Only measure neutrons because of all our teflon mode</strong></option><option value='blow'><strong>Lots of radon mode (note, this mode cannot be turned off)</strong></option><option value='whoops'>Don't drift electrons because all the teflon outgasses too much mode</option>");
  $.getJSON("control/modes", (data) => {
    if (typeof data.error != 'undefined') {
      console.log(data);
      return;
    }
    // [{_id: detector name, configs: []}, {_id: detector name....}]
    data.forEach(doc => {
        $("#"+doc['_id']+"_mode").html(doc['configs'].reduce((html, val) => html+`<option value='${val[0]}' link_type='${val[2].join()}'><strong>${val[0]}:</strong> ${val[1]}</option>`, ""));
    });
    callback();
  });
}

function PullServerData(){
  var ready = 0;
  document.page_ready = false;
  ['tpc', 'muon_veto', 'neutron_veto'].forEach(det => {
    $.getJSON("control/get_control_doc?detector="+det, function(doc){
      var detector = doc['detector'];
      if(detector !== 'tpc' && detector !== 'muon_veto' && detector !== 'neutron_veto'){
        return;
      }
      initial_control[detector] = doc;
      ["stop_after", "comment"].forEach( (att) => $(`#${detector}_${att}`).val(doc[att]));

      $(`#${detector}_mode option`).filter(function() {return this.value===doc.mode;}).prop('selected', true);
      $(`#${detector}_user`).val(doc.user);

      ['active', 'remote', 'softstop'].forEach(att => $(`#${detector}_${att}`).bootstrapToggle(doc[att] == 'true' ? 'on' : 'off'));

      SetRemote(detector);
      ready++;
      if (ready >= 3)
        document.page_ready = true;
    }); // getJSON
  }); // forEach
  // select a random LZ mode for fun
  var lz = $("#lz_mode option");
  var n = Math.floor(Math.random()*lz.length);
  lz.filter((i, val) => i==n).prop("selected", true);
}

function PostServerData(){
  post = {'version': SCRIPT_VERSION};
  var empty = true;
  detectors.forEach(detector => {
    var thisdet = {};
    if ($(`#${detector}_remote`).is(":checked")) {
      thisdet['remote'] = 'true';
      thisdet['active'] = 'false';
    } else {
      ['active', 'remote', 'softstop'].forEach( (att) => {
        var checked = $(`#${detector}_${att}`).is(":checked").toString();
        if (checked != initial_control[detector][att])
          thisdet[att] = checked;
      });

      ["stop_after", "mode", "comment"].forEach( (att) => {
        var val = $(`#${detector}_${att}`).val();
        if (val != initial_control[detector][att])
          thisdet[att] = val;
      });

    }
    if (Object.keys(thisdet).length == 0)
      return;
    post[detector] = thisdet;
    empty &&= false;
  });
  if (!empty) {
    $.ajax({
      type: "POST",
      url: "control/set_control_docs",
      data: {"data": post},
      success: (data) => {
        if (typeof data.err != 'undefined')
          alert(data.err);
        location.reload();},
      error: function(jqXHR, textStatus, errorThrown) {
        alert("Error, status = " + textStatus + ", " + "error thrown: " + errorThrown);
      }
    });
  }
}

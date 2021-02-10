var initial_control = {};

function DefineButtonRules(){

  $("input").change(function(){if(document.page_ready==true){$("#confirm_div").fadeIn("fast"); $(".my_name_is").val(document.current_user);}});
  $("select").change(function(){if(document.page_ready==true){$("#confirm_div").fadeIn("fast"); $(".my_name_is").val(document.current_user);}});

  $("#tpc_active").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      var val = 'off';

      // First, fail in case "remote" mode enabled"
      if($("#tpc_remote").is(":checked")){
        alert("You cannot control the TPC when it is in remote mode!");
        $("#tpc_active").bootstrapToggle('toggle');
        document.page_ready = true;
        return;
      }

      if($("#tpc_active").is(":checked")) val = 'on';
      if($("#link_mv").is(":checked")) $("#muon_veto_active").bootstrapToggle(val);
      if($("#link_nv").is(":checked")) $("#neutron_veto_active").bootstrapToggle(val);
      document.page_ready = true;
    }
  });
  $("#muon_veto_active").change(function(){
    if(document.page_ready){
      document.page_ready = false;

      // First, fail in case "remote" mode enabled"
      if($("#muon_veto_remote").is(":checked")){
        alert("You cannot control the muon veto when it is in remote mode!");
        $("#muon_veto_active").bootstrapToggle('toggle');
        document.page_ready = true;
        return;
      }

      var val = 'off';
      if($("#muon_veto_active").is(":checked")) val = 'on';
      if($("#link_mv").is(":checked")) {
        $("#tpc_active").bootstrapToggle(val);
        if($("#link_nv").is(":checked"))
          $("#neutron_veto_active").bootstrapToggle(val); 
      }
      document.page_ready = true;
    }
  });
  $("#neutron_veto_active").change(function(){
    if(document.page_ready){
      document.page_ready = false;

      // First, fail in case "remote" mode enabled"
      if($("#neutron_veto_remote").is(":checked")){
        alert("You cannot control the neutron veto when it is in remote mode!");
        $("#neutron_veto_active").bootstrapToggle('toggle');
        document.page_ready = true;
        return;
      }

      var val = 'off';
      if($("#neutron_veto_active").is(":checked")) val = 'on';
      if($("#link_nv").is(":checked")) {$("#tpc_active").bootstrapToggle(val);
        if($("#link_mv").is(":checked")) $("#muon_veto_active").bootstrapToggle(val); }
      document.page_ready = true;
    }
  });

  $("#link_nv").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      var val = 'off';
      if($("#tpc_active").is(":checked")) val = 'on';
      if($("#link_nv").is(":checked")) $("#neutron_veto_active").bootstrapToggle(val);
      document.page_ready = true;
    }
  });
  $("#link_mv").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      var val = 'off';
      if($("#tpc_active").is(":checked")) val = 'on';
      if($("#link_mv").is(":checked")) $("#muon_veto_active").bootstrapToggle(val);
      document.page_ready = true;
    }
  });

  // Remote mode TPC: unlink both other detectors, set TPC to IDLE
  $("#tpc_remote").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      if($("#tpc_remote").is(":checked")){
        $("#tpc_active").bootstrapToggle('off');
        $("#link_nv").bootstrapToggle('off');
        $("#link_mv").bootstrapToggle('off');
      }
      document.page_ready = true;
    }
  });
  // Remote mode MV: unlink MV if linked, set MV to IDLE
  $("#muon_veto_remote").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      if($("#muon_veto_remote").is(":checked")){
        $("#muon_veto_active").bootstrapToggle('off');
        $("#link_mv").bootstrapToggle('off');
      }
      document.page_ready = true;
    }
  });
  // Remote mode NV: unlink NV if linked, set NV to IDLE
  $("#neutron_veto_remote").change(function(){
    if(document.page_ready){
      document.page_ready = false;
      if($("#neutron_veto_remote").is(":checked")){
        $("#neutron_veto_active").bootstrapToggle('off');
        $("#link_nv").bootstrapToggle('off');
      }
      document.page_ready = true;
    }
  });
  $("#lz_remote").change(function(){
    if($("#remote_lz").is(":checked")){
      alert("Local control of LZ is only available from SURF");
      $("#remote_lz").bootstrapToggle('on');
    }
  });
  $("#lz_active").change(function(){
    if(document.page_ready){
      alert("You can't stop LZ");
      $("#lz_active").bootstrapToggle("on");
    }
    //return;
  });
  $("#lz_softstop").change(function(){
    if($("#lz_softstop").is(":checked")){
      alert("You want to go soft on LZ? I hope you aren't an AC");
      $("#lz_softstop").bootstrapToggle('off');
    }
  });
}

function PopulateOptionsLists(callback){
  $("#remote_lz").bootstrapToggle('on');
  $("#lz_softstop").bootstrapToggle('off');
  document.getElementById("lz_mode").innerHTML = "<option value='shit'><strong>xenon leak mode</strong></option><option value='goblind'><strong>HV spark mode</strong></option><option value='oops'><strong>find dark matter but it turns out not to be dark matter mode</strong></option><option value='n'><strong>Only measure neutrons because of all our teflon mode</strong></option><option value='blow'><strong>Lots of radon mode (note, this mode cannot be turned off)</strong></option><option value='whoops'>Don't drift electrons because all the teflon outgasses too much mode</option>";
  $.getJSON("control/modes", (data) => {
    if (typeof data.message != 'undefined') {
      console.log(data);
      return;
    }
    // [{_id: detector name, configs: []}, {_id: detector name....}]
    data.forEach(doc => $("#"+doc['_id']+"_mode").html(doc['configs'].reduce((html, val) => "<option value='"+val[0]+"'><strong>"+val[0]+":</strong> "+val[1]+"</option>", "")));
    callback();
  }
  /*for(var i in detectors){
    var detector = detectors[i];
    $.getJSON("control/modes?detector="+detector, (function(d){ return function(data){
      var html = "";
      for(var j=0; j<data.length; j+=1)
        html+="<option value='"+data[j][0]+"'><strong>"+data[j][0]+":</strong> "+data[j][1]+"</option>";
      var sdiv = d + "_mode";
      document.getElementById(sdiv).innerHTML = html;
      fetched+=1;
      if(fetched === 3){
        callback();
      }

    }}(detector)));*/
}

function PullServerData(callback){
  $.getJSON("control/get_control_docs", function(data){
    document.page_ready = false;
    data.forEach(doc => {
      var detector = doc['detector'];
      if(detector !== 'tpc' && detector !== 'muon_veto' && detector !== 'neutron_veto'){
        return;
      }
      initial_control[detector] = doc.state;
      ["stop_after", "comment"].forEach( (att) => $(`#${detector}_${att}`).val(doc.state[att]));

      $(`#${detector}_mode option`).filter(val => val === doc.state.mode).prop('selected', true);
      $(`#${detector}_user`).val(doc.user);

      ['active', 'remote', 'softstop'].forEach(att => $(`#${detector}_${att}`).bootstrapToggle(doc.state[att] == 'true' ? 'on' : 'off'));

      if(detector === "tpc"){
        ['link_mv', 'link_nv'].forEach(att => $("#" + att).bootstrapToggle(doc.state[att] == 'true' ? 'on' : 'off'));
      }
    });
    document.page_ready = true;
    callback;
  });
}

function PostServerData(){
  post = {};
  var empty = true;
  ['tpc', 'muon_veto', 'neutron_veto'].forEach(detector => {
    var thisdet = {};
    ['active', 'remote', 'softstop'].forEach( (att) => {
      var checked = $(`#${detector}_${att}`).is(":checked");
      if (checked != initial_control[detector][att])
        thisdet[att] = checked;
    });

    ["stop_after", "mode", "comment"].forEach( (att) => {
      var val = $(`#${detector}_${att}`).val();
      if (val != initial_control[detector][att])
        thisdet[att] = val;
    });

    if(detector === "tpc"){
      ['link_mv','link_nv'].forEach( (att) => {
      if ($("#" + att).is(":checked") != initial_control['tpc'][att])
        thisdet[att] = $("#"+att).is(":checked");
      });
    }
    console.log(thisdet);
    if (Object.items(thisdet).length == 0)
      return;
    thisdet['detector'] = detector;
    thisdet['user'] = document.current_user;
    post[detector] = thisdet;
    empty &= false;
  });

  if (!empty) {
    $.ajax({
      type: "POST",
      url: "control/set_control_docs",
      data: {"data": post},
      success: () => location.reload(),
      error: function(jqXHR, textStatus, errorThrown) {
        alert("Error, status = " + textStatus + ", " + "error thrown: " + errorThrown);
      }
    });
  }
}

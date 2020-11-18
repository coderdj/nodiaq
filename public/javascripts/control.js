function DefineButtonRules(){
    
    $("input").change(function(){if(document.page_ready==true){$("#confirm_div").fadeIn("fast"); $(".my_name_is").val(document.current_user);}});
    $("select").change(function(){if(document.page_ready==true){$("#confirm_div").fadeIn("fast"); $(".my_name_is").val(document.current_user);}});
    
    $("#tpc_active").change(function(){
	if(document.page_ready){
	    document.page_ready = false;
	    var val = 'off';

	    // First, fail in case "remote" mode enabled"
	    if(!$("#remote_tpc").is(":checked")){
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
	    if(!$("#remote_muon_veto").is(":checked")){
		alert("You cannot control the muon veto when it is in remote mode!");
		$("#muon_veto_active").bootstrapToggle('toggle');
		document.page_ready = true;
		return;
	    }
	    
	    var val = 'off';
	    if($("#muon_veto_active").is(":checked")) val = 'on';
	    if($("#link_mv").is(":checked")) {$("#tpc_active").bootstrapToggle(val);
					      if($("#link_nv").is(":checked")) $("#neutron_veto_active").bootstrapToggle(val); }
	    document.page_ready = true;
	}
    });
    $("#neutron_veto_active").change(function(){
	if(document.page_ready){
	    document.page_ready = false;

	    // First, fail in case "remote" mode enabled"
	    if(!$("#remote_neutron_veto").is(":checked")){
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
    $("#remote_tpc").change(function(){
	if(document.page_ready){
	    document.page_ready = false;
	    if(!$("#remote_tpc").is(":checked")){
		$("#tpc_active").bootstrapToggle('off');
		$("#link_nv").bootstrapToggle('off');
		$("#link_mv").bootstrapToggle('off');
	    }
	    document.page_ready = true;
	}
    });
    // Remote mode MV: unlink MV if linked, set MV to IDLE
    $("#remote_muon_veto").change(function(){
	if(document.page_ready){
	    document.page_ready = false;
	    if(!$("#remote_muon_veto").is(":checked")){
		$("#muon_veto_active").bootstrapToggle('off');
		$("#link_mv").bootstrapToggle('off');
	    }
	    document.page_ready = true;
	}
    });
    // Remote mode NV: unlink NV if linked, set NV to IDLE
    $("#remote_neutron_veto").change(function(){
	if(document.page_ready){
	    document.page_ready = false;
	    if(!$("#remote_neutron_veto").is(":checked")){
		$("#neutron_veto_active").bootstrapToggle('off');
		$("#link_nv").bootstrapToggle('off');
	    }
	    document.page_ready = true;
	}
    });
    $("#remote_lz").change(function(){
	if($("#remote_lz").is(":checked")){
	    alert("You can't stop LZ");
	    $("#remote_lz").bootstrapToggle('off');
	}
    });
    $("#lz_active").change(function(){
	if(document.page_ready){
	    document.page_ready = false;
	    alert("LZ is in 'remote' mode.");
	    $("#lz_active").bootstrapToggle("toggle");
	    document.page_ready = true;
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

function PopulateRunsList(callback){
    var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
    var fetched = 0;
    for(var i in detectors){
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

    	}}(detector)));
	$("#remote_lz").bootstrapToggle('off');
	$("#lz_softstop").bootstrapToggle('off');
	document.getElementById("lz_mode").innerHTML = "<option value='shit'><strong>xenon leak mode</strong></option><option value='goblind'><strong>HV spark mode</strong></option><option value='oops'><strong>find dark matter but it turns out not to be dark matter mode</strong></option><option value='n'><strong>Only measure neutrons because of all our teflon mode</strong></option><option value='blow'><strong>Lots of radon mode (note, this mode cannot be turned off)</strong></option>";
	
	}
}

function PullServerData(callback){
	$.getJSON("control/get_control_docs", function(data){
		var found = 0;
		for(var i in data){
			var doc = data[i];
			var detector = doc['detector'];
			if(detector !== 'tpc' && detector !== 'muon_veto' && detector !== 'neutron_veto'){
				continue;
			}
			found += 1;
		    var atts = ["stop_after", "mode", "comment"];
		    for(var j in atts){
			var att = atts[j];
			var divname = "#" + detector + "_" + att;
			if(att === 'mode'){
			    $(divname + " option").filter(function() {
    					return this.value === doc.state['mode']
  					}).prop('selected', true);
			}
			else
			    $(divname).val(doc.state[att]);
			}
            $("#"+detector+"_user").val(doc.user);
            if (doc.state['finish_run_on_stop'] == 'true')
                $("#" + detector + "_softstop").prop('selected', true);
            else
                $("#" + detector + "_softstop").prop('selected', false);

		    if(detector === "tpc"){
			if(doc.state['link_mv'] === 'true')
			    $("#link_mv").bootstrapToggle('on');
			else
			    $("#link_mv").bootstrapToggle('off');
			if(doc.state['link_nv'] === 'true')
			    $("#link_nv").bootstrapToggle('on');
			else
			    $("#link_nv").bootstrapToggle('off');
		    }

		    if(doc.state['remote'] == 'true')
			$("#remote_" + detector).bootstrapToggle('off');
		    else
			$("#remote_" + detector).bootstrapToggle('on');
		    if(doc.state['active'] === "true")
			$("#"+detector+"_active").bootstrapToggle('on');
		    else
			$("#"+detector+"_active").bootstrapToggle('off');
		}
		if(found !== 3)
			alert("Didn't find data for all detectors! Must be you have a clean slate.")
		document.page_ready = true;
		callback;
	});

}

function PostServerData(){
    var dets = ['tpc', 'muon_veto', 'neutron_veto'];
    post = {};
    var failed = false;
    for(var i in dets){
	    var detector = dets[i];
	    var thisdet = {"detector": detector};
	    thisdet['active'] = $("#"+detector+"_active").is(":checked");

	var atts = ["stop_after", "mode", "user", "comment"];
	    for(var j in atts){
		var att = atts[j];
		var divname = "#" + detector + "_" + att;
		thisdet[att] = $(divname).val();
		if(thisdet['active'] && thisdet[att] === null || typeof thisdet[att] === "undefined" && (att!=="comment" && att!=="stop_after")){
		    alert("You need to provide a value for "+att+" for the "+detector+", or disable that detector.");
		    failed = true;
		}
	    }
	thisdet['active'] = $("#"+detector+"_active").is(":checked");
	thisdet['remote'] = (!$("#remote_" + detector).is(":checked"));
	if(detector === "tpc"){
	    thisdet['link_mv'] = $("#link_mv").is(":checked");
	    thisdet['link_nv'] = $("#link_nv").is(":checked");
	}
        thisdet["finish_run_on_stop"] = $("#"+detector+"_softstop").is(":checked");
	post[detector] = thisdet;
    }

    if(!failed){
		$.ajax({
		    type: "POST",
	   		url: "control/set_control_docs",
	  		data: {"data": post},
	    	success: function(){
		   		location.reload();
		   	},
		   	error:   function(jqXHR, textStatus, errorThrown) {
			alert("Error, status = " + textStatus + ", " +
			   	  "error thrown: " + errorThrown
			 	);
		    }
		});
	}
}

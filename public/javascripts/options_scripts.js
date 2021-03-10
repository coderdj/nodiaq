function PopulateModeList(div){
    detectors = {'tpc': 'TPC', 'muon_veto': "Muon Veto", 'neutron_veto': "Neutron Veto", include: 'Subconfigs'};
    $.getJSON("options/options_list", function(data){
        $("#"+div).html(data.reduce((total, entry) => entry.modes.reduce((tot, mode) => tot + `<option value='${mode}'>${mode}</option>`, total + `<optgroup label='${detectors[entry["_id"]]}'>`), ""));
		$("#"+div).prop('disabled', false);
		$('#'+div).selectpicker();
		
    });
}

function FetchMode(select_div){
    mode = $('#'+select_div).val();
    $.getJSON('options/options_json?name='+mode,
	      function(data){
		  document.jsoneditor.set(data);
	      });
};

function SubmitMode(){
    try{JSON.parse(document.jsoneditor.get());}
    catch(error){alert(error);return}
    $.post("options/set_run_mode",
	   {"doc": (JSON.stringify(document.jsoneditor.get()))},
	   function(data){
	       try{JSON.parse(data);}
	       catch(error){alert(error);location.reload(true);}
	       if(typeof(data) !== "undefined" && "res" in JSON.parse(data))
		   alert(JSON.parse(data)['res']);
	       else
		   alert("Something strange has happened");
	   });
};

function RemoveMode(select_div){
    $.get("options/remove_run_mode?name="+$("#"+select_div).val(),
	  function(data, status){
	      try{JSON.parse(data);}
	      catch(error){location.reload(true);}
	      if(typeof(data) !== "undefined" && "res" in JSON.parse(data))
		  alert(JSON.parse(data)['res']);
	      else
		  alert("Something strange has happened");
	  });
}

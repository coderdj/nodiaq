const SCRIPT_VERSION = '20210407';

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
    try{JSON.parse(JSON.stringify(document.jsoneditor.get()));}
    catch(error){alert(error);return}
    $.post("options/set_run_mode",
	   {"doc": JSON.stringify(document.jsoneditor.get()), "version": SCRIPT_VERSION},
	   function(data){
             if (typeof data.res != 'undefined')
               alert(data.res);
             else
               location.reload();
	   });
};

function RemoveMode(select_div){
    $.get("options/remove_run_mode?name="+$("#"+select_div).val()"+&version="+SCRIPT_VERSION,
	   function(data){
             if (typeof data.res != 'undefined')
               alert(data.res);
             else
               location.reload();
	   });
}

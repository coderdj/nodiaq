// public/javascripts/options_scripts.js
var detectors = {};

function SetDetectors(detectors_, extra){
  detectors_.forEach(det => {detectors[det[0]] = det[1];});
  extra.forEach(det => {detectors[det[0]] = det[1];});
}

function PopulateModeList(div){
  $.getJSON("options/options_list", function(data){
    $("#"+div).html(data.reduce((total, entry) => {
      return entry.modes.reduce((tot, mode) => {
        return tot + `<option value='${mode}'>${mode}</option>`;
      }, total + `<optgroup label='${detectors[entry["_id"]]}'>`);
    }, ""));
    $("#"+div).prop('disabled', false);
    $('#'+div).selectpicker();
    /*var detectors = ['tpc', 'muon_veto', 'neutron_veto', 'include'];
    var detector_names = ["TPC", "Muon Veto", "Neutron Veto", 'Includes'];
    for(var j in detectors){
      var detector = detectors[j];
      html+="<optgroup label='"+detector_names[j]+"'>";
      if(typeof data[detector] === 'undefined')
        continue;
      for(var i=0; i<data[detector].length; i+=1)
        html+="<option value='"+data[detector][i]+"'>"+data[detector][i]+"</option>";
    }
    document.getElementById(div).innerHTML = html;
*/
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
  $.post("options/set_run_mode", {"doc": (JSON.stringify(document.jsoneditor.get()))}, (data) => {
    if (typeof data.res != 'undefined') alert(data.res);
  }, 'json');
};

function RemoveMode(select_div){
  $.get("options/remove_run_mode?name="+$("#"+select_div).val(), (data, status) => {
    if (typeof data.res != 'undefined') alert(data.res);
  }, 'json');
}

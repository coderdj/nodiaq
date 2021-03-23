// public/javascripts/options_scripts.js
var detectors = {};

function SetDetectors(detectors_, extra){
  detectors_.forEach(det => {detectors[det[0]] = det[1];});
  extra.forEach(det => {detectors[det[0]] = det[1];});
}

function PopulateModeList(div){
  $.getJSON("options/options_list", function(data){
    $("#"+div).html(data.reduce((total, entry) => entry.modes.reduce((tot, mode) => tot + `<option value='${mode}'>${mode}</option>`, total + `<optgroup label='${detectors[entry["_id"]]}'>`), ""));
    $("#"+div).prop('disabled', false);
    $('#'+div).selectpicker();
  });

function FetchMode(select_div){
  mode = $('#'+select_div).val();
  $.getJSON('options/options_json?name='+mode,
    function(data){
      document.jsoneditor.set(data);
    });
};

function SubmitMode() {
  var s = JSON.stringify(document.jsoneditor.get());
  try{
    JSON.parse(JSON.stringify(s));
  }catch(error){alert(error); return;}
  $.post("options/set_run_mode", {doc: s}, (data) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    location.reload();
  }, 'json');
}

function RemoveMode(select_div){
  $.get("options/remove_run_mode?name="+$("#"+select_div).val(), (data) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    location.reload();
  }, 'json');
}


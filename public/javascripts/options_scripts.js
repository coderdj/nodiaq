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

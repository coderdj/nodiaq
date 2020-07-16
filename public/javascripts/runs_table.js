function SearchTag(name){
    $("#mongoquery").val('{"tags.name": "' + name+ '"}');
    CheckMongoQuery();
}

function CheckMongoQuery(){
    var query = $("#mongoquery").val();
    if(query === "")
        query = "{}";
    try{JSON.parse(query);}
    catch(e){
        alert("Your mongo query is not valid JSON!");
        return;
    }
    document.datatable_options['ajax']['data'] ={"conditions": query, detector: document.detector};
    $(document.datatable_div).DataTable().destroy();
    $(document.datatable_div).DataTable(document.datatable_options);
}

function InitializeRunsTable(divname){

    $('#detectorselector label').on("click", function() {
        document.detector = this.childNodes[0].value;
        $(document.datatable_div).DataTable().destroy();
        $(document.datatable_div).DataTable(document.datatable_options);
    });

    document.detector = 'xenonnt';
    var table_options = {
        processing : true,
        serverSide : true,
        paging: true,
        order: [[1, "desc"]],
        iDisplayLength: 100,

        // Custom DOM settings to add date filters to datatable header
        dom: "<'row'<'col-sm-3'l><'col-sm-6 text-center'b><'col-sm-3'f>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-5'i><'col-sm-7'p>>",

        ajax : {
            url: 'runtable/getDatatable',
            beforeSend: function ( jqXHR,  settings) {
                //console.log(jqXHR);
            },
            data: function ( d ) {
                return $.extend( {}, d, {
                    "date_min": $('#datepicker_from').val(),
                    "date_max": $('#datepicker_to').val(),
                    "detector": document.detector
                });
            },
        },
        columns : [
                { data : "number", "render": function(data, type, row){
                    return "<button style='padding:3px;padding-left:5px;padding-right:5px;background-color:#ef476f;color:#eee' class='btn btn-defailt btn-xs' onclick='ShowDetail(" + data + ', "'+document.detector+'"'+");'>show</button>"}
                },
            { data : "number" , searchable: true},
            { data : "detectors", "render" : function(data, type, row)
              {return String(data);}},
            { data : "mode", searchable: true },
            { data : "data", searchable: false, "render" : DataStatusDisplay},
            { data : "user"},
            { data : "start", format: 'YYYY-MM-DD HH:mm', type: 'datetime'},
            { data : "end", defaultContent: "",
                "render": function(data, type, row){
                  if(typeof(row) === "undefined" || typeof(row.end) === "undefined" ||
                     typeof(row.start) === "undefined")
                      return "not set"
                  tdiff = (new Date(row.end)).getTime() - (new Date(row.start)).getTime();
                    var hours = Math.floor(tdiff/(1000*3600));
                    var mins = Math.floor(tdiff/(1000*60)) - (60*hours);
                    var secs = Math.floor(tdiff/(1000)) - (3600*hours + 60*mins);
                    var ret = ("00" + hours.toString()).substr(-2) + ":" +
                        ("00" + mins.toString()).substr(-2) + ":" +
                        ("00" + secs.toString()).substr(-2);
                    return ret;
              },
            },
            { data : "tags.name", "defaultContent": "",
              searchable: true,
              "render": function(data, type, row){
                  ret = "";
                  if(typeof(row) != "undefined" && typeof(row.tags) != "undefined"){
                      for(var i=0; i<row.tags.length; i+=1){
                          var divclass = "badge-secondary";
                          if(row.tags[i]["name"][0] == "_")
                              divclass = "badge-primary";
                          ret += "<div class='inline-block'><span class='badge " +
                              divclass + "' style='cursor:pointer' onclick='SearchTag("
                              + '"' + row.tags[i]['name'] +
                              '"' + ")'>" + row.tags[i]["name"] + "</span>";
                          //ret+=<row.tags[i]["name"];
                          //if(i!=row.tags.length-1)
                          //ret+=", ";
                      }
                  }
                  return ret;
              }
            },
            { data : "comments", "defaultContent": "",
              "render": function(data, type, row){
                  if(typeof(data) != "undefined" && data.length>0){
                      if(typeof data[data.length-1]["comment"] != "undefined")
                          return data[data.length-1]["comment"];
                      if(typeof data[data.length-1]["text"] != "undefined")
                          return data[data.length-1]["text"];
                      return "";}
              }}
        ],
        columnDefs: [
            { className: "not-selectable", width: 50, targets: [ 0 ] },
            { width: 60, targets: [1, 2]},
            {
                targets: [6],
                render: function(data){
                    return moment(data).format('YYYY-MM-DD HH:mm');
                }
            }
        ],
        fixedColumns: true
    };
    var table = $(divname).DataTable(table_options);
    document.table = table;
    document.datatable_options = table_options;
    document.datatable_div = divname;

    var filter_html = "<span class='date-label' id='date-label-from'> From: <input class='date_range_filter date' id='datepicker_from' type='date'></span><span class='date-label' id='date-label-to'> To: <input class='date_range_filter date' id='datepicker_to' type='date'></span>";

    $("#runs_table_wrapper .row .col-sm-6").html(filter_html);
    $('#datepicker_from').change(function() {
        table.ajax.reload();
    });
    $('#datepicker_to').change(function() {
        table.ajax.reload();
    });


    $(divname + ' tbody').on( 'click', 'td', function () {
            if(!$(this).hasClass("not-selectable")){
                $(this).parent().toggleClass('selected');
                $("#addtagrow").slideDown();
            }

        } );


    $('#add_comment_button').click( function () {
        var comment = $("#commentinput").val();
        if(typeof comment ==="undefined")
            console.log("No comment!");
        else{
            var runs = [];
            for(var i=0; i<table.rows('.selected')[0].length; i++)
                        runs.push(table.rows('.selected').data()[i]['number']);
                        $.ajax({
                            type: "POST",
                            url: "runsui/addcomment",
                            data: {"runs": runs, "comment": comment, "user": "web user"},
                            success: function(){ table.ajax.reload();},
                            error:   function(jqXHR, textStatus, errorThrown) {
                                alert("Error, status = " + textStatus + ", " +
                                      "error thrown: " + errorThrown
                             );
                            }
                        });
                }
        });

    $('#add_tag_button').click( function () {
        var tag = $("#taginput").val();
        if(typeof tag ==="undefined")
            console.log("No tag!")
        else{
            runs = [];
            for(var i=0; i<table.rows('.selected')[0].length; i++)
                runs.push(table.rows('.selected').data()[i]['number']);
            if(runs.length>0)
                $.ajax({
                    type: "POST",
                    url: "runsui/addtags",
                    data: {"runs": runs, "tag": tag, "user": "web user"},
                    success: function(){ table.ajax.reload();},
                    error:   function(jqXHR, textStatus, errorThrown) {
                        alert("Error, status = " + textStatus + ", " +
                              "error thrown: " + errorThrown
                             );
                    }
                });

        }

    });

    $('#add_tag_detail_button').click( function () {
        var tag = $("#newtag").val();
        if(typeof tag ==="undefined")
            console.log("No tag!")
        else{
                    var runs = [];
                        runs.push($("#detail_Number").html());
                    if(runs.length>0 && typeof runs[0] !== "undefined")
                                $.ajax({
                                    type: "POST",
                                    url: "runsui/addtags",
                                    data: {"runs": runs, "tag": tag, "user": "web user"},
                    success: function(){ $("#newtag").val(""); ShowDetail(runs[0])},
                    error:   function(jqXHR, textStatus, errorThrown) {
                        alert("Error, status = " + textStatus + ", " +
                              "error thrown: " + errorThrown
                             );
                    }
                });
        }

    });

    $('#add_comment_detail_button').click( function () {
        var comment = $("#newcomment").val();
        if(typeof comment ==="undefined")
            console.log("No comment!")
        else{
                    var runs = [];
                        runs.push($("#detail_Number").html());
                    if(runs.length>0 && typeof runs[0] !== "undefined")
                                $.ajax({
                                    type: "POST",
                                    url: "runsui/addcomment",
                                    data: {"runs": runs, "comment": comment, "user": "web user"},
                                    success: function(){ $("#newcomment").val(""); ShowDetail(runs[0])},
                                    error:   function(jqXHR, textStatus, errorThrown) {
                        alert("Error, status = " + textStatus + ", " +
                              "error thrown: " + errorThrown
                             );
                    }
                });
        }

    });
}

function DataStatusDisplay(data, type, row) {
  /* A brief description of how data is replicated:
   * All data starts UG, then gets replicated to datamanager
   * From here, raw_records goes to CNAF
   * records to OSG and CCIN2P3/Nikhef
   * !records to dali.
   * Once two replicas of a datatype exist, it's removed from the eb
   */
  var dtypes = ['raw_records', 'records', 'peaklets'];
  var hosts = [
    /eb[0-5]\.xenon\.local/,
    /LNGS_USERDISK/,
    /
  var ret = "";
  var del_data = row['deleted_data'];
  var ebs = /eb[0-5]\.xenon\.local/;
  var datamanager = /LNGS/;
  var nikhef = /(CCIN2P3)|(NIKHEF)/;
  var cnaf = /CNAF/;
  var uc = /UC/;

  var rr = data.filter(function(val){return val.type === 'raw_records';});
  var rr_d = del_data.filter(function(val){return val.type === 'raw_records';});
  var r = data.filter(function(val){return val.type === 'records';});
  var r_d = del_data.filter(function(val){return val.type === 'records';});
  var p = data.filter(function(val){return val.type === 'peaklets';});

  // first up, the UG copies
  // live data
  if (data.find(function(val){return val.type === 'live';}) != 'undefined') {
    // live data exists
    ret += '<i class="fas fa-check-circle statustip" style="color:#00ee00"><span class="statustext">Live data is live</span></i>';
  } else if (deleted_data.find(function(val){return val.type === 'live';}) != 'undefined') {
    // live data already deleted
    ret += '<i class="fas fa-times-circle statustip" style="color:#0000ee"><span class="statustext">Live data is deleted</span></i>';
  } else {
    // live unknown
    ret += '<i class="fas fa-question-circle statustip" style="color:#ee0000"><span class="statustext">Live data is unknown?</span></i>';
  }

  // raw records
  var ug = rr.find(function(val){return eb.test(val.host);});
  if (ug != 'undefined') {
    // raw records is UG
    ret += '<i class="fas fa-check-circle statustip" style="color:#00ee00"><span class="statustext">Raw records is live on eb' + ug.host.charAt(2) + '</span></i>';
  } else if (rr_d.find(function(val){return eb.test(val.host);}) != 'undefined') {
    // raw records UG copy is deleted
    ret += '<i class="fas fa-times-circle statustip" style="color:#0000ee"><span class="statustext">Raw records UG copy is deleted</span></i>';
  } else {
    ret += '<i class="fas fa-question-circle statustip" style="color:#ee0000"><span class="statustext">Raw records UG copy is unknown?</span></i>';
  }

  // records, UG copy
  ug = r.find(function(val){return eb.test(val.host);});
  if (ug != 'undefined') {
    // records is UG
    ret += '<i class="fas fa-check-circle statustip" style="color:#00ee00"><span class="statustext">Records is live on eb' + ug.host.charAt(2) + '</span></i>';
  } else if (r_d.find(function(val){return eb.test(val.host);}) != 'undefined') {
    // records UG copy is deleted
    ret += '<i class="fas fa-times-circle statustip" style="color:#0000ee"><span class="statustext">Records UG copy is deleted</span></i>';
  } else {
    ret += '<i class="fas fa-question-circle statustip" style="color:#ee0000"><span class="statustext">Records UG copy is unknown?</span></i>';
  }

  if (typeof row.end === 'undefined') // run hasn't finished yet, no rucio copies
    return ret;

  // higher-level stuff

  var rr_rucio = rr.filter(function(val){return val.host === 'rucio-catalogue';}).map(function(val){return val.location;});
  if ('LNGS_USERDISK' in rr_rucio) {
  }

  return ret;
}

function RemoveTag(run, user, tag){
    // Remove ALL tags with a given text string
    if(typeof run === 'undefined' || typeof user === 'undefined' || typeof tag === 'undefined')
        return;
    $.ajax({
        type: "POST",
        url: "runsui/removetag",
        data: {"run": run, "user": user, "tag": tag},
        success: function(){ ShowDetail(run); document.table.ajax.redraw();},
        error: function(jqXHR, textStatus, errorThrown){
            alert("Error, status = " +textStatus + ", " + "error thrown: " + errorThrown);
        }
    });
}

function ShowDetail(run, experiment){

    var querystring = "runsui/get_run_doc?run="+run;
    if(experiment=="xenon1t")
        querystring+="&experiment=xenon1t";
    $.getJSON(querystring, function(data){

        // Set base data
        document.getElementById("detail_Number").innerHTML = data['number'];
        if (experiment == 'xenon1t')
          $("#detail_Detectors").html(data['detector']);
        else
          $("#detail_Detectors").html(data['detectors'].toString());
        $("#detail_Start").html(moment(data['start']).format('YYYY-MM-DD HH:mm'));
        $("#detail_End").html(moment(data['end']).format('YYYY-MM-DD HH:mm'));
        $("#detail_User").html(data['user']);
        $("#detail_Mode").html(data['mode']);
        $("#detail_Source").html(data['source']);

        var tag_html = "";
        for(var i in data['tags']){
            var row = data['tags'][i];
            tag_html += "<tr><td>" + row['name'] + "</td><td>" + row['user'] + "</td><td>";
            tag_html += moment(row['date']).format("YYYY-MM-DD HH:mm") + "</td>";
            if(row['user'] === window['user']){
                tag_html += ("<td><button onclick='RemoveTag("+data['number']+", "+
                             '"'+row['user']+'"'+", "+'"'+row['name']+'"');
                tag_html += ")' class='btn btn-warning'>Remove tag</button></td></tr>";
            }
            else
                tag_html += "<td></td></tr>";
        }
        $("#detail_Tags").html(tag_html);
        var comment_html = "";
        for(var i in data['comments']){
            var row = data['comments'][i];
            comment_html += "<tr><td>" + row['user'] + "</td><td>";
            if(typeof row["comment"] != "undefined")
                comment_html += row['comment'];
            else
                comment_html += row["text"];
            comment_html += "</td><td>";
            comment_html += moment(row['date']).format("YYYY-MM-DD HH:mm") + "</td></tr>";
        }
        $("#detail_Comments").html(comment_html);

        // Locations
        var location_html = "";
        for(var i in data['data']){
            location_html+=("<table style='width:100%;border-bottom:1px solid #eee'>"+
                            "<tr><td>Type</td><td>"+
                            data['data'][i]['type']+"</td></tr><tr><td>Host</td><td>"+
                            data['data'][i]['host']+"</td></tr><tr><td>Path</td><td>"+
                            data['data'][i]['location']+"</td></tr></table>");
        }
        document.getElementById("location_div").innerHTML=location_html;
        $("#detail_JSON").JSONView(data, {"collapsed": true});
        $("#runsModal").modal();
    });

}

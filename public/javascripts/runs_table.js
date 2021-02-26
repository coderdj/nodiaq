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
  document.datatable_options['ajax']['data'] ={"conditions": query};
  $(document.datatable_div).DataTable().destroy();
  $(document.datatable_div).DataTable(document.datatable_options);
}

function InitializeRunsTable(divname){

  var table_options = {
    processing : true,
    serverSide : true,
    paging: true,
    scrollY: "80%",
    scrollCollapse: true,
    lengthChange: true,
    //responsive: true,

    order: [[1, "desc"]], // descending sort order
    pageLength:100,
    //iDisplayLength: 100,
    lengthMenu : [10, 25, 50, 100],

    // Custom DOM settings to add date filters to datatable header
    dom: "<'row'<'col-sm-3'l><'col-sm-6 text-center'b><'col-sm-3'f>>" +
    "<'row'<'col-sm-12'tr>>" +
    "<'row'<'col-sm-5'i><'col-sm-7'p>>", 

    ajax : {
      url: 'runtable/getDatatable',
      beforeSend: function ( jqXHR,  settings) {
        //console.log(jqXHR);
        //console.log(settings.url);
      },
      data: function ( d ) {
        return $.extend( {}, d, {
          "date_min": $('#datepicker_from').val(),
          "date_max": $('#datepicker_to').val(),
          "start" : d.start/d.length,
        });
      },
    },
    columns : [
      { data : "number", "render": function(data, type, row){
        return "<button style='padding:3px;padding-left:5px;padding-right:5px;background-color:#ef476f;color:#eee' class='btn btn-defailt btn-xs' onclick='ShowDetail(" + data + ");'>show</button>"}
      },
      { data : "number" , searchable: true},
      { data : "detectors", "render" : function(data, type, row)
        {return String(data);}},
      { data : "mode", searchable: true },
      { data : "bootstrax", searchable: false,
        "render": function(data, type, row){
          ret = "";
          if(typeof(data) != "undefined" && data.state != null && typeof data.host != 'undefined'){
            ret+=data["host"]+":"+data["state"];
          }
          return ret;
        }
      },
      { data : "user"},
      { data : "start", format: 'YYYY-MM-DD HH:mm', type: 'datetime'},
      { data : "end", defaultContent: "",
        "render": function(data, type, row){

          if(typeof(row) === "undefined" || typeof(row.end) === "undefined" ||
            typeof(row.start) === "undefined" || row.end == null)
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
        searchable: true, "render": function(data, type, row){
          var ret = "";
          if(typeof(row) != "undefined" && typeof(row.tags) != "undefined"){
            ret = row.tags.reduce((tot, tag) => {
              var divclass = "badge-" + (tag["name"][0] === "_" ? "primary" : "secondary");
              var html = `<div class='inline-block'><span class='badge ${divclass}' style='cursor:pointer' onclick='SearchTag("${tag.name}")'>${tag.name}</span></div>`;
              return tot + html;
            }, "");
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
          success: () => {$("#newtag").val(""); ShowDetail(runs[0]); table.ajax.reload();},
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
          data: {"runs": runs, "comment": comment},
          success: () => {$("#newcomment").val(""); ShowDetail(runs[0]); table.ajax.reload();},
          error:   function(jqXHR, textStatus, errorThrown) {
            alert("Error, status = " + textStatus + ", " +
              "error thrown: " + errorThrown
            );
          }
        });
    }

  });
}

function RemoveTag(run, user, tag){
  // Remove ALL tags with a given text string
  if(typeof run === 'undefined' || typeof user === 'undefined' || typeof tag === 'undefined')
    return;
  $.ajax({
    type: "POST",
    url: "runsui/removetag",
    data: {"run": run, "user": user, "tag": tag},
    success: function(){ ShowDetail(run); document.table.ajax.reload();},
    error: function(jqXHR, textStatus, errorThrown){
      alert("Error, status = " +textStatus + ", " + "error thrown: " + errorThrown);
    }
  });
}

function ShowDetail(run){
  $.getJSON("runsui/get_run_doc?run="+run, function(data){

    // Set base data
    $("#detail_Number").html(data['number']);
    $("#detail_Detectors").html(data['detectors'].toString());
    $("#detail_Start").html(moment(data['start']).format('YYYY-MM-DD HH:mm'));
    $("#detail_End").html(data.end == null ? "Not set" : moment(data['end']).format('YYYY-MM-DD HH:mm'));
    $("#detail_User").html(data['user']);
    $("#detail_Mode").html(data['mode']);
    $("#detail_Source").html(data['source']);

    // Tags, if any
    $("#detail_Tags").html(typeof data.tags == 'undefined' ? "" : data['tags'].reduce((total, tag) => {
      var row = `<tr><td>${tag.name}</td>`;
      row += `<td>${tag.user}</td>`;
      row += `<td>${moment(row.date).format("YYYY-MM-DD HH:mm")}</td>`;
      row += `<td><button onclick='RemoveTag("${data.number}", "${tag.user}", "${tag.name}")' class='btn btn-warning'>Remove tag</button></td></tr>`;
      return total + row;
    }, ""));

    $("#detail_Comments").html(typeof data.comments == 'undefined' ? "" : data['comments'].reduce((total, comment) => {
      var row = `<tr><td>${comment.user}</td>`;
      row += `<td>${comment.comment}</td>`;
      row += `<td>${moment(comment.date).format("YYYY-MM-DD HH:mm")}</td></tr>`;
      return total + row;
    }, ""));

    // Locations
    $("#location_div").html(data['data'].reduce((total, entry) => {
      var row = `<table style='width:100%;border-bottom:1px solid #eee'>`;
      row += `<tr><td>Type</td><td>${entry.type}</td></tr>`;
      row += `<tr><td>Host</td><td>${entry.host}</td></tr>`;
      row += `<tr><td>Location</td><td>${entry.location}</td></tr></table>`;
      return total + row;
    }, ""));
    $("#detail_JSON").JSONView(data, {"collapsed": true});
    $("#runsModal").modal();
  });

}


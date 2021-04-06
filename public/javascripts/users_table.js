// public/javascripts/users.js

function InitializeUsersTable(divname){
  var table = $(divname).DataTable({
    //processing : true,
    //serverSide : true,
    //paging: true,
    //responsive: true,
    lengthChange: true,
    //responsive: true,
    order: [[0, "asc"]],
    pageResize: true,
    //iDisplayLength: 25,
    ajax : {
      url: 'users/getDirectory',
      type: "POST",
    },
    columns : [
      { data : "last_name" , searchable: true},
      { data : "first_name", searchable: true },
      { data : "institute", searchable: true },
      { data : "position", searchable: true },
      { data : "start_date", format: 'MM.YYYY', type: 'datetime'},
      { data : "end_date", format: 'MM.YYYY', type: 'datetime',
        defaultContent: "<i>Not set</i>"},
      { data : "email" },
    ],
    columnDefs: [
      { title: "Last Name", "targets": 0},
      { title: "First Name", targets: 1},
      { title: "Institute", targets: 2},
      { title: "Position", targets: 3},
      { title: "Start", targets: 4},
      { title: "End", targets: 5},
      { title: "Email", targets: 6},
      {
        targets: [4, 5],
        render: function(data){
          if(typeof(data)=="undefined")
            return "";
          return moment(data).format('MM.YYYY');
        }
      }
    ],
    "createdRow": function( row, data, dataIndex){
      //console.log(data);
      if( data['end_date'] !==  "" && typeof data['end_date'] !== "undefined"){
        $(row).addClass('leaver_row');
      }
    }
  });

  $(divname + ' tbody').on( 'click', 'tr', function () {
    var html = "";
    var data = table.row(this).data();
    var fields = [ ["Postition: ", "position"],
      ["Percent XENON: ", "percent_xenon"], ["Start Date: ", "start_date"],
      ["End Date: ", "end_date"], ["Notes: ", "notes"],
      ["Email: ", "email"], ["Skype: ", "skype"], ["GitHub: ", "github"],
      ["Phone: ", "cell"], ["LNGS ID: ", "LNGS"]];
    for(var i in fields){
      html += "<tr><td><strong>"+fields[i][0]+"</strong></td><td style='padding-left:30px'>";
      if(typeof data[fields[i][1]] === "undefined")
        html+="";
      else if(fields[i][1] === 'start_date' || fields[i][1] === 'end_date'){
        html+=moment(data[fields[i][1]]).format("MMMM, YYYY");
      }
      else
        html+=data[fields[i][1]];
      html+="</td></tr>";
      if(typeof data['picture_url'] !== "undefined"){
        document.getElementById("ppic").innerHTML="<img src='"+data['picture_url']+
          "', style='width:100%;max-width:150px'/>";
      }
      else{
        document.getElementById("ppic").innerHTML = "";
      }
    }
    document.getElementById("headerName").innerHTML=data['first_name']
    " " + data['last_name'];
    document.getElementById("headerInstitute").innerHTML = data['institute'];
    document.getElementById("info_table").innerHTML=html;
    $("#user_id").val(data['_id']);
    $("#groups_div").html("");
    for(var i in data['groups']){
      AddGroupHTML(data['groups'][i]);
    }
    $("#detailModal").modal();
    console.log(table.row(this).data());

    //$(this).toggleClass('selected');
  } );
}

function AddGroupHTML(group){
    html = "<span id='badge_"+group+"' class='badge badge-secondary'>" + group + "</span>&nbsp;";
    $("#groups_div").append(html);
}

function AddGroup(){
  var user = $("#user_id").val();
  var group = $("#newgroupinput").val();
  if(group.indexOf(' ') >=0){
    alert("You can only add single-word groups, one at a time.");
    return;
  }

  $.ajax({
    type: "POST",
    url: "users/add_to_group",
    data: {"the_user": user, "the_group": group},
    success: function(data){
      if(data['res'] == 'success')
        AddGroupHTML(data['group']);
      else
        alert("Permissions returned: " + data['res']);
    },
    error:   function(jqXHR, textStatus, errorThrown) {
      alert("Error, status = " + textStatus + ", "
        "error thrown: " + errorThrown
      );
    }
  });
}

function RemoveGroup(){
  var user = $("#user_id").val();
  var group = $("#newgroupinput").val();
  if(group.indexOf(' ') >=0){
    alert("You can only add single-word groups, one at a time.");
    return;
  }

  $.ajax({
    type: "POST",
    url: "users/remove_from_group",
    data: {"the_user": user, "the_group": group},
    success: function(data){
      if(data['res'] == 'success')
        $("#badge_"+data['group']).remove();
      else
        alert("Permissions returned: "+data['res']);
    },
    error:   function(jqXHR, textStatus, errorThrown) {
      alert("Error, status = " + textStatus + ", "
        "error thrown: " + errorThrown
      );
    }
  });
}


function InitializeUsersTable(divname){
    var table = $(divname).DataTable({                                                                   
        //processing : true,
        //serverSide : true,        
        paging: true,
        //lengthChange: true,
	//responsive: true,
        order: [[0, "asc"]],
	pageResize: true,
        //iDisplayLength: 25,
        ajax : {
            url: '/users/getDirectory',
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
	]
    });
    
    $(divname + ' tbody').on( 'click', 'tr', function () {
	html = "";
	data = table.row(this).data();
	fields = [ ["Postition: ", "position"],
		   ["Percent XENON: ", "percent_xenon"], ["Start Date: ", "start_date"],
		   ["End Date: ", "end_date"], ["Notes: ", "notes"],
		   ["Email: ", "email"], ["Skype: ", "skype"], ["GitHub: ", "github"],
		   ["Phone: ", "phone"]];
	for(i in fields){
	    html += "<tr><td><strong>"+fields[i][0]+"</strong></td><td>";
	    if(typeof(data[fields[i][1]]) == "undefined")
		html+="";
	    else if(fields[i][1] == 'start_date' || fields[i][1] == 'end_date'){
		html+=moment(data[fields[i][1]]).format("MMMM, YYYY");
	    }
	    else
		html+=data[fields[i][1]];
	    html+="</td></tr>";
	}
	document.getElementById("headerName").innerHTML=data['first_name'] +
	    " " + data['last_name'];
	document.getElementById("headerInstitute").innerHTML = data['institute'];
	document.getElementById("info_table").innerHTML=html;
	$("#detailModal").modal();
	  console.log(table.row(this).data());
	//$(this).toggleClass('selected');
    } );
 

}

function FillAPIInfo(userdoc){
	if(typeof userdoc['api_key'] === 'undefined'){
		$("#request_api_button").show();
	}
	else{
		document.getElementById("api_key").innerHTML = userdoc['api_key'];
	}
}

function ReqXenonGroup(group){
    alert("This currently doesn't work, sorry :(");
    return;

    $.getJSON("account/request_github_access?group=" + group, function(data){
    });
}

// public/javascripts/hosts.js
var hosts = [];

function SetHosts() {
  $.getJSON('hosts/template_info', data => {
    hosts = data.hosts;
}

function UpdateMonitorPage(){
  hosts.forEach(host => {
    $.getJSON("hosts/get_host_status?host="+host, (data) => {
      // Set attributes
      var h = data.host;
      atts = [['cpu_percent', 'CPU %'], ['cpu_count', 'Num CPUs'],
        ['cpu_count_logical', 'Num cores']];
      atts.forEach(att => {
        if(typeof(data[att[0]])!="undefined")
          $('#'+h+"_"+att[0]).html(data[att[0]]);
        else
          $('#'+h+"_"+att[0]).html('-');
      });
      $('#'+h+"_mem_total").html((data['virtual_memory']['total']/1e9).toFixed(2) + " GB");
      $('#'+h+"_mem_used").html((data['virtual_memory']['percent']).toFixed(1)+"%");
      $('#'+h+"_swap").html((data['swap_memory']['percent']).toFixed(1) + "%");
      var html = "";
      html = Object.entries(data['disk']).reduce((total, disk) => {
        total += "<div class='col-12' style='font-size:14px'><strong>";
          total += disk[0] + "</strong></div>";
          total += "<div class='col-4' style='font-size:12px'><strong>Total: </strong></div>";
          total += "<div class='col-8' style='font-size:12px'>";
          total += (disk[1]['total']/1e9).toFixed(2) + " GB</div>";
          total += "<div class='col-4' style='font-size:12px'><strong>Used: </strong></div>";
          total += "<div class='col-8' style='font-size:12px'>";
          total += (disk[1]['percent']).toFixed(1) + "%</div>";
        }, html);
      $('#'+h+"_disk_row").html(html);

      // Update charts
      var timestamp = data['_id'].toString().substring(0,8);
      //var ts = new Date( parseInt( timestamp, 16 ) * 1000 );
      var ts = parseInt(timestamp, 16) * 1000;
      if(typeof(document.last_time_charts) != "undefined" &&
        data.host in document.last_time_charts &&
        !isNaN(ts) && document.last_time_charts[h] != ts){
        document.last_time_charts[data.host] = ts;
        UpdateHostOverview(ts, data);
      }
    }); // getJSON
  }); // hosts.forEach
}

function UpdateHostOverview(ts, data){
  var h = data.host;
  if(h in document.charts && document.charts[h] != null){
    for(i in document.charts[h].series){
      if(document.charts[h].series[i]['name'] == 'CPU%')
        document.charts[h].series[i].addPoint([ts, data['cpu_percent']], true, true);
      else if(document.charts[h].series[i]['name'] == "Memory%")
        document.charts[h].series[i].addPoint([ts, data['virtual_memory']['percent']], true, true);
      else if(document.charts[h].series[i]['name'] == "Swap%")
        document.charts[h].series[i].addPoint([ts, data['swap_memory']['percent']], true, true);
      else{
        var name = document.charts[h].series[i]['name'];
        var a = name.substring(6, name.length-1);
        document.charts[h].series[i].addPoint([ts, data['disk'][a]['percent']], true, true);
      }
    }
  }
}

function DrawMonitorCharts(){
  document.charts = {};
  document.last_time_charts = {};

  hosts.forEach(host => {
    $.getJSON("hosts/get_host_history?limit=1000&host="+host, data => {
      var h = host;

      var div = h + "_chart";
      document.last_time_charts[h] = data[0]['data'][data[0]['data'].length-1][0];
      document.charts[host] = Highcharts.chart(
        div, {
          chart: {
            zoomType: 'x',
          },
          credits: {
            enabled: false
          },
          title: {
            text: "",
          },
          xAxis: {
            type: "datetime",
          },
          yAxis: {
            title: {
              text: "%",
            },
            min: 0,
            max: 110
          },
          plotOptions:{
            series: {
              lineWidth: 1
            },
          },
          legend: {
            enabled: true,
            align: "right",
            layout: "vertical"
          },
          series: data
        }); // chart
    }); // getJSON
  }); // hosts.forEach
}

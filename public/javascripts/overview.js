var prefix = '';

function PopulateShifters(shift_div){
  var shifter_template = '<div class="row" style="margin-top:10px;"><div style="background-color:#e5e5e5;color:#555;margin-left:5px;margin-right:5px;width:100%;"><strong style="padding-left:10px">{{shift_type}}</strong></div><div class="col-12">{{shifter_name}}</div><div class="col-12"><i class="fa fa-envelope"></i>&nbsp;{{shifter_email}}</div><div class="col-12"><i class="fa fa-phone"></i>&nbsp;{{shifter_phone}}</div><div class="col-12"><i class="fab fa-skype"></i>&nbsp;{{shifter_skype}}</div><div class="col-12"><i class="fab fa-github"></i>&nbsp;{{shifter_github}}</div></div>';
  var blank_shifts = {"shifter_name": "Nobody",
        "shifter_email": "d.trump@whitehouse.gov",
        "shifter_phone": "867-5309",
        "shifter_skype": "",
        "shifter_github": "mklinton",
        "shift_type": "Expert shifter"
      };

  $.getJSON(prefix+"/get_current_shifters", function(data){
    var html = data.reduce((total, entry) => {
      return total + Mustache.render(shifter_template, entry.shifter != 'none' ? entry : blank_shifts);
    }, "");
    if(html != "")
      $('#'+shift_div).html(html);
  });
}

function DrawPie(pie_div, ndays){

  $.getJSON(prefix+"/runsui/runsfractions?days="+ndays, function(data){

    if(typeof(document.piechart) != 'undefined')
      document.piechart.destroy;
    var series = data.map(entry => ({name: entry._id, y: entry.runtime}));
    var tot = data.reduce((total, entry) => total + entry.runtime, 0);
    series.push({"name" : "idle", "y" : 1.0-tot});
    document.piechart = Highcharts.chart(pie_div, {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
      },
      credits: {enabled: false},
      title: {text: null},
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.2f}%</b>'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.2f} %',
            style: {
              color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
            }
          }
        }
      },
      series: [{
        name: 'Modes',
        colorByPoint: true,
        data: series,
      }]
    }); // Highcharts.chart
  }); // getJSON
}


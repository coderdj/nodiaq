// public/javascripts/monitor.js
var max_pmt_id = 0;
var results_empty={};
var global_json;
var global_pmt_rates;
var global_timestamps_txt;

var timestamps      = [];
var timestamps_txt  = [];
var timestamp_current = -1;
var timestamp_playback = -1;

var id_live_interval;
var id_playback_interval;
var int_playback_waittime = 300;

var no_data_counter = 0;
var max_data_misses = 10;

var array_toggled_pmts = [];

var pmt_rate_unit = " kB/s";
var pmt_rate_unit_total = " MB/s";
var pmt_default_style;


// min/max for legend
var pmt_min_rate = 1;
var pmt_max_rate = 3501;
var pmt_diff_base = 10;
var pmt_diff;

var global_tmp;

var json_color_scheme = {}
var list_color_scheme_limits = []

// min/max of actual rates
var pmt_rate_min = Infinity;
var pmt_rate_max = 0;
var pmt_rate_sum = 0;


var json_pmt_id_to_reader = {};
var list_all_links = [];
var dict_all_rates = {}

// wheter the color scale is logarithmic
var scale_log = true;

// all names of valid views
var all_names =  ["array", "array_HE", "vme", "off", "amp", "opt"];

//var global_colors_available = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "greenyellow", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategrey", "lightsteelblue", "lightyellow", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"];
var global_colors_available = ["#b00000", "#00b000", "#0000b0", "#b0b000", "#b000b0", "#00b0b0", "#b0b0b0"];
var global_colors_use = [];

function min_legend_set(){
    new_value = parseFloat(window.prompt("new lower bound in kB/s (current: " + pmt_min_rate + " kB/s)", pmt_min_rate));
    if(new_value > 0){
        update_color_scheme(min = new_value);
    }
}

function max_legend_set(){
    new_value = parseFloat(window.prompt("new upper bound in kB/s (current: " + pmt_max_rate + " kB/s)", pmt_max_rate));
    if(new_value > 0){
        update_color_scheme(min = pmt_min_rate, max = new_value);
    }
}







function get_color_from_color_scheme(value){
    // json_color_scheme
    // list_color_scheme_limits
    value_percent = color_scheme(value)*100
    //console.log("value_percent: " + value_percent)
    
    if(value_percent <= list_color_scheme_limits[0]){
        return(json_color_scheme[list_color_scheme_limits[0]])
    } else if(value_percent >= list_color_scheme_limits[list_color_scheme_limits.length-1]){
        return(json_color_scheme[list_color_scheme_limits[list_color_scheme_limits.length-1]])
    } else {
        
        for(limit_id in list_color_scheme_limits){
            limit_value = list_color_scheme_limits[limit_id]
            
            if(value_percent <= limit_value){
                
                limit_low  = list_color_scheme_limits[limit_id-1]
                limit_high = list_color_scheme_limits[limit_id]
                
                color_low  = json_color_scheme[limit_low]
                color_high = json_color_scheme[limit_high]
                
                color_value = ""
                
                color_ratio_high = (value_percent - limit_low) / (limit_high-limit_low)
                color_ratio_low  = 1 - color_ratio_high
                
                color_out = [0, 0, 0]
                for(i in [0, 1, 2]){
                    color_out[i] = color_ratio_low * color_low[i] + color_ratio_high * color_high[i]
                }
                
                //console.log("limit_value: " + limit_value)
                //console.log("color_low:   " + color_low)
                //console.log("color_high:  " + color_high)
                
                //console.log("color_out:   " + color_out)
                
                return(color_out)
                break
            }
        }
        
    }
    
}









function update_color_scheme(min=pmt_min_rate, max=pmt_max_rate){
    pmt_min_rate = min;
    pmt_max_rate = max;
    pmt_diff = Math.log(pmt_max_rate/pmt_min_rate)/Math.log(pmt_diff_base);
    
    
    
    //console.log("updating color scheme:"+
        //"\n  min: "  + pmt_min_rate +
        //"\n  max: "  + pmt_max_rate + 
        //"\n\nusage: update_color_scheme(min=16, max=1600, base=10)"
    //);
    
    var pmt_rate_100 = color_scheme_inverse(1.00).toFixed(2);
    var pmt_rate_075 = color_scheme_inverse(0.75).toFixed(2);
    var pmt_rate_050 = color_scheme_inverse(0.50).toFixed(2);
    var pmt_rate_025 = color_scheme_inverse(0.25).toFixed(2);
    var pmt_rate_000 = color_scheme_inverse(0.00).toFixed(2);
    
    
    svgObject1.getElementById("str_legend_100").textContent = pmt_rate_100;
    svgObject1.getElementById("str_legend_075").textContent = pmt_rate_075;
    svgObject1.getElementById("str_legend_050").textContent = pmt_rate_050;
    svgObject1.getElementById("str_legend_025").textContent = pmt_rate_025;
    svgObject1.getElementById("str_legend_000").textContent = pmt_rate_000;
    
    
    if(global_pmt_rates != undefined){
        PMT_setcolour(global_pmt_rates)
    }
    color_pmts()
}


function get_human_date(int_unix){
    date_ts = new Date(int_unix * 1000);
    return(
        date_ts.getDate() + "." + zeroPad(date_ts.getMonth()+1,2) + "." + date_ts.getFullYear() + " " + date_ts.getHours() + ":" + zeroPad(date_ts.getMinutes(), 2) + ":" + zeroPad(date_ts.getSeconds(), 2)
    )
}


// svg documents
var svgObject1  = false//document.getElementById('svg_frame1').contentDocument;
var svgObject2  = false//document.getElementById('svg_frame2').contentDocument;



function set_limits(){
  var now = Math.floor(new Date().getTime()/1000);
  var dt = 3*24*3600; // only 3 days of stored data
  $("#field_history_start").val(now-dt);
  $("#field_history_end").val(now);
}

// convert datarate into percentage value
function color_scheme(x){
    if(x < pmt_min_rate){
        return(0)
    } else if(x > pmt_max_rate){
        return(1)
    } else {
        if(document.getElementById("legend_color_scale_log").checked){
            return(Math.log(x/pmt_min_rate)/Math.log(pmt_diff_base)/pmt_diff)
        } else{
            return((x - pmt_min_rate)/(pmt_max_rate - pmt_min_rate))
        }
    }
}

// convert percentate to datarate
function color_scheme_inverse(x){
    if(document.getElementById("legend_color_scale_log").checked){
        return(pmt_min_rate*pmt_diff_base**(pmt_diff*x));
    } else{
        return(pmt_min_rate + (pmt_max_rate - pmt_min_rate)*x)
    }
    
}

function whiten_all_pmts(){
    
    for(var i = 0; i <= max_pmt_id; i = i + 1){
            var pmt_string = "pmt"+i;
            
            var obj_pmt = svgObject1.getElementById(pmt_string);
            obj_pmt.style.fill = "white";
            
    }
}




const zeroPad = (num, places) => String(num).padStart(places, '0')

function initialize_pmts(){
    //console.log("initializing pmts")
    
    if(svgObject1 == false){
        svgObject1 = document.getElementById('svg_frame1').contentDocument;
        svgObject2  = document.getElementById('svg_frame2').contentDocument;
    }
    
    var pmt_count_last = svgObject1.querySelectorAll("circle.pmt").length;
    var id_initialize_interval;
    
    // initialize legend, eg. make min and max clickable 
    
    var obj_legend_min = svgObject1.getElementById("str_legend_000");
    var obj_legend_max = svgObject1.getElementById("str_legend_100");
    obj_legend_min.addEventListener("click", function(){min_legend_set()});
    obj_legend_max.addEventListener("click", function(){max_legend_set()});
    
    
    // function that gets called once all pmts are counted
    function pmt_add_event(){
        
        // perform this after all pmts are laoded 
        json_pmt_id_to_reader = JSON.parse(svgObject1.getElementById("map_pmt_id_to_link").getAttribute("property"))
        list_all_links = JSON.parse(svgObject1.getElementById("list_all_links").getAttribute("property"))
        json_color_scheme = JSON.parse(svgObject1.getElementById("dict_color_scheme").getAttribute("property"))
        
        for(percentage in json_color_scheme){
            list_color_scheme_limits.push(parseFloat(percentage))
        }
        
        for(var i = 0; i <= max_pmt_id; i = i + 1){
            var pmt_string = "pmt"+i;
            
            var obj_pmt = svgObject1.getElementById(pmt_string);
            
            
            obj_pmt.addEventListener("click", function(){toggle_pmt(this.getAttribute("class"))});
            obj_pmt.style.fill = "white";
            
        }
        move_all_pmt_pos('array')
        //console.log("pmts initialized: " + pmt_count_last);
        pmt_default_style = obj_pmt.style;
        update_color_scheme();
    }
    

    id_initialize_interval = window.setInterval(
        function(){
            
            var pmt_count_now = svgObject1.querySelectorAll("circle.pmt").length;
            //console.log("counting " + pmt_count_now + "pmts");
            
            if(pmt_count_now == pmt_count_last){
                clearInterval(id_initialize_interval);
                max_pmt_id = pmt_count_last - 1;
                
                for(var i = 0; i < pmt_count_last; i += 1){
                    results_empty[i] = -1;
                }
                
                pmt_add_event();
                set_limits();
                start_live_interval();
            } else {
                pmt_count_last = pmt_count_now;
            }
            
        },
        100
    );

    
}
function move_all_pmt_pos(name = "array"){
    
    
    
    for(var i = 0; i < all_names.length; i += 1){
        
        var name_dostuff = all_names[i]
        var elements_dostuff = svgObject1.getElementsByClassName(name_dostuff);
        
        if(name_dostuff == name){
            // is hidden?
            var style = "visible";
        } else {
            // is hidden?
            var style = "hidden";
            
        }
        for(var j = 0; j < elements_dostuff.length; j +=1 ){
            elements_dostuff[j].style.visibility = style;
        }
        
    }
    
    
    
    for(var int_pmt_id = 0; int_pmt_id <= max_pmt_id; int_pmt_id += 1){
        
        var obj_pmt     = svgObject1.getElementById("pmt"+int_pmt_id);
        var obj_txt_pmt = svgObject1.getElementById("txt_pmt"+int_pmt_id);
        
        var str_pmt_pos = obj_pmt.className.baseVal.match(/posstart(.*)posend/)[1];
        
        var json_pmt_pos = JSON.parse(str_pmt_pos)[name];
        
        obj_pmt.setAttribute("cx", json_pmt_pos["x"]);
        obj_pmt.setAttribute("cy", json_pmt_pos["y"]);
        obj_pmt.setAttribute("r", json_pmt_pos["r"]);
        
        if(json_pmt_pos["r"] < 3){
            obj_txt_pmt.setAttribute("x", -100);
            obj_txt_pmt.setAttribute("y", -100);
        } else {
            obj_txt_pmt.setAttribute("x", json_pmt_pos["x"]);
            obj_txt_pmt.setAttribute("y", json_pmt_pos["y"]);
        }
    }
}


var global_link_rates = {}
var global_pmt_rates = {}


function PMT_setcolour(json_result, timestamp){
    var t_sorting_start = Date.now()
    
    
    var got_updates = false;
    var pmt_rates = results_empty;
    
    timestamps = [];
    
    var link_rates = {}
    for(link in list_all_links){
        link_rates[list_all_links[link]] = 0;
    }
        
    
    
    var str_link = ""
            
    
    for(var i  = 0; i < json_result.length; i += 1){
        var tmp = json_result[i]["channels"];
        var date_ts = parseInt("0x"+json_result[i]["lastid"].substring(0,8));
        
        
        timestamps[i]       = parseInt("0x"+json_result[i]["lastid"].substring(0,8));
        timestamps_txt[i]   = json_result[i]["_id"].substring(0,7) + ": " + get_human_date(date_ts);
        
        
        if( tmp == null || Object.keys(tmp).length > 0){
            got_updates = true;
            
            
            for(var key in tmp){
                if(key <= max_pmt_id){
                    pmt_rates[key]= tmp[key];
                    
                    link_rates[json_pmt_id_to_reader[key]] += tmp[key]/1000
                    
                }
            }
            
            
        }
    }
    
    
    global_timestamps_txt = timestamps_txt
    global_pmt_rates = pmt_rates
    global_json = json_result;
    global_tmp = tmp;
    global_link_rates = link_rates
    
    
    if(got_updates == false){
        no_data_counter += 1;
        if(no_data_counter >= max_data_misses){
            console.log("stopping auto load");
            stop_intervals();
        }
        var t_sorting_duration = Date.now() - t_sorting_start
        return([false, t_sorting_duration, false]);
    }else if(no_data_counter > 0){
        //console.log("data found, resetting counter")
        no_data_counter = 0
    }
    
    if(timestamp == false){
        timestamps_txt.sort();
        timestamp_current = timestamps.sort(function(a, b){return b-a})[0];
        document.getElementById("field_current_timestamp").value = timestamp_current;
    }
    
    
    // set datarates per link
    
    for(str_link in link_rates){
        svgObject1.getElementById("rate_opt_txt_"+str_link).textContent = link_rates[str_link].toFixed(2)
        
        if(link_rates[str_link] > 70){
            svgObject1.getElementById("rate_opt_circ_"+str_link).style.fill = "rgb( 189,  33,  48)"
        } else if(link_rates[str_link] > 60){
            svgObject1.getElementById("rate_opt_circ_"+str_link).style.fill = "rgb( 211, 158,   0)"
        } else {
            svgObject1.getElementById("rate_opt_circ_"+str_link).style.fill = "none"
        }
    }
    
    
    
    
    pmt_rate_min = Infinity;
    pmt_rate_max = 0;
    pmt_rate_sum = 0;
    
    for (var i of Object.keys(pmt_rates)) {
        if(i > max_pmt_id){
            break;
        }
        
        pmt_rate = pmt_rates[i];
        
        // check if new value is larger or smaller thatn old ones
        if(pmt_rate > 0 ){
            if(pmt_rate < pmt_rate_min){
                pmt_rate_min = pmt_rate
            }
            if(pmt_rate > pmt_rate_max){
                pmt_rate_max = pmt_rate
            }
        }
        dict_all_rates[i] = pmt_rate
        
        
    }
    
    
    if(document.getElementById("legend_auto_set").checked){
        update_color_scheme(min=pmt_rate_min, max=pmt_rate_max)
    }
    var t_sorting_duration = Date.now() - t_sorting_start
    
    //    reset the total rate
    pmt_rate_sum = 0;
    var t_coloring_start = Date.now()
    color_pmts()
    var t_coloring_duration = Date.now() - t_coloring_start
    
    var pmt_rate_min = "min: " + (pmt_rate_min).toFixed(2) + pmt_rate_unit;
    var pmt_rate_max = "max: " + (pmt_rate_max).toFixed(2) + pmt_rate_unit;
    var pmt_rate_tot = "total: " + (pmt_rate_sum/1000).toFixed(2) + pmt_rate_unit_total;
    
    svgObject1.getElementById("str_legend_min").textContent = pmt_rate_min;
    svgObject1.getElementById("str_legend_max").textContent = pmt_rate_max;
    svgObject1.getElementById("str_legend_tot").textContent = pmt_rate_tot;
    
    
    
    
    timestamps_txt.sort()

    svgObject1.getElementById("str_reader_time_1").textContent = timestamps_txt[0];
    svgObject1.getElementById("str_reader_time_2").textContent = timestamps_txt[1];
    svgObject1.getElementById("str_reader_time_3").textContent = timestamps_txt[2];
    svgObject1.getElementById("str_reader_time_4").textContent = timestamps_txt[3];
    
    return([true, t_sorting_duration, t_coloring_duration]);
};





function color_pmts(){
    for (var i of Object.keys(dict_all_rates)){
        
        pmt_id = "pmt" + i;
        pmt_txt2_id  = "txt_pmt_2_" + i;
        
        pmt_rate = dict_all_rates[i]
        
        var svg  = svgObject1.getElementById(pmt_id);
        var svg2 = svgObject1.getElementById(pmt_txt2_id);
        
        
        if(pmt_rate >= 0){
            pmt_rate_txt = pmt_rate + pmt_rate_unit;
            pmt_color_this = get_color_from_color_scheme(pmt_rate)
            var rgb_r = pmt_color_this[0]
            var rgb_g = pmt_color_this[1]
            var rgb_b = pmt_color_this[2]
            
            pmt_rate_sum = pmt_rate_sum + pmt_rate;
            
        } else {
            pmt_rate_txt = "no data";
            var rgb_r = 188;
            var rgb_g = 188;
            var rgb_b = 188;
        }
        
        
        var rgb_string = "rgb(" + rgb_r + ", " + rgb_g + ", " + rgb_b + ")"
        //console.log("pmt" + i + ": " + rgb_string)
        
        svg.style.fill = rgb_string;
        svg2.innerHTML = "rate: " + pmt_rate_txt;
    }
}



function stop_intervals(){
    clearInterval(id_live_interval);
    clearInterval(id_playback_interval);
}


function start_live_interval(){
    id_live_interval = window.setInterval(
        function(){
            get_TPC_data();
        },
        1000
    );
};


function get_TPC_data(timestamp = false) {
    var t_tpcdata_start = Date.now();
    var t_all_start = t_tpcdata_start
    var unixtimestamp = "";
    
    if(timestamp != false){
        timestamp_current = parseInt(timestamp);
        unixtimestamp = "?unixtime=" + timestamp;
        document.getElementById("field_current_timestamp").value = timestamp_current;
    
    }
    
    var result;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var t_tpcdata_duration = Date.now() - t_tpcdata_start
            
            
            result = JSON.parse(this.responseText);
            global_pmt_rates = result;
            
            // coloring pmts
            
            setcolor_return = PMT_setcolour(result, timestamp);
            
            t_sorting_duration  = setcolor_return[1]
            t_coloring_duration = setcolor_return[2]
            
            
            
            var t_all_duration  = Date.now() - t_all_start
            
            
            str_message = "\n"
            
            
            if(setcolor_return[0] != false){
                str_message += "updated pmts "
            } else {
                str_message += "database returned no data "
            }
            if(timestamp != false){
                    str_message += "for timestamp " + timestamp + " ";
            } 
            
            // timings to plot 
            // t_all_duration
            // t_tpcdata_duration
            
            /*console.log(str_message + "\n" +
                "db:" + t_tpcdata_duration + ", " +
                "srt:" + t_sorting_duration + ", " +
                "col:" + t_coloring_duration + ", " +
                "all:" + t_all_duration
            )*/
        }
    };
    
    str_url = "/monitor/get_updates"+unixtimestamp;
    xmlhttp.open("GET", str_url, true);
    xmlhttp.send();
    
}




function toggle_pmt(pmt_id){
    pmt_id = pmt_id.split(" ")[0].substring(3)
    
    var obj_pmt = svgObject1.getElementById("pmt"+pmt_id);
    
    var fill_color = obj_pmt.style.fill;
    
    if(array_toggled_pmts.includes(pmt_id, 0)){
        //console.log("toggled off: " + pmt_id)
        index_pmt = array_toggled_pmts.indexOf(pmt_id)
        
        var dump = array_toggled_pmts.splice( index_pmt, 1 );
        var dump_color = global_colors_use.splice( index_pmt, 1 );
        
        
        global_colors_available.push(dump_color[0]);
        obj_pmt.setAttribute("style", pmt_default_style);
        obj_pmt.setAttribute("style", "fill:white;");
        
    } else {
        //console.log("toggled on: " + pmt_id)
        array_toggled_pmts.push(pmt_id);
    

        var color_id = Math.round(Math.random()*global_colors_available.length)-1;
        var color = global_colors_available.splice(color_id,1)[0]
        
        obj_pmt.setAttribute("style", "fill:"+fill_color+";stroke:"+color+";stroke-width:1;");
        global_colors_use.push(color)
        
    }
    
    //console.log(array_toggled_pmts);
    //console.log(global_colors_use);
    
}


function jump_time(dt){
    
    stop_intervals();
    if(dt == "tf"){
        var unixtimestamp = document.getElementById("field_current_timestamp").value
    } else {
        var unixtimestamp = timestamp_current + dt;
    }
    //console.log("dt:" + dt + "\nnew_timestamp:" + unixtimestamp);
    
    get_TPC_data(unixtimestamp);
}

function pseudo_live(){
    stop_intervals();
    console.log("int_playback_waittime = "+ int_playback_waittime+ ";")
    timestamp_playback = document.getElementById("field_current_timestamp").value - 1;
    id_playback_interval = window.setInterval(
        function(){
            timestamp_playback += 1
            get_TPC_data(timestamp_playback);
        },
        int_playback_waittime
    );
}










function history_draw(){
  if(array_toggled_pmts.length == 0){
    var pmts = false;
    alert("please select desired channels by clicking on them in the channel view.");
    return;
  } else {
    var pmts = array_toggled_pmts.join(",");
  }


  pmt_list = {};
  for(var i = 0; i < array_toggled_pmts.length; i += 1){
    var pmt_string = array_toggled_pmts[i].toString();
    pmt_list[pmt_string] = [];
  }
  var time_list = [];

  var x_steps = 4;
  var x0 = parseFloat(svgObject2.getElementById("str_x_000").getAttribute("x"));
  var x1 = parseFloat(svgObject2.getElementById("str_x_100").getAttribute("x"));
  var y0 = parseFloat(svgObject2.getElementById("str_y_000").getAttribute("y"));
  var y1 = parseFloat(svgObject2.getElementById("str_y_100").getAttribute("y"));
  var dx_ = x1 - x0;
  var dy_ = y1 - y0;


  function dx(){
    return(max_time - min_time);
  }

  function dy(){
    return(max_rate - min_rate);
  }

  function x(value_x){
    return(
      x0 + (value_x * dx_ / dx())
    )
  }
  function y(value_y){
    return(
      y0 + (value_y * dy_ / dy())
    )
  }
  var t0  = 0
  var min_time = Infinity;
  var max_time = 0;
  var min_rate = 0;//Infinity;
  var max_rate = 0;

  // prepare data
  function prepare_data(){
    for (var i = 0; i < result.length; i += 1){
      step = result[i]
      var time_this = step["_id"];
      time_list[i] = time_this;

      if(time_this > max_time){
        max_time = time_this;
      }
      if(time_this < min_time){
        min_time = time_this;
      }

      for(var j = 0; j < array_toggled_pmts.length; j += 1){
        var pmt_string = array_toggled_pmts[j].toString();
        var rate_this = step["channels"][pmt_string];
        pmt_list[pmt_string][i] = rate_this;

        if(rate_this > max_rate){
          max_rate = rate_this;
        }
        //if(rate_this < min_rate){
        //min_rate = rate_this;
        //}
      }
    }
    t0 = min_time;
    min_time = 0;
    max_time -= t0;

    for (var i = 0; i < result.length; i += 1){
      time_list[i] -= t0;
    }

    console.log(
      "min_time:\t"+ min_time +"\n"+
      "max_time:\t"+ max_time +"\n"+
      "dif_time:\t"+ dx() +"\n"+
      "min_rate:\t"+ min_rate +"\n"+
      "max_rate:\t"+ max_rate +"\n"+
      "dif_rate:\t"+ dy() +"\n"+
      ""
    )
  }

  // prepare axis




  function history_prepare_axis(){
    // time field
    svgObject2.getElementById("time_id").textContent = "start: " + get_human_date(t0);

    // y axis
    svgObject2.getElementById("str_y_100").textContent = max_rate + pmt_rate_unit;
    svgObject2.getElementById("str_y_050").textContent = min_rate + dy()*.5 + pmt_rate_unit;
    svgObject2.getElementById("str_y_000").textContent = min_rate + pmt_rate_unit;

    // x axis
    svgObject2.getElementById("str_x_000").textContent = min_time + " s"
    svgObject2.getElementById("str_x_025").textContent = min_time + dx()*.25 + " s"
    svgObject2.getElementById("str_x_050").textContent = min_time + dx()*.50 + " s"
    svgObject2.getElementById("str_x_075").textContent = min_time + dx()*.75 + " s"
    svgObject2.getElementById("str_x_100").textContent = max_time + " s"

  }
  function remove_old_rates(){
    svgObject2.getElementById("time_id").textContent = "";
    while(true){
      var datalines_existing = svgObject2.getElementsByClassName("dataline");
      var n_datalines_existing = datalines_existing.length;
      if(n_datalines_existing > 0){
        for(var i = 0; i < datalines_existing.length; i += 1){
          datalines_existing[i].remove();
        }
      } else {
        break;
      }
    }
  }

  function history_draw_pmts(){
    for(var i = 0; i < array_toggled_pmts.length; i += 1){
      var color_this = global_colors_use[i];
      var str_points = ""



      var pmt_id = array_toggled_pmts[i];
      var y_data = pmt_list[pmt_id];

      for(var j = 0; j < y_data.length; j += 1){
        y_point = y_data[j];

        if(y_point != undefined){
          str_points += ""+x(time_list[j])+", "+ y(y_point)+ " ";
        }
      }

      var group_this = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group_this.setAttribute("class", "dataline")

      var text_this = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text_this.setAttribute("class", "dataline");
      text_this.setAttribute("style", "fill:"+color_this+";font-size:.75em;text-anchor:end;");
      text_this.setAttribute("x", parseFloat(svgObject2.getElementById("pmtlabel").getAttribute("x")));
      text_this.setAttribute("y", parseFloat(svgObject2.getElementById("pmtlabel").getAttribute("y")) + 15*(i+1));
      text_this.innerHTML = pmt_id;
      //svgObject2.children[0].appendChild(text_this);
      group_this.appendChild(text_this)


      var line_this = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line_this.setAttribute("class", "dataline");
      line_this.setAttribute("points", str_points);
      line_this.setAttribute("fill", "none");
      line_this.setAttribute("style", "stroke:"+color_this+";");
      //svgObject2.children[0].appendChild(line_this);
      group_this.appendChild(line_this)

      svgObject2.children[0].appendChild(group_this);
    }
  }

  //var svgObject2 = svgDocument.children[0]
  //var svgDocument = document.getElementById('svg_frame2').getElementById('svg2')


  var time_start = parseInt(document.getElementById('field_history_start' ).value);
  var time_end   = parseInt(document.getElementById('field_history_end'   ).value);
  var time_width = parseInt(document.getElementById('field_history_window').value);

  console.log(
    "\ntime_start:" + time_start + 
    "\ntime_end:" + time_end + 
    "\ntime_width:" + time_width
  )

  if(isNaN(time_start) || isNaN(time_end) || isNaN(time_width)){
    return(0);
  }


  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      result = JSON.parse(this.responseText);
      pmt_rates_history = result;
      prepare_data();
      remove_old_rates();
      history_prepare_axis();
      history_draw_pmts();
    }
  };




  if(pmts == false){
    remove_old_rates();
  } else {
    str_url = "/monitor/get_history?str_pmts=" + pmts +
      "&int_time_start=" + time_start +
      "&int_time_end=" + time_end +
      "&int_time_averaging_window=" + time_width;
    console.log(str_url);
    xmlhttp.open("GET", str_url, true);
    xmlhttp.send();
  }

}



function usetimestamp(field_id){
    document.getElementById(field_id).value = document.getElementById("field_current_timestamp").value
}



function saveAsPng(svgObject){    
    var svgString = new XMLSerializer().serializeToString(svgObject);
    
    // check which svg is chosen and generate filname
    var str_id_svgObject = svgObject.firstChild.id;
    var filename = "image";
    if(str_id_svgObject == "svg1"){
        filename = "pmt-view";
    } else if(str_id_svgObject == "svg2"){
        filename = "trend-view";
    }
    // add unique string to filename
    filename = filename + "_" +  (new Date).getTime() + ".png";
    
    
    // prepare canvas 
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    var img = new Image();
    var svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    
    // set canvas size  to svg viewbox size
    canvas.setAttribute("width", svgObject.firstElementChild.viewBox.baseVal.width*4);
    canvas.setAttribute("height", svgObject.firstElementChild.viewBox.baseVal.height*4);
    
    
    // set url
    var DOMURL = self.URL || self.webkitURL || self;
    var url = DOMURL.createObjectURL(svg);
    
    
    // it does not work withut this
    img.onload = function() {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        var png = canvas.toDataURL("image/png");
        DOMURL.revokeObjectURL(png);


    };
    img.src = url;
    
    
    // download after some time (1/10 of a second should hopefully be long engough....)
    setTimeout(
        () => {
            var link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL()
            link.click();
        },
        100
    );


}

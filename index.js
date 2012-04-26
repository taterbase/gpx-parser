var xml2js = require('xml2js')
  , geolib = require('geolib')
  , parser = new xml2js.Parser();

var getTrk = function(trkarr, callback) {
  var trk = { name: null,
              values:[]
            }
    , segs
    , trkpts
    , trkpt;
  
  if (!(trkarr instanceof Array)) {
    trkarr = [trkarr];
  }

  for (var i = 0, li = trkarr.length; i < li; ++i) {
    segs = trkarr[i].trkseg;
    
    if(!(segs instanceof Array)){
      segs = [segs];
    }
    
    if(segs.hasOwnProperty('name'))
      trk.name = segs.name;
    
    for (var j = 0, lj = segs.length; j < lj; ++j) {
      trkpts = segs[j].trkpt;
      
      for(var k = 0, lk = trkpts.length; k < lk; ++k){
        aggregatePoints(trk.values, trkpts[k], function(err){
          return callback(err);
        });
      }
    }
  }
  return calculateSpeeds(trk, callback);
};

var getRte = function(rtearr, callback){
  var rte = { name: null,
              values:[]
            }
  , rtepts
  , rtept;
  
  if (!(rtearr instanceof Array)) {
    rtearr = [rtearr];
  }
  for (var i = 0, li = rtearr.length; i < li; ++i) {
    if(rtearr[i].hasOwnProperty('name'))
      rte.name = rtearr[i].name;
    rtepts = rtearr[i].rtept;
    for (var j = 0, lj = rtepts.length; j < lj; ++j) {
      aggregatePoints(rte.values, rtepts[j], function(err){
        if(err) return callback(err);
      });
    }
  }
  return calculateSpeeds(rte, callback);
};

var getWpt = function(wptarr, callback){
  var wpt = { name: null,
              values:[]
            }
  , waypt;

  if (!(wptarr instanceof Array)) {
    wptarr = [wptarr];
  }

  for (var i = 0, li = wptarr.length; i < li; ++i) {
    aggregatePoints(wpt.values, wptarr[i], function(err){
      if(err) return callback(err);
    });
  }
  return calculateSpeeds(wpt, callback);
};

var aggregatePoints = function(container, dataPoint, callback){
  var point = {};

  if(dataPoint.hasOwnProperty('@') && dataPoint['@'].hasOwnProperty('lat') && dataPoint['@'].hasOwnProperty('lon')){
    point.latitude = parseFloat(dataPoint['@'].lat);
    point.longitude = parseFloat(dataPoint['@'].lon);
  }
  else
    return callback(new Error("No location data available"));

  if (dataPoint.hasOwnProperty('time'))
    point.time = new Date(dataPoint.time);
  else
    return callback(new Error("No time information available"));

  if (dataPoint.hasOwnProperty('ele'))
    point.elevation = dataPoint.ele;

  container.push(point);
};

var calculateSpeeds = function(coordinates, callback){
  var result = { "type": "mph",
                 "values": []
               }
  , distance = 0
  , bpoint
  , epoint
  , miles = 0; 

  coordinates.values = coordinates.values.sort(function(a, b){
    return a.time - b.time;
  });

  bpoint = coordinates.values[0];

  for(var i = 1, li = coordinates.values.length; i < li; ++i){
    epoint = coordinates.values[i];
    distance += geolib.getDistance(epoint, bpoint);

    if(((epoint.time.getTime() - bpoint.time.getTime())/3600000) > .9){

      miles = geolib.convertUnit("mi", distance, 1);
      distance = 0;
      result.values.push(new Array((epoint.time.getTime()/1000), miles));

      bpoint = epoint;
    }
  }
  
  return callback(null, result);

  //callback(null, result);
};

var GpxParser = function(gpx, callback) {
  parser.parseString(gpx, function (err, result) {
    if (err) return callback(new Error("gpx: XML Parse Error: " + err.message));

    if(result.hasOwnProperty('trk'))
      return getTrk(result.trk, callback);
    else if(result.hasOwnProperty('rte'))
      return getRte(result.rte, callback);
    else if(result.hasOwnProperty('wpt'))
      return getWpt(result.wpt, callback);
    else  //No usable data
      return callback(null, null);
  });
};

module.exports = GpxParser;
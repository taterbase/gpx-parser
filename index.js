var xml2js = require('xml2js')
  , geolib = require('geolib')
  , parser = new xml2js.Parser();

var getTrk = function(trkarr, callback) {
  var trk = {name: null,
             values: [],
             data:[
              {"type": "bpm",
               "values":[]
              },
              {
                "type": "mph",
                "values":[]
              },
              {
                "type": "cad",
                "values": []
              },
              {
                "type": "ele",
                "values": []
              }
             ]
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
        aggregatePoints(trk, trkpts[k], function(err){
          return callback(err);
        });
      }
    }
  }
  return interpolate(trk, callback);
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
      aggregatePoints(rte, rtepts[j], function(err){
        if(err) return callback(err);
      });
    }
  }
  return callback(null, rte);
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
    aggregatePoints(wpt, wptarr[i], function(err){
      if(err) return callback(err);
    });
  }
  return callback(null, wpt);
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
    point.time = ((new Date(dataPoint.time).getTime())/1000);
  else
    return callback(new Error("No time information available"));

  if (dataPoint.hasOwnProperty('ele'))
    point.elevation = dataPoint.ele;

  if (dataPoint.hasOwnProperty('extensions'))
    if(dataPoint.extensions.hasOwnProperty('gpxtpx:TrackPointExtension'))
    {
      if(dataPoint.extensions['gpxtpx:TrackPointExtension'].hasOwnProperty('gpxtpx:hr'))
        container.data[0].values.push(new Array(dataPoint.extensions['gpxtpx:TrackPointExtension']['gpxtpx:hr'], point.time));
      
      if(dataPoint.extensions['gpxtpx:TrackPointExtension'].hasOwnProperty('gpxtpx:cad'))
        container.data[2].values.push(new Array(dataPoint.extensions['gpxtpx:TrackPointExtension']['gpxtpx:cad'], point.time));  
    }
  container.values.push(point);
};

var interpolate = function(trk, callback){

  var points = trk.values
      // , bpmArr = trk.data[0].values
      , mphArr = trk.data[1].values
      // , cadArr = trk.data[2].values
      , eleArr = trk.data[3].values
      , distance
      , elevationChange
      , time;

  for(var i = 1, li = points.length; i < li; ++i){
    distance = geolib.getDistance(points[i], points[(i-1)]);
    mphArr.push(new Array(distance, points[i].time));

    if(points[1].hasOwnProperty('elevation'))
    {
      elevationChange = points[i].elevation - points[(i-1)].elevation;
      eleArr.push(new Array(elevationChange, points[i].time));
    }
  }
  
  return callback(null, trk);
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
      return callback(new Error("No useable data in this gpx file."));
  });
};

module.exports = GpxParser;
var xml2js = require('xml2js')
  , geolib = require('geolib')
  , parser = new xml2js.Parser();

// Parsing a TRK object
var getTrk = function(trkarr, callback) {
  // Building an empty object according to the data we MAY or may not get
  var trk = {name: null,
             path: [],
             summary:[
              {"type": "bpm",
               "values":[]
              },
              {
                "type": "mps",
                "values":[]
              },
              {
                "type": "rpm",
                "values": []
              },
              {
                "type": "inc",
                "values": []
              },
              {
                "type": "meters",
                "values":[]
              }
             ]
            }
    , segs
    , trkpts
    , trkpt;
  
  // Ensure we have an array
  if (!(trkarr instanceof Array)) {
    trkarr = [trkarr];
  }

  // A trk is an array of trksegs, loop through and grab each seg
  for (var i = 0, li = trkarr.length; i < li; ++i) {
    segs = trkarr[i].trkseg;
    
    //Ensure array
    if(!(segs instanceof Array)){
      segs = [segs];
    }
    
    //Not all TRK's come with a name. Grab it if it does
    if(segs.hasOwnProperty('name'))
      trk.name = segs.name;

    //Each trkseg is an array composed of trkpt's, this is where the data we want is.
    //Loop through and grab each
    for (var j = 0, lj = segs.length; j < lj; ++j) {
      trkpts = segs[j].trkpt;
      
      //For each trkpt compile the data into the aforementioned trk object
      for(var k = 0, lk = trkpts.length; k < lk; ++k){
        aggregatePoints(trk, trkpts[k], function(err){
          return callback(err);
        });
      }
    }
  }
  //After aggregating the data, interpolate what we can and return it.
  return interpolate(trk, callback);
};

//WIP: Rte's don't have as much info as trk, similar structure but with less emphasis
var getRte = function(rtearr, callback){
  var rte = { name: null,
              path:[]
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

//WIP: wpts have the least accurate data. Similar to Rte's
var getWpt = function(wptarr, callback){
  var wpt = { name: null,
              path:[]
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

  // Attributes of a tag are stored in '@'. If we have lat and lon store. If not error out and inform
  if(dataPoint.hasOwnProperty('@') && dataPoint['@'].hasOwnProperty('lat') && dataPoint['@'].hasOwnProperty('lon')){
    point.latitude = parseFloat(dataPoint['@'].lat);
    point.longitude = parseFloat(dataPoint['@'].lon);
  }
  else
    return callback(new Error("No location data available"));

  //We need time to get accurate interpolations, if no time, error out and inform
  if (dataPoint.hasOwnProperty('time'))
    point.time = ((new Date(dataPoint.time).getTime())/1000);
  else
    return callback(new Error("No time information available"));

  //Elevation
  if (dataPoint.hasOwnProperty('ele'))
    point.elevation = dataPoint.ele;

  //The extension tag can contain special data depending on the device. We try to grab heart rate and cadence if we can.
  //We store this data in a special summary portion of the container object
  if (dataPoint.hasOwnProperty('extensions'))
    if(dataPoint.extensions.hasOwnProperty('gpxtpx:TrackPointExtension'))
    {
      if(dataPoint.extensions['gpxtpx:TrackPointExtension'].hasOwnProperty('gpxtpx:hr'))
        container.summary[0].values.push(new Array(point.time, dataPoint.extensions['gpxtpx:TrackPointExtension']['gpxtpx:hr']));
      
      if(dataPoint.extensions['gpxtpx:TrackPointExtension'].hasOwnProperty('gpxtpx:cad'))
        container.summary[2].values.push(new Array(point.time, dataPoint.extensions['gpxtpx:TrackPointExtension']['gpxtpx:cad']));  
    }

  //Push point data on
  container.values.push(point);
};


var interpolate = function(trk, callback){

  //Setting up arrays for potential data
  var points = trk.values
      , mpsArr = trk.summary[1].values
      , eleArr = trk.summary[3].values
      , meterArr = trk.summary[4].values
      , distance
      , totalDistance = 0
      , elevationChange
      , time;

  for(var i = 1, li = points.length; i < li; ++i){
    totalDistance += distance = geolib.getDistance(points[i], points[(i-1)]);
    
    mpsArr.push([points[i].time, distance]);
    meterArr.push([points[i].time, totalDistance]);

    if(points[1].hasOwnProperty('elevation'))
    {
      elevationChange = points[i].elevation - points[(i-1)].elevation;
      eleArr.push([points[i].time, elevationChange]);
    }
  }
  
  for(var j = (trk.summary.length - 1); j >= 0; --j)
  {
    if(trk.summary[j].values.length < 1)
      trk.summary.splice(j, 1);
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
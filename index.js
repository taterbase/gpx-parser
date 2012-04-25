var xml2js = require('xml2js')
  , parser = new xml2js.Parser();

var getTrk = function(trkarr, callback) {
  var trk = []
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
    for (var j = 0, lj = segs.length; j < lj; ++j) {
      trkpts = segs[j].trkpt;
      for(var k = 0, lk = trkpts.length; k < lk; ++k){
        trkpt = trkpts[k];
        if (trkpt.hasOwnProperty('@') && trkpt['@'].hasOwnProperty('lat')) {
          if (trkpt.hasOwnProperty('ele')) {
            trk.push({lat: parseFloat(trkpt['@'].lat), lng: parseFloat(trkpt['@'].lon), elev: parseFloat(trkpt.ele)});
          } else {
            trk.push({lat: parseFloat(trkpt['@'].lat), lng: parseFloat(trkpt['@'].lon)});
          }
        }
      }
    }
  }
  return callback(null, trk);
};

var getRte = function(rtearr, callback){
  var rte = []
  , rtepts
  , rtept;
  
  if (!(rtearr instanceof Array)) {
    rtearr = [rtearr];
  }
  for (var i = 0, li = rtearr.length; i < li; ++i) {
    rtepts = rtearr[i].rtept;
    for (var j = 0, lj = rtepts.length; j < lj; ++j) {
      rtept = rtepts[j];
      if (rtept.hasOwnProperty('@') && rtept['@'].hasOwnProperty('lat')) {
        if (rtept.hasOwnProperty('ele')) {
          rte.push({lat: parseFloat(rtept['@'].lat), lng: parseFloat(rtept['@'].lon), elev: parseFloat(rtept.ele)});
        } else {
          rte.push({lat: parseFloat(rtept['@'].lat), lng: parseFloat(rtept['@'].lon)});
        }
      }
    }
  }
  return callback(null, rte);
};

var getWpt = function(wptarr, callback){
  var wpt = []
  , waypt;

  if (!(wptarr instanceof Array)) {
    wptarr = [wptarr];
  }
  for (var i = 0, li = wptarr.length; i < li; ++i) {
    waypt = wptarr[i];
    if (waypt.hasOwnProperty('@') && waypt['@'].hasOwnProperty('lat')) {
      if (waypt.hasOwnProperty('ele')) {
        wpt.push({lat: parseFloat(waypt['@'].lat), lng: parseFloat(waypt['@'].lon), elev: parseFloat(waypt.ele)});
      } else {
        wpt.push({lat: parseFloat(waypt['@'].lat), lng: parseFloat(waypt['@'].lon)});
      }
    }
  }
  return callback(null, wpt);
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
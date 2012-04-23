var xml2js = require('xml2js')
  , parser = new xml2js.Parser();

var getTrk = function(trkarr) {
  var trk = []
    , segs
    , seg;
  if (!(trkarr instanceof Array)) {
    trkarr = [trkarr];
  }
  for (var i = 0, li = trkarr.length; i < li; ++i) {
    segs = trkarr[i].trkseg.trkpt;
    for (var j = 0, lj = segs.length; j < lj; ++j) {
      seg = segs[j];
      if (seg.hasOwnProperty('@') && seg['@'].hasOwnProperty('lat')) {
        if (seg.hasOwnProperty('ele')) {
          trk.push({lat: parseFloat(seg['@'].lat), lng: parseFloat(seg['@'].lon), elev: parseFloat(seg.ele)});
        } else {
          trk.push({lat: parseFloat(seg['@'].lat), lng: parseFloat(seg['@'].lon)});
        }
      }
    }
  }
  return trk;
};

var parseGpx = function(gpx, callback) {
  parser.parseString(gpx, function (err, result) {
    if (err) {
      callback(new Error("gpx: XML Parse Error: " + err.message));
    } else {
      result = getTrk(result.trk);
      callback(null, result);
    }
  });
};

module.exports = GpxParser;
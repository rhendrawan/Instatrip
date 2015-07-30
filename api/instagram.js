var instagram = require('instagram-node-lib');
var keys = require('../config.js');
var Promise = require('bluebird');
instagram.set('client_id', keys.INSTAGRAM_ID);
instagram.set('client_secret', keys.INSTAGRAM_SECRET);



/**
* Gets instagram photos tagged with a specific location.
* Searches by instagram-location-ID
*/
var getInstaDataById = function(locationId, barName, coords, lat, lng ){
  return new Promise(function(resolve, reject){
    instagram.locations.recent({ location_id: locationId, 
      complete: function(data){
        // 'data' is an array of photo-objects for a specific location
        resolve({barName:barName, lat: lat, lng: lng, data: data});
      },error: function(errorMessage, errorObject, caller){
        reject(errorMessage);
        // console.log(errorMessage);
      }
    });
  });
};



/**
* Gets instagram location info based on foursquare ID
*/
var getInstaLocation = function(foursquareId, barName, coords, lat, lng, dist){
  return new Promise(function(resolve, reject){
    instagram.locations.search({ foursquare_v2_id: foursquareId, 
      complete: function(data){
        console.log('instagram location info request data: ', data);
        resolve({
          instagramLocationId: data[0].id,
          barName: barName, 
          coords: coords, 
          lat: lat,
          lng: lng
        });
      },error: function(errorMessage, errorObject, caller){
        reject(errorMessage);
        console.log(errorMessage);
        // console.log(errorMessage);
      } 
    });
  });
};



/**
* Format instagram data object to send back to client
*/
var photoParser = function(barName, lat, lng, photoObjArr){
  var results = [];
  var locationPhotoObj = { barName: barName, location: {latitude: lat, longitude: lng}, photos: [] };
  for(var i = 0; i < photoObjArr.length; i++){
    locationPhotoObj.photos.push({
      link: photoObjArr[i].link,
      url: photoObjArr[i].images.low_resolution.url
    });
  }

  return locationPhotoObj;

};



/**
* This gets called first
* Recieves array of locations' data
*/

var obtainInstaData = function(instaData){
  return new Promise(function(resolve, reject){
  
    var lat, lng, dist, barName, foursquare_v2_id = 300; // dist unit: m, max: 5000m --- distance around lat+lng to look for photos

    var instaLocationPromiseArr = [];

    // get the instagram id of each location based on the foursquare id
    for (var i = 0; i < instaData.length; i++){
      foursquare_v2_id = instaData[i].foursquare_v2_id;
      barName = instaData[i].name;
      lat = instaData[i].coordinates.lat;
      lng = instaData[i].coordinates.lng;
      // save each promise in an array
      instaLocationPromiseArr.push( getInstaLocation( foursquare_v2_id, barName, instaData, lat, lng, dist ) );
    }

    // once all promises are resolved, look up photos tagged with each location
    Promise.all( instaLocationPromiseArr ).then(function(resultsArr){
      var instaDataPromiseArr = [];

      for (var i = 0; i < resultsArr.length; i++){
        var instagramLocationId = resultsArr[i].instagramLocationId;
        var barName = resultsArr[i].barName;
        var  coords = resultsArr[i].coords;
        var  lat = resultsArr[i].lat;
        var  lng = resultsArr[i].lng;

        instaDataPromiseArr.push( getInstaDataById( instagramLocationId, barName, coords, lat, lng ) );
      }

      return Promise.all( instaDataPromiseArr );
      // once all promises are resolved, format the data for each location to send to client
    }).then(function(resultsArr){
      var parsedResultsArr = [];

      // format each location's data to send back to client
      for(var i = 0; i < resultsArr.length; i++){
        var barName = resultsArr[i].barName;
        var lat = resultsArr[i].lat;
        var lng = resultsArr[i].lng;
        var photoObjArr = resultsArr[i].data;

        parsedResultsArr.push( photoParser(barName, lat, lng, photoObjArr) );
      }

      resolve(parsedResultsArr);

    });

  });
};



module.exports = {
  obtainInstaData: obtainInstaData
};


/**
 * @classdesc 
 * LocationSelector to use OpenLayers 3 Map and ESRI's Geocoding REST service to let users select a location 
 *
 * @exmaple
 * var selector = new LocationSelector({
 *    inputTargetId: 'myTextboxId'
 *    map:{
 *        target: 'myMapDivId',
 *        markerIconUrl: 'http://openlayers.org/en/v3.8.2/examples/data/icon.png',
 *        width: 550, // optional
 *        height: 550, // optional
 *        center: [-11173259.046613924, 4441908.587708162], //optional
 *        zoom: 17, //optional
 *        basemapUrl: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' //optional
 *      },
 *    onLocationSelect: function(location){
 *      //location.address
 *      //location.coordinates
 *        //location.zoom
 *        //location.extents
 *    },
 *    error: function(err){
 *      console.log(err.message)
 *    }
 * })
 */

var LocationSelector = function (options){
  var vm = this;
  vm.options = options;

  var esriGeocodeServer = 'http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';

  var arcGISSource = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: esriGeocodeServer + '/suggest?f=json&callback=?&text=%QUERY',
        wildcard: '%QUERY',
        rateLimitWait: 100,
        filter: function (results) {
          var s = results.suggestions.map(function (s) {
            return { value: s.text, magicKey: s.magicKey };
          })
          return s;
        }
      }
  });
  
  // typeahead.js bloodhound hack: hijacking the search function to
  // catch lat,lon or bbox input which should not be sent to the autocomplete
  arcGISSource.searchProxy =  arcGISSource.search;

  arcGISSource.search =  function (query, sync, async) {
    if(isLatLon(query)) {
      console.log(query);
      reverseGeocode(query);
    }
    else{
      arcGISSource.searchProxy(query, sync, async);
    }
  }

  arcGISSource.initialize();

  $('#'+options.inputTargetId).typeahead('destroy');

  $('#'+options.inputTargetId).typeahead({
    minLength: 3,
    highlight: true
  },
  {
    name: 'esriArcGISGeocoder',
    limit: 10,
    source: arcGISSource.ttAdapter(),
    displayKey: 'value',
  });
  
  $('#'+options.inputTargetId).bind('typeahead:select', function(ev, suggestion) {
    $.getJSON(esriGeocodeServer + '/find?f=json&callback=?', {
      text : suggestion.value,
      magicKey: suggestion.magicKey
    }, function (response) {
      
      if(response.locations.length > 0 ){
        selectLocation({
          location: response.locations[0],
          address: suggestion.value
        });
      }
      else{
        if(options.error) options.error({message: "Sorry no locations found! Please try another address or location" })
      }
      
    });

  });

  
  if(options.map) enableMap();    

  function enableMap() {
    //clear out any thing in the map div
      $('#'+options.map.target).empty();

      var initialCenter = [-11173259.046613924, 4441908.587708162];
      var initialZoom = options.map.zoom || 3;

      if(options.map.center){
        initialCenter = ol.proj.fromLonLat(options.map.center);
      }

      // initialize the map
      var map = new ol.Map({
        layers: [
          new ol.layer.Tile({
            source: new ol.source.XYZ({
              url: options.map.basemapUrl || 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
            })
          })
        ],
        target: options.map.target,
        view: new ol.View({
          center: initialCenter,
          zoom: initialZoom
        })
      });
      
      
      // add location marker to the map
      vm.geocodedMarker = new ol.Feature(new ol.geom.Point(initialCenter));
      var markerLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: [vm.geocodedMarker]
        }),
        style: new ol.style.Style({
          image: new ol.style.Icon({
            src: options.map.markerIconUrl || "http://leafletjs.com/dist/images/marker-icon.png"
          })
        })
       });

      map.addLayer(markerLayer);

      // add drag interaction
      vm.dragCollection = new ol.Collection([vm.geocodedMarker]);
      var drag = new ol.interaction.Modify({
          features: vm.dragCollection,
          style: null
      });

      drag.on('modifyend',function(event){
          var c = ol.proj.toLonLat(event.features.getArray()[0].getGeometry().getCoordinates());

          var coordinates = {x: c[0], y: c[1]};
          
          //reverseGeocode(c[1]+","+c[0]);
          //inform the new location to the registered callback
          selectLocation({
            location: {feature: {geometry: coordinates }},
            zoom: map.getView().getZoom(),
            address: null,
            disableMapUpdate: true
          });
      });

      map.addInteraction(drag);

      //setup map div's width and height if specified by user, else ol3 will use current DOM width and height
      if(options.map.width) $('#'+options.map.target).width(options.map.width);
      if(options.map.height) $('#'+options.map.target).height(options.map.height);
      
      vm.map = map;
  }

  function isLatLon(query){
    return query.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
  }

  /**
   * [reverseGeocode Send a reversegeocode query to ESRI's reversegeocode server]
   * @param  {[type]} query [Example "32.80252,-80.0929" (lat,lon)]
   * @return {[promise]}       [returns a promise for reverse geocode API]
   */
  function reverseGeocode(query){
    return $.getJSON(esriGeocodeServer + '/reverseGeocode?f=json&callback=?', {
      location : JSON.stringify({
        "x": query.split(',')[1],
        "y": query.split(',')[0],
        "spatialReference": {
            "wkid": 4326
        }
      })
    }, function (response) {
        if(response.location && response.address){
          console.log(response);
          
          selectLocation({
            location:{
              feature: { geometry: response.location }
            },
            address:response.address.Match_addr
          });

        }
        else if(response.error){
          console.log(response);
          
          selectLocation({
            location:{ 
                feature: { geometry: { x: query.split(',')[1], y: query.split(',')[0] } },
            },
            address: null,
            error:{ 
              message: response.error.details[0]
            }
          });

        }
    });
  }

  /**
   * options: {
   *        location:{ 
   *            feature: { geometry: { x: xcoord , y: ycoord } },
   *            extent: [xmin,ymin,xmax,ymax]
   *        },
   *        address: Some Address String or null,
   *        zoom: ideal map zoom or null
   *        disableMapUpdate: true or false 
   *        error:{ 
   *          message: "Error Message"
   *        }
   *      }
   */
  function selectLocation (options) {
    console.log(options);

    var f = options.location.feature;
    var e = options.location.extent;

    if(vm.map && !options.disableMapUpdate){
      if(e) vm.map.getView().fit(ol.proj.transformExtent([e.xmin, e.ymin, e.xmax, e.ymax], 'EPSG:4326' ,'EPSG:3857'), vm.map.getSize());
      
      vm.map.getView().setCenter(ol.proj.fromLonLat([f.geometry.x, f.geometry.y]));
      vm.geocodedMarker.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([f.geometry.x, f.geometry.y])));
      
      vm.dragCollection.clear();
      vm.dragCollection.push(vm.geocodedMarker);
    }
    
    //create a object to store selected location
    var selectedLocation = {
      address: options.address,
      coordinates: f.geometry
    };

    //32.80252,-80.0929
    if(e) selectedLocation.extents = [e.xmin, e.ymin, e.xmax, e.ymax].join(',');

    if(options.error) selectedLocation.error = options.error.message;

    if(options.zoom) options.zoom;
    else if(vm.map) selectedLocation.zoom = vm.map.getView().getZoom();

    //inform the new location to the registered callback
    if(vm.options.onLocationSelect) vm.options.onLocationSelect(selectedLocation);
  }

} // end of LocationSelector class



LocationSelector.prototype.getMap = function() {
  return this.MAP;
};
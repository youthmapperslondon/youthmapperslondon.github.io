const provider = new window.GeoSearch.OpenStreetMapProvider();
const searchControl = new window.GeoSearch.GeoSearchControl({
  provider: provider,
  style: 'bar',
  autoClose: true
}); 

let map = L.map('map').setView([51.50800, -0.12000], 15);

map.addControl(searchControl);
map.on('geosearch_showlocation', (result) => {
 console.log(result); // location + marker
});

let custom_attribution = `${document.title} (<a href="https://github.com/frafra/poi-around-me">source code</a>)`;
let OpenStreetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: `${custom_attribution} | &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>`,
  maxZoom: 18,
  minZoom: 10
});

let baseLayers = {
  "OpenStreetMap":OpenStreetMapLayer,
};
OpenStreetMapLayer.addTo(map);

let overlays = {};
for (let feature in features) {
  let name = `<span style="color:${features[feature].color}">&#x25cf;</span> ${features[feature].name}`;
  features[feature].name = name;
  overlays[name] = L.layerGroup();
  overlays[name].addTo(map);
}
L.control.layers(baseLayers, overlays, {collapsed:false}).addTo(map);

function getFeatures() {
  if (map.getZoom() < 15) return;
  let bounds = map.getBounds();
  let bbox = bounds.getSouth()+','+bounds.getWest()+','+bounds.getNorth()+','+bounds.getEast();  
  let request = "";
  for (let feature in features) {
    request += `node[${feature}](${bbox});`;
    request += `way[${feature}](${bbox});`;
  }
  let url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(${request});out;`;
  fetch(url).then(response => {
    return response.json();
  }).then(results => {
    for (let feature in features) {
      overlays[features[feature].name].clearLayers();
    }
    results.elements.forEach(e => {
      let featureFound;
      for (let feature in features) {
        let keyValue = feature.split('=', 2);
        let key = keyValue[0];
        let value = keyValue[1].split('"')[1];
        if (key in e.tags) {
          if (value == e.tags[key]) {
            featureFound = feature;
          }
        }
      }
      let color = features[featureFound].color;
      let marker = L.circleMarker([e.lat, e.lon], {color: color});
      let content = '';
      for (let tag in e.tags) {
        content += `<b>${tag}</b>: ${e.tags[tag]}<br/>`;
      };
      marker.bindPopup(content)
      marker.addTo(overlays[features[featureFound].name]);
    });
  }).catch(error => {
    waitAndReload();
  });
}

let timer;
function waitAndReload() {
  window.clearTimeout(timer);
  timer = setTimeout(getFeatures, 1000);
}



map.on('zoomend', waitAndReload);
map.on('moveend', waitAndReload);


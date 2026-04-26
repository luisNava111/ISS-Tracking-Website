/*
fetch("https://api.wheretheiss.at/v1/satellites/25544").then(response => response.json()).then(data => {
    console.log(data);
}).catch(error => console.error("failure to get iss data"));
*/
// same as above code

// await keyword (only can be used in async functions because it changes the timing of things being executed) will only advance to next code 
// when whatever it is awaiting is fulfilled
// same as .then() which progresses when the previous code is completed (takes in arrow functions[lambdas])

//const map = L.map("map").setView([0,0],2);

const map = L.map('map', {
    worldCopyJump: false,   // don't jump to copy of the map
    maxBoundsViscosity: 1.0 // prevents dragging outside bounds
});

const pathCoords = [];
const trailLine = L.geodesic([pathCoords], {
    color: 'orange', weight: 2, opacity: 0.7
}).addTo(map);

const terminator = L.terminator().addTo(map);

map.setView([0,0],2);

map.setMaxBounds([
    [-90, -180], // Southwest corner
    [90, 180]    // Northeast corner
]);

map.setMinZoom(2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '@ OpenStreetMap contributors', noWrap: true}).addTo(map);

var myIcon = L.icon({
    iconUrl: 'https://www.iconarchive.com/download/i106861/goodstuff-no-nonsense/free-space/international-space-station.ico',
    iconSize: [50, 32],      // tweak these values if needed
    iconAnchor: [25, 16]     // centers the icon on the marker location
});

const marker = L.marker([0,0], {icon: myIcon}).addTo(map);

interact('#data-panel').draggable({
    listeners: {
        move (event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        }
    }
});

interact('#LiveISS').draggable({
    listeners: {
        move (event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        }
    }
});

// house cords lat: -41.9487, lon: -88.083
let userMarker = null;
let userCoords = null;

document.getElementById("set-location").addEventListener("click", () => {
    const lat = parseFloat(document.getElementById("user-lat").value);
    const lon = parseFloat(document.getElementById("user-lon").value);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        alert("Please input valid latitude and/or longitude coordinates");
        return;
    }

    userCoords = L.latLng(lat,lon);

    if (userMarker) {
        userMarker.setLatLng(userCoords);
    } else {
        userMarker = L.marker(userCoords, {title: "Your Location"}).addTo(map);
    }
});

//functions and intervals below
//----------------------------------------------------------------------------------------------------------------------------------

// global array variable for prediction dots
let predictionDots = [];
async function printISSData () {
    try {
        let data = await (await fetch("https://api.wheretheiss.at/v1/satellites/25544")).json()
        // variables for prediction dots
        const velocityKmPerSec = data.velocity / 3600;
        const numDots = 5;
        const intervalSec = 60;
        // remove previous prediction dots
        for (let dot of predictionDots) {
            map.removeLayer(dot);
          }
          predictionDots = [];
        // drawing prediction dots
        for (let i = 0; i <= numDots; i++) {
            const secondsAhead = i * intervalSec;
            const distanceKm = velocityKmPerSec * secondsAhead;

            // approximating future position
            const degPerKmLon = 1 / (111 * Math.cos(data.latitude * Math.PI / 180));
            const futureLon = (data.longitude + distanceKm * degPerKmLon + 540) % 360 - 180;
            const futureLat = data.latitude;
        
            // opacity fades based on how far the dot is from the ISS
            const opacity = 0.2 + 0.15 * (numDots - i);

            const dot = L.circleMarker([futureLat, futureLon], {
                radius: 4,
                color: 'blue',
                fillColor: 'blue',
                weight: 1,
                fillOpacity: opacity,
                opacity: opacity
            }).addTo(map);

            predictionDots.push(dot);
        }

        // fill data for data panel
        document.getElementById("lat").textContent = data.latitude;
        document.getElementById("long").textContent = data.longitude;
        document.getElementById("alt").textContent = Math.floor(data.altitude * 0.621371) + " miles high";
        document.getElementById("vel").textContent = Math.floor(data.velocity * 0.621371) + " mph";
        document.getElementById("vis").textContent = data.visibility;
        //get timestamp and convert to actual date
        const timestamp = data.timestamp;
        const date = new Date(timestamp * 1000);
        document.getElementById("last-upd").textContent = date.toLocaleString();
        // add element to array to store previous positions, remove oldest element if too many, redraw line
        pathCoords.push([data.latitude, data.longitude]);
        if (pathCoords.length > 100) {
            pathCoords.shift();
        }
        trailLine.setLatLngs([pathCoords]);
        // change ISS icon coords
        marker.setLatLng([data.latitude, data.longitude]);
        // update user location distance from ISS
        if (userCoords) {
            const issCoords = L.latLng(data.latitude, data.longitude);
            const distance = issCoords.distanceTo(userCoords) / 1000; // meters → km
            document.getElementById("distance-info").textContent =
              `Distance to ISS: ${Math.floor(distance.toFixed(2))} km (${Math.floor(distance.toFixed(2) * 0.621371)} miles)`;
        }
    } catch (err) {
        console.error("failed to get iss data", err);
    }
}

// toggle day/night on and off
let terminatorVisible = true;
document.getElementById('toggle-terminator').addEventListener('click', () => {
    if (terminatorVisible) {
        map.removeLayer(terminator)
    } else {
        terminator.addTo(map)
    }
    terminatorVisible = !terminatorVisible;
});

printISSData();
setInterval(printISSData, 5000);
setInterval(() => {
    terminator.setTime(new Date());
    terminator.redraw();
}, 300000);
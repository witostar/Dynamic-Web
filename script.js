// API 1: live ISS position. API 2 (in getPlace): the name of the place below it
let issUrl = "https://api.wheretheiss.at/v1/satellites/25544";

// ISS data
let issLat = 0;
let issLon = 0;
let lastLon = 999;
let lastVisibility = "";
let count = 0;
let sunrises = 0;
let sunsets = 0;

// home starts at UTM
let homeLat = 43.55;
let homeLon = -79.66;
let closeness = 0;

// settings
let zoom = 4;
let soundOn = false;
let hum = document.getElementById("hum");
hum.preservesPitch = false;

// Get the newest ISS data
function getISS() {
  fetch(issUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      showISS(data);
    })
    .catch(function () {
      document.getElementById("status").innerHTML = "📡 Lost signal with the ISS... trying again";
    });
}

// Get the name of the place under the ISS
function getPlace() {
  let placeUrl = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + issLat + "&longitude=" + issLon + "&localityLanguage=en";
  fetch(placeUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      showPlace(data);
    });
}

function showPlace(data) {
  let name = "the open ocean";
  if (data.countryName != "") {
    name = data.countryName;
    if (data.locality != "") {
      name = data.locality + ", " + data.countryName;
    }
  } else if (data.locality != "") {
    name = "the " + data.locality;
  }
  document.getElementById("place").innerHTML = name;
}

// Use the ISS data to change the page
function showISS(data) {
  issLat = data.latitude;
  issLon = data.longitude;

  document.getElementById("status").innerHTML = "<span class='live-dot'></span> Live from the ISS · updates every 5 seconds";

  // 1. THE VIEW: glide smoothly, but jump when crossing the edge of the map
  if (lastLon == 999 || Math.abs(issLon - lastLon) > 180) {
    setGlide("0s");
  } else {
    setGlide("5s");
  }
  lastLon = issLon;
  moveWindow();
  getPlace();

  // mini map dot + trail
  let left = (issLon + 180) / 360 * 100;
  let top = (90 - issLat) / 180 * 100;
  document.getElementById("dot").style.left = left + "%";
  document.getElementById("dot").style.top = top + "%";
  document.getElementById("trail").innerHTML += "<div class='trail-dot' style='left:" + left + "%; top:" + top + "%;'></div>";

  // text
  document.getElementById("speed").innerHTML = Math.round(data.velocity) + " km/h";
  document.getElementById("altitude").innerHTML = Math.round(data.altitude) + " km";
  let northSouth = "N";
  if (issLat < 0) {
    northSouth = "S";
  }
  let eastWest = "E";
  if (issLon < 0) {
    eastWest = "W";
  }
  document.getElementById("position").innerHTML = Math.round(Math.abs(issLat)) + "°" + northSouth + " " + Math.round(Math.abs(issLon)) + "°" + eastWest;

  // 2. DAY & NIGHT: city lights, dark page and deeper sound in Earth's shadow
  if (data.visibility == "daylight") {
    document.getElementById("earthNight").style.opacity = 0;
    document.getElementById("page").style.backgroundImage = "linear-gradient(#1d4f9c, #0b1030)";
    document.getElementById("stars").style.opacity = 0.15;
    document.getElementById("sunlight").innerHTML = "☀️ Day";
  } else {
    document.getElementById("earthNight").style.opacity = 1;
    document.getElementById("page").style.backgroundImage = "linear-gradient(#000000, #05050f)";
    document.getElementById("stars").style.opacity = 1;
    document.getElementById("sunlight").innerHTML = "🌙 Night";
  }

  // sunrise or sunset just happened?
  if (lastVisibility != "" && data.visibility != lastVisibility) {
    if (data.visibility == "daylight") {
      sunrises = sunrises + 1;
      document.getElementById("sunrises").innerHTML = sunrises;
      showToast("🌅 Sunrise in space! The ISS just flew out of Earth's shadow.");
    } else {
      sunsets = sunsets + 1;
      document.getElementById("sunsets").innerHTML = sunsets;
      showToast("🌇 Sunset in space! The ISS just flew into Earth's shadow.");
    }
  }
  lastVisibility = data.visibility;

  // 3. DISTANCE FROM HOME: colour, bar, pin and sound
  showDistance();

  count = count + 1;
  document.getElementById("count").innerHTML = count;
  console.log("ISS update #" + count, data);
}

// Move the Earth images so the ISS position is in the middle of the window
function moveWindow() {
  let w = document.getElementById("window").offsetWidth;
  let mapWidth = w * zoom;
  let mapHeight = mapWidth / 2;
  let x = w / 2 - (issLon + 180) / 360 * mapWidth;
  let y = w / 2 - (90 - issLat) / 180 * mapHeight;

  let size = mapWidth + "px " + mapHeight + "px";
  let position = x + "px " + y + "px";
  document.getElementById("earthDay").style.backgroundSize = size;
  document.getElementById("earthDay").style.backgroundPosition = position;
  document.getElementById("earthNight").style.backgroundSize = size;
  document.getElementById("earthNight").style.backgroundPosition = position;
}

// How long the Earth takes to slide to its new spot
function setGlide(time) {
  let glide = "background-position " + time + " linear, background-size 1s, opacity 3s";
  document.getElementById("earthDay").style.transition = glide;
  document.getElementById("earthNight").style.transition = glide;
}

// Rough distance (1 degree ≈ 111 km) and how it changes the page
function showDistance() {
  let latGap = issLat - homeLat;
  let lonGap = Math.abs(issLon - homeLon);
  if (lonGap > 180) {
    lonGap = 360 - lonGap;
  }
  let km = Math.round(Math.sqrt(latGap * latGap + lonGap * lonGap) * 111);
  let home = document.getElementById("homeName").innerHTML;
  document.getElementById("distance").innerHTML = "~" + km + " km";

  closeness = 100 - km / 200;
  if (closeness < 0) {
    closeness = 0;
  }
  document.getElementById("meterFill").style.width = closeness + "%";

  // closer = warmer colour
  let color = "#4fd8ff";
  let pin = document.getElementById("homePin");
  if (km < 1500) {
    color = "#ff4f6d";
    pin.style.animation = "bounce 0.4s infinite alternate";
    document.getElementById("distanceText").innerHTML = "Right above " + home + "! Go outside and wave 👋";
  } else if (km < 5000) {
    color = "#ffa94f";
    pin.style.animation = "bounce 1.2s infinite alternate";
    document.getElementById("distanceText").innerHTML = "Getting close to " + home + "...";
  } else if (km < 10000) {
    color = "#c98cff";
    pin.style.animation = "none";
    document.getElementById("distanceText").innerHTML = "On the same side of the planet as " + home + ".";
  } else {
    pin.style.animation = "none";
    document.getElementById("distanceText").innerHTML = "The other side of the world. It'll come back around in about 90 minutes.";
  }

  document.getElementById("window").style.boxShadow = "0 0 0 6px #1b1e29, 0 0 0 9px #555c75, 0 0 60px " + color;
  document.getElementById("title").style.color = color;
  document.getElementById("title").style.textShadow = "0 0 18px " + color;
  document.getElementById("status").style.color = color;
  document.getElementById("meterFill").style.backgroundColor = color;
  document.getElementById("dot").style.backgroundColor = color;
  document.getElementById("dot").style.boxShadow = "0 0 12px " + color;

  updateSound();
}

// 4. SOUND: louder when close to home, slower and quieter at night
function updateSound() {
  let volume = 0.3 + closeness / 100 * 0.6;
  if (lastVisibility == "daylight") {
    hum.playbackRate = 1;
  } else {
    hum.playbackRate = 0.75;
    volume = volume * 0.6;
  }
  hum.volume = volume;
}

function showToast(message) {
  let toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.style.opacity = 1;
  setTimeout(hideToast, 5000);
}

function hideToast() {
  document.getElementById("toast").style.opacity = 0;
}

// INTERACTION 1: start screen
function startExperience() {
  document.getElementById("intro").style.display = "none";
  soundOn = false;
  toggleSound();
}

// INTERACTION 2: sound on/off
function toggleSound() {
  if (soundOn == false) {
    soundOn = true;
    hum.play();
    document.getElementById("soundBtn").innerHTML = "🔊 Sound on";
  } else {
    soundOn = false;
    hum.pause();
    document.getElementById("soundBtn").innerHTML = "🔇 Sound off";
  }
}

// INTERACTION 3: zoom the window 2x → 4x → 8x
function changeZoom() {
  if (zoom == 2) {
    zoom = 4;
  } else if (zoom == 4) {
    zoom = 8;
  } else {
    zoom = 2;
  }
  document.getElementById("zoomBtn").innerHTML = "🔍 Zoom: " + zoom + "x";
  setGlide("1s");
  moveWindow();
}

// INTERACTION 4: click the mini map to move your home
function setHome(event) {
  let map = document.getElementById("miniMap");
  homeLon = event.offsetX / map.offsetWidth * 360 - 180;
  homeLat = 90 - event.offsetY / map.offsetHeight * 180;
  document.getElementById("homeName").innerHTML = "your pin";
  placeHomePin();
  showDistance();
}

// INTERACTION 5: put the home pin back on UTM
function resetHome() {
  homeLat = 43.55;
  homeLon = -79.66;
  document.getElementById("homeName").innerHTML = "UTM";
  placeHomePin();
  showDistance();
}

function placeHomePin() {
  document.getElementById("homePin").style.left = (homeLon + 180) / 360 * 100 + "%";
  document.getElementById("homePin").style.top = (90 - homeLat) / 180 * 100 + "%";
}

// Event listeners
document.getElementById("startBtn").addEventListener("click", startExperience);
document.getElementById("soundBtn").addEventListener("click", toggleSound);
document.getElementById("zoomBtn").addEventListener("click", changeZoom);
document.getElementById("miniMap").addEventListener("click", setHome);
document.getElementById("resetBtn").addEventListener("click", resetHome);
window.addEventListener("resize", moveWindow);

// Start: place the UTM pin, get data now, then every 5 seconds
placeHomePin();
getISS();
setInterval(getISS, 5000);

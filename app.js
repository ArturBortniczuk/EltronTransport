function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function checkPassword(action) {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        `;

        dialogBox.innerHTML = `
            <h3>Podaj hasło, aby ${action} pinezkę:</h3>
            <input type="password" id="passwordInput" style="margin: 10px 0; padding: 5px;">
            <br>
            <button id="submitPassword" style="margin-right: 10px;">Potwierdź</button>
            <button id="cancelPassword">Anuluj</button>
        `;

        dialogOverlay.appendChild(dialogBox);
        document.body.appendChild(dialogOverlay);

        const passwordInput = dialogBox.querySelector('#passwordInput');
        const submitButton = dialogBox.querySelector('#submitPassword');
        const cancelButton = dialogBox.querySelector('#cancelPassword');

        submitButton.addEventListener('click', () => {
            const isCorrect = passwordInput.value === '2331';
            document.body.removeChild(dialogOverlay);
            resolve(isCorrect);
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            resolve(false);
        });

        passwordInput.focus();
    });
}

const map = L.map('map').setView([52.0, 19.0], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const database = firebase.database();
const addPinButton = document.getElementById('addPinButton');
const legendButton = document.getElementById('legendButton');
const closeLegendButton = document.getElementById('closeLegendButton');
const addPinPanel = document.getElementById('addPinPanel');
const legendPanel = document.getElementById('legendPanel');
const addPinForm = document.getElementById('addPinForm');
const fillLevelSlider = document.getElementById('fillLevel');
const fillLevelValue = document.getElementById('fillLevelValue');
const routeInfoButton = document.getElementById('routeInfoButton');
const routeInfoPanel = document.getElementById('routeInfoPanel');
const routeInfoContent = document.getElementById('routeInfoContent');

let routeMarkers = [];
let routeControl = null;

const carTypeMap = {
    'blaszak_bialystok': 'blaszak',
    'blaszak_zielonka': 'blaszak',
    'firanka_bialystok': 'firanka',
    'firanka_zielonka': 'firanka',
    'man_stary_bialystok': 'man',
    'man_nowy_bialystok': 'man',
    'man_zielonka': 'man'
};

const polishDayNames = {
    'monday': 'Poniedziałek',
    'tuesday': 'Wtorek',
    'wednesday': 'Środa',
    'thursday': 'Czwartek',
    'friday': 'Piątek'
};

const gpsLinks = {
    'man_zielonka': 'https://app.flotman.pl/positionaccesslink/17530/PHiW_nG2G0-J75JIWhokDg',
    'man_bialystok': 'https://app.flotman.pl/positionaccesslink/15464/96wevGrDhEWg1NshaA5W8A',
    'firanka_bialystok': 'https://app.flotman.pl/positionaccesslink/16022/-IYU-IhzrUidBFBtYcMEdg',
    'blaszak_bialystok': 'https://app.flotman.pl/positionaccesslink/16283/2gA1IesnHECHsU46B-1lLg',
    'firanka_zielonka': 'https://app.flotman.pl/positionaccesslink/7712/MhIfGVhKQkWoZT6ZFR68qQ',
    'blaszak_zielonka': 'https://app.flotman.pl/positionaccesslink/7712/MhIfGVhKQkWoZT6ZFR68qQ',
    'man_nowy_bialystok': 'https://app.flotman.pl/positionaccesslink/16282/NISVNXQp4UGDO2mMxfRxcQ'
};

let markers = {};

routeInfoButton.addEventListener('click', () => {
    routeInfoPanel.classList.toggle('visible');
    routeInfoButton.textContent = routeInfoPanel.classList.contains('visible') ? '❌ Zamknij' : '🚗 Informacje o trasie';
});

map.on('click', function(e) {
    const marker = L.marker(e.latlng).addTo(map);
    routeMarkers.push(marker);
    if (routeMarkers.length > 1) {
        calculateRoute();
    }
});

function calculateRoute() {
    if (routeControl) {
        map.removeControl(routeControl);
    }

    const waypoints = routeMarkers.map(marker => marker.getLatLng());

    routeControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        lineOptions: {
            styles: [{ color: 'blue', opacity: 0.6, weight: 4 }]
        },
        createMarker: function() { return null; },
        show: false,
        showAlternatives: true,
        altLineOptions: {
            styles: [
                {color: 'blue', opacity: 0.4, weight: 6},
                {color: 'yellow', opacity: 0.5, weight: 6}
            ]
        }
    }).addTo(map);

    routeControl.on('routesfound', function(e) {
        const routes = e.routes;
        let routesHtml = '';

        routes.forEach((route, index) => {
            const summary = route.summary;
            routesHtml += `
                <div class="route-option">
                    <h4>Trasa ${index + 1}</h4>
                    <p>Dystans: ${(summary.totalDistance / 1000).toFixed(2)} km</p>
                    <p>Szacowany czas: ${Math.round(summary.totalTime / 60)} minut</p>
                </div>
            `;
        });

        routeInfoContent.innerHTML = `
            <h3>Informacje o trasie</h3>
            ${routesHtml}
            <button id="clearRouteButton">Wyczyść trasę</button>
        `;
        routeInfoPanel.classList.add('visible');
        routeInfoButton.textContent = '❌ Zamknij';

        document.getElementById('clearRouteButton').addEventListener('click', clearRoute);
    });
}

function clearRoute() {
    if (routeControl) {
        map.removeControl(routeControl);
    }
    routeMarkers.forEach(marker => map.removeLayer(marker));
    routeMarkers = [];
    routeControl = null;
    routeInfoContent.innerHTML = '';
    routeInfoPanel.classList.remove('visible');
    routeInfoButton.textContent = '🚗 Informacje o trasie';
}

addPinButton.addEventListener('click', () => {
    addPinPanel.classList.toggle('visible');
    addPinButton.classList.toggle('panel-visible');
    addPinButton.textContent = addPinPanel.classList.contains('visible') ? '❌ Zamknij' : '➕ Dodaj pinezkę';
    if (legendPanel.classList.contains('visible')) {
        closeLegend();
    }
});

legendButton.addEventListener('click', () => {
    legendPanel.classList.add('visible');
    closeLegendButton.classList.add('visible');
    legendButton.style.display = 'none';
    if (addPinPanel.classList.contains('visible')) {
        addPinPanel.classList.remove('visible');
        addPinButton.classList.remove('panel-visible');
        addPinButton.textContent = '➕ Dodaj pinezkę';
    }
});

closeLegendButton.addEventListener('click', closeLegend);

function closeLegend() {
    legendPanel.classList.remove('visible');
    closeLegendButton.classList.remove('visible');
    legendButton.style.display = 'block';
}

fillLevelSlider.addEventListener('input', (e) => {
    fillLevelValue.textContent = e.target.value;
});

addPinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isPasswordCorrect = await checkPassword('dodać');
    if (!isPasswordCorrect) {
        alert('Nieprawidłowe hasło lub operacja anulowana.');
        return;
    }
    const name = document.getElementById('pinName').value;
    const address = document.getElementById('pinAddress').value;
    const cargo = document.getElementById('pinCargo').value;
    const carType = document.getElementById('carType').value;
    const fillLevel = document.getElementById('fillLevel').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        if (data.length > 0) {
            const { lat, lon } = data[0];
            const city = data[0].display_name.split(',')[0];
            await addMarker(lat, lon, name, cargo, carType, fillLevel, city, dayOfWeek);
            addPinPanel.classList.remove('visible');
            addPinButton.classList.remove('panel-visible');
            addPinButton.textContent = '➕ Dodaj pinezkę';
            addPinForm.reset();
            fillLevelValue.textContent = '3';
        } else {
            alert('Nie udało się znaleźć podanego adresu.');
        }
    } catch (error) {
        console.error('Błąd podczas geokodowania:', error);
        alert('Wystąpił błąd podczas dodawania pinezki.');
    }
});

const addMarker = debounce(async function(lat, lon, name, cargo, carType, fillLevel, city, dayOfWeek) {
    const snapshot = await database.ref('markers').orderByChild('lat').equalTo(lat).once('value');
    let existingMarker = null;
    snapshot.forEach((childSnapshot) => {
        const markerData = childSnapshot.val();
        if (markerData.lon === lon && markerData.active) {
            existingMarker = { key: childSnapshot.key, ...markerData };
            return true;
        }
    });

    let markerId;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

    const counterRef = database.ref('counters/' + dateStr);
    const counterSnapshot = await counterRef.once('value');
    let counter = counterSnapshot.val() || 0;
    counter++;

    const newRecordName = `${dateStr}-${counter.toString().padStart(3, '0')}`;

    if (existingMarker) {
        markerId = existingMarker.key;
        await database.ref('markers/' + markerId).update({
            name, cargo, carType, fillLevel, city, dayOfWeek,
            recordName: newRecordName,
            active: true
        });
        console.log('Marker zaktualizowany:', markerId);
    } else {
        const newMarkerRef = database.ref('markers').push();
        markerId = newMarkerRef.key;
        await newMarkerRef.set({
            lat, lon, name, cargo, carType, fillLevel, city, dayOfWeek,
            recordName: newRecordName,
            active: true
        });
        console.log('Nowy marker dodany:', markerId);
    }

    await counterRef.set(counter);

    refreshMarkers();
}, 300);

async function deleteMarker(markerId) {
    const isPasswordCorrect = await checkPassword('usunąć');
    if (!isPasswordCorrect) {
        alert('Nieprawidłowe hasło lub operacja anulowana.');
        return;
    }
    if (markers[markerId]) {
        map.removeLayer(markers[markerId]);
        delete markers[markerId];
        await database.ref('markers/' + markerId).update({ active: false });
        console.log('Marker oznaczony jako nieaktywny:', markerId);
    }
}

function loadMarkers() {
    database.ref('markers').orderByChild('active').equalTo(true).once('value', (snapshot) => {
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        markers = {};

        snapshot.forEach((childSnapshot) => {
            const markerId = childSnapshot.key;
            const markerData = childSnapshot.val();
            const { lat, lon, name, cargo, carType, fillLevel, city, dayOfWeek, recordName } = markerData;

            const iconType = carTypeMap[carType];
            const iconUrl = `static/${iconType}_${fillLevel}_${dayOfWeek}.png`;
            
            const icon = L.icon({
                iconUrl: iconUrl,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([lat, lon], { icon: icon, day: dayOfWeek }).addTo(map);
            markers[markerId] = marker;

            const gpsLink = gpsLinks[carType] || '';

            const popupContent = `
                <b>${name}</b><br>
                Numer rekordu: ${recordName}<br>
                Miasto: ${city}<br>
                Auto: ${carType.replace(/_/g, ' ')}<br>
                Dzień: ${polishDayNames[dayOfWeek]}<br>
                Towar: ${cargo}<br>
                Zapełnienie: ${fillLevel}/5<br>
                <button class="delete-button" onclick="deleteMarker('${markerId}')">Usuń pinezkę</button>
                                <button class="gps-button" onclick="openGPSLink('${gpsLink}')">Gdzie jest auto?</button>
                            `;
                            marker.bindPopup(popupContent);
                        });
                        filterMarkers();
                    });
                }

                function filterMarkers() {
                    const activeDays = Array.from(document.querySelectorAll('.legend-item:not(.inactive)'))
                        .map(item => item.dataset.day);

                    Object.values(markers).forEach(marker => {
                        const markerDay = marker.options.day;
                        if (activeDays.includes(markerDay)) {
                            if (!map.hasLayer(marker)) {
                                map.addLayer(marker);
                            }
                        } else {
                            if (map.hasLayer(marker)) {
                                map.removeLayer(marker);
                            }
                        }
                    });
                }

                function openGPSLink(gpsLink) {
                    if (gpsLink) {
                        window.open(gpsLink, '_blank');
                    } else {
                        alert('Link do lokalizacji GPS nie jest dostępny dla tego pojazdu.');
                    }
                }

                document.querySelectorAll('.legend-item').forEach(item => {
                    item.addEventListener('click', () => {
                        item.classList.toggle('inactive');
                        filterMarkers();
                    });
                });

                async function initDailyCounter() {
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
                    const counterRef = database.ref('counters/' + dateStr);
                    const counterSnapshot = await counterRef.once('value');
                    if (!counterSnapshot.exists()) {
                        await counterRef.set(0);
                    }
                }

                function refreshMarkers() {
                    loadMarkers();
                }

                window.deleteMarker = deleteMarker;
                window.openGPSLink = openGPSLink;

                initDailyCounter();
                loadMarkers();

                window.addEventListener('resize', () => {
                    map.invalidateSize();
                });

                // Dodaj przycisk do ręcznego odświeżania markerów
                const refreshButton = document.createElement('button');
                refreshButton.textContent = 'Odśwież markery';
                refreshButton.onclick = refreshMarkers;
                document.body.appendChild(refreshButton);

                // Funkcja wyszukiwania miasta
                function searchCity(city) {
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`)
                        .then(response => response.json())
                        .then(data => {
                            console.log('Otrzymane dane:', data);  // Sprawdzenie zwracanych danych
                            if (data.length > 0) {
                                const latitude = parseFloat(data[0].lat);
                                const longitude = parseFloat(data[0].lon);
                                map.setView([latitude, longitude], 12);
                            } else {
                                alert('Nie znaleziono miasta. Spróbuj ponownie.');
                            }
                        })
                        .catch(error => {
                            console.error('Błąd podczas wyszukiwania miasta:', error);
                            alert('Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.');
                        });
                }

                // Eventy dla wyszukiwania
                document.getElementById('searchButton').addEventListener('click', function() {
                    const query = document.getElementById('searchInput').value;
                    if (query) {
                        searchCity(query);
                    }
                });

                document.getElementById('searchInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const query = document.getElementById('searchInput').value;
                        if (query) {
                            searchCity(query);
                        }
                    }
                });

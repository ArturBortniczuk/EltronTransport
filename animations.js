// Funkcja tworząca marker z dynamicznie skalującą się ikoną
function createPulsingMarker(latitude, longitude, iconUrl) {
    const markerIcon = L.divIcon({
        className: 'pulsing-marker',
        html: `<div class="pulsing-icon" style="background-image: url('${iconUrl}'); width: 32px; height: 32px; background-size: contain;"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const marker = L.marker([latitude, longitude], { icon: markerIcon });
    marker.addTo(map);
    return marker;
}

// Przykład użycia markera
const myMarker = createPulsingMarker(52.0, 19.0, 'static/path/to/icon.png');

// Dynamiczne skalowanie ikon
map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    const scale = currentZoom / 10;

    const icons = document.querySelectorAll('.pulsing-icon');
    icons.forEach((icon) => {
        const newSize = 32 * scale;
        icon.style.width = `${newSize}px`;
        icon.style.height = `${newSize}px`;
        icon.style.backgroundSize = "contain";
    });
});

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

let startMarker = null;
let endMarker = null;
let routeControl = null;

// Funkcja obsługująca kliknięcie na mapie
map.on('click', function(e) {
    if (!startMarker) {
        // Dodanie pierwszego markera
        startMarker = L.marker(e.latlng).addTo(map);
    } else if (!endMarker) {
        // Dodanie drugiego markera
        endMarker = L.marker(e.latlng).addTo(map);

        // Wyznaczenie trasy
        if (routeControl) {
            map.removeControl(routeControl);
        }

        routeControl = L.Routing.control({
            waypoints: [
                startMarker.getLatLng(),
                endMarker.getLatLng()
            ],
            routeWhileDragging: true
        }).addTo(map);
    } else {
        // Zresetowanie, gdy oba markery są ustawione
        map.removeLayer(startMarker);
        map.removeLayer(endMarker);
        map.removeControl(routeControl);

        startMarker = null;
        endMarker = null;
        routeControl = null;
    }
});



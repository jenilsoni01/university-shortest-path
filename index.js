// Reset function
document.getElementById("reset-button").addEventListener("click", () => location.reload());

// Initialize the map
const map = L.map('mapi', {
    center: [23.12842, 72.54431],
    zoom: 16,
    // dragging: false,
    // zoomControl: false
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    minZoom: 15
}).addTo(map);


let fromCoords = null, toCoords = null, graph = {};
let total_coordinates= new Set();
let total_edges= new Set();

// Load roads data and build the graph
fetch('roads.geojson')
    .then(res => res.json())
    .then(data => {
        data.features
            .filter(feature => feature.properties.highway)
            .forEach(path => {
                L.geoJSON(path).addTo(map);
                addEdgesToGraph(path.geometry.coordinates);
            });
            updateInfo();
        });

        
function addEdgesToGraph(coordinates) {
    coordinates.forEach((coord, i) => {
        total_coordinates.add(coord.toString());
        if (i === coordinates.length - 1) return;
        const start = coord.toString(), end = coordinates[i + 1].toString();
        const distance = calculateDistance(coord, coordinates[i + 1]);

        graph[start] = { ...graph[start], [end]: distance };
        graph[end] = { ...graph[end], [start]: distance };

        total_edges.add(`${start}-${end}`);
    });
}


function updateInfo() {
    document.getElementById("vertices").textContent = total_coordinates.size;
    console.log('Nodes:');
    total_coordinates.forEach((i)=>{
        console.log(i);
    });
    document.getElementById("edges").textContent = total_edges.size;
    console.log('Edges:');
    total_edges.forEach((i)=>{
        console.log(i.toString());
    });
}

function calculateDistance([lon1, lat1], [lon2, lat2]) {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371e3, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let isFromSet = false;
map.on('click', e => {
    const activeInput = isFromSet ? document.getElementById("to") : document.getElementById("from");
    const coords = [e.latlng.lng, e.latlng.lat];
    activeInput.value = `(${coords[1].toFixed(5)}, ${coords[0].toFixed(5)})`
    L.marker(e.latlng).addTo(map).bindPopup(isFromSet ? "Destination" : "Starting Point").openPopup();
    if (isFromSet) toCoords = coords;
    else fromCoords = coords;

    isFromSet = !isFromSet;
});

document.getElementById('find-path').addEventListener('click', () => {
    if (!fromCoords || !toCoords) return alert('Please select both points.');

    const startNode = findNearestNode(fromCoords), endNode = findNearestNode(toCoords);
    const path = dijkstra(graph, startNode, endNode);
    // alert(-1);
    if (path.length) {
        console.log('Shortest Path:');
        console.log(path);
        visualizePath(path);
        // const allPaths = findAllPaths(graph, startNode, endNode);
        // displayAllPaths(allPaths);
    } else {
        alert('No path found!');
    }

});

// Dijkstra's algorithm implementation
function dijkstra(graph, start, end) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    // let show1 =[];

    for (let node in graph) {
        distances[node] = Infinity;
        unvisited.add(node);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
        let current = getClosestNode(distances, unvisited);
        if (current === end) {
            break;
        }
        // console.log(current.split(',')[0]);
        L.marker([current.split(',')[0],current.split(',')[1]]).addTo(map).openPopup();
        
        unvisited.delete(current);
        
        for (let neighbor in graph[current]) {
            const newDist = distances[current] + graph[current][neighbor];
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                previous[neighbor] = current;
            }
        }
    }
    // visualizePath1(show1);
    const path = [];
    let step = end;
    while (step) {
        path.push(step);
        step = previous[step];
    }
    return path.reverse();
}

function getClosestNode(distances, unvisited) {
    return [...unvisited].reduce((closest, node) => {
        return distances[node] < distances[closest] ? node : closest;
    });
}

function visualizePath(path) {
    const latLngs = path.map(node => node.split(',').map(Number).reverse());
    L.polyline(latLngs, { color: 'red', weight: 4 }).addTo(map).bringToFront();
    map.fitBounds(L.polyline(latLngs).getBounds());
}

function findNearestNode(coords) {
    return Object.keys(graph).reduce((nearest, node) => {
        return calculateDistance(coords, node.split(',').map(Number)) <
            calculateDistance(coords, nearest.split(',').map(Number)) ? node : nearest;
    });
}

// // Find all paths from source to destination using DFS
// function findAllPaths(graph, start, end, path = [], paths = []) {
//     path.push(start);

//     if (start === end) {
//         paths.push([...path]);
//     } else {
//         for (let neighbor in graph[start]) {
//             if (!path.includes(neighbor)) {
//                 findAllPaths(graph, neighbor, end, path, paths);
//             }
//         }
//     }

//     path.pop();
//     return paths;
// }

// // Display all paths in the DOM
// function displayAllPaths(paths) {
//     const pathsContainer = document.getElementById('all-paths');
//     pathsContainer.innerHTML = '';  // Clear previous paths

//     paths.forEach((path, index) => {
//         const pathElement = document.createElement('div');
//         pathElement.textContent = `Path ${index + 1}: ${path.join(' -> ')}`;
//         pathsContainer.appendChild(pathElement);
//     });
// }
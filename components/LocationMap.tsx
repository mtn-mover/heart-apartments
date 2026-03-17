'use client';

import { useEffect, useState } from 'react';

const locations = [
  {
    name: 'HEART 1–4',
    address: 'Centralstrasse 4, 3800 Interlaken',
    lat: 46.6844165,
    lng: 7.8553099,
  },
  {
    name: 'HEART 5',
    address: 'General-Guisan-Strasse 18, 3800 Interlaken',
    lat: 46.6824098,
    lng: 7.8549120,
  },
];

export default function LocationMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-slate-200 rounded-2xl h-80 flex items-center justify-center">
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  return <MapContent />;
}

function MapContent() {
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
  const L = require('leaflet');

  // Fix default marker icons for webpack/next.js
  const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Center between both locations
  const center: [number, number] = [
    (locations[0].lat + locations[1].lat) / 2,
    (locations[0].lng + locations[1].lng) / 2,
  ];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        className="h-80 rounded-2xl z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker key={loc.name} position={[loc.lat, loc.lng]} icon={icon}>
            <Popup>
              <strong>{loc.name}</strong>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}

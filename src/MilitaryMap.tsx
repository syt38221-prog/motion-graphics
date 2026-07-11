import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import maplibregl, { type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadFont } from "@remotion/google-fonts/Outfit";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// Coordinates
const MOSCOW: [number, number] = [37.6173, 55.7558];
const MAP_START_CENTER: [number, number] = [20.0, 52.0]; // Poland
const MAP_END_CENTER: [number, number] = [29.5, 55.5];   // Centered between Baltics and Moscow

interface Base {
  id: string;
  name: string;
  country: string;
  coords: [number, number];
  distance: string;
  type: string;
}

const BASES: Base[] = [
  { id: "tapa", name: "TAPA BASE", country: "ESTONIA", coords: [25.95, 59.26], distance: "860 KM", type: "NATO EFP BRIGADE" },
  { id: "pabrade", name: "PABRADĖ BASE", country: "LITHUANIA", coords: [25.77, 54.98], distance: "790 KM", type: "US HEAVY ARMOR" },
  { id: "lask", name: "ŁASK AIR BASE", country: "POLAND", coords: [19.18, 51.55], distance: "1,150 KM", type: "US AIR DETACHMENT" },
  { id: "redzikowo", name: "REDZIKOWO AEGIS", country: "POLAND", coords: [16.88, 54.48], distance: "1,350 KM", type: "US MISSILE DEFENSE" },
  { id: "mk", name: "MK AIR BASE", country: "ROMANIA", coords: [28.49, 44.33], distance: "1,330 KM", type: "US 101st AIRBORNE" },
];

// Helper to generate circular polygon coordinates
const getCircleCoordinates = (center: [number, number], radiusInKm: number, points = 64) => {
  const coords = [];
  const kmPerDegreeLng = 111.32 * Math.cos((center[1] * Math.PI) / 180);
  const kmPerDegreeLat = 110.574;
  const distanceLng = radiusInKm / kmPerDegreeLng;
  const distanceLat = radiusInKm / kmPerDegreeLat;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = center[0] + distanceLng * Math.cos(theta);
    const y = center[1] + distanceLat * Math.sin(theta);
    coords.push([x, y]);
  }
  coords.push(coords[0]); // Close polygon
  return coords;
};

export const MilitaryMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const [map, setMap] = useState<Map | null>(null);
  const [loadingHandle] = useState(() => delayRender("Loading Military Map"));

  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: MAP_START_CENTER,
      zoom: 3.8,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    mapInstance.on("load", () => {
      // 1. Add US/NATO bases source
      mapInstance.addSource("us-bases", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: BASES.map((base) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: base.coords },
            properties: { id: base.id, name: base.name, country: base.country, distance: base.distance },
          })),
        },
      });

      // Render base circles (outer pulse)
      mapInstance.addLayer({
        id: "base-outer-circles",
        type: "circle",
        source: "us-bases",
        paint: {
          "circle-color": "#00f2fe",
          "circle-radius": 15,
          "circle-opacity": 0.4,
          "circle-stroke-color": "#00f2fe",
          "circle-stroke-width": 1,
        },
      });

      // Render base inner dots
      mapInstance.addLayer({
        id: "base-inner-dots",
        type: "circle",
        source: "us-bases",
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": 6,
          "circle-stroke-color": "#00f2fe",
          "circle-stroke-width": 2,
        },
      });

      // Base labels
      mapInstance.addLayer({
        id: "base-labels",
        type: "symbol",
        source: "us-bases",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 16,
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#00f2fe",
          "text-halo-color": "#080612",
          "text-halo-width": 3,
        },
      });

      // 2. Add Moscow source
      mapInstance.addSource("moscow-source", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: MOSCOW },
          properties: { name: "MOSCOW (HQ)" },
        },
      });

      mapInstance.addLayer({
        id: "moscow-dot",
        type: "circle",
        source: "moscow-source",
        paint: {
          "circle-color": "#ff003c",
          "circle-radius": 12,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      mapInstance.addLayer({
        id: "moscow-label",
        type: "symbol",
        source: "moscow-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 20,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ff003c",
          "text-halo-color": "#080612",
          "text-halo-width": 3,
        },
      });

      // 3. Add range rings centered on Moscow
      const ringDistances = [500, 1000, 1500];
      ringDistances.forEach((dist) => {
        mapInstance.addSource(`range-ring-${dist}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [getCircleCoordinates(MOSCOW, dist)],
            },
            properties: {},
          },
        });

        mapInstance.addLayer({
          id: `range-ring-line-${dist}`,
          type: "line",
          source: `range-ring-${dist}`,
          paint: {
            "line-color": "#ff003c",
            "line-width": 1.5,
            "line-opacity": 0.4,
            "line-dasharray": [4, 4],
          },
        });
      });

      // 4. Add target lines connecting bases to Moscow
      BASES.forEach((base) => {
        mapInstance.addSource(`line-${base.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [base.coords, base.coords], // Start collapsed
            },
            properties: {},
          },
        });

        mapInstance.addLayer({
          id: `line-layer-${base.id}`,
          type: "line",
          source: `line-${base.id}`,
          paint: {
            "line-color": "#00f2fe",
            "line-width": 2,
            "line-opacity": 0.6,
            "line-dasharray": [3, 3],
          },
        });
      });

      mapInstance.once("idle", () => {
        setMap(mapInstance);
        continueRender(loadingHandle);
      });
    });
  }, [continueRender, loadingHandle]);

  // Per-frame map updates
  useEffect(() => {
    if (!map) return;

    const handle = delayRender("Map frame rendering");

    // Camera Flight Phase (frame 40 -> 180)
    let center = MAP_START_CENTER;
    let zoom = 3.8;
    let pitch = 25;

    if (frame > 40 && frame <= 180) {
      const flightProgress = interpolate(frame, [40, 180], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });

      const lng = interpolate(flightProgress, [0, 1], [MAP_START_CENTER[0], MAP_END_CENTER[0]]);
      const lat = interpolate(flightProgress, [0, 1], [MAP_START_CENTER[1], MAP_END_CENTER[1]]);
      center = [lng, lat];

      zoom = interpolate(flightProgress, [0, 1], [3.8, 4.8]);
      pitch = interpolate(flightProgress, [0, 1], [25, 35]);
    } else if (frame > 180) {
      center = MAP_END_CENTER;
      zoom = 4.8;
      pitch = 35;
    }

    // Animate target lines from bases to Moscow (frame 70 -> 140)
    BASES.forEach((base) => {
      const lineSource = map.getSource(`line-${base.id}`);
      if (lineSource && frame >= 70) {
        const progress = interpolate(frame, [70, 140], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });

        // Interpolate coordinates along the line
        const currentLng = interpolate(progress, [0, 1], [base.coords[0], MOSCOW[0]]);
        const currentLat = interpolate(progress, [0, 1], [base.coords[1], MOSCOW[1]]);

        (lineSource as any).setData({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [base.coords, [currentLng, currentLat]],
          },
        });
      }
    });

    // Base Pulsing outer radius (sine wave)
    const basePulseRadius = interpolate(Math.sin(frame * 0.1), [-1, 1], [10, 22]);
    const basePulseOpacity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.6, 0.2]);
    map.setPaintProperty("base-outer-circles", "circle-radius", basePulseRadius);
    map.setPaintProperty("base-outer-circles", "circle-opacity", basePulseOpacity);

    // Moscow Pulse
    const moscowPulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [10, 25]);
    map.setPaintProperty("moscow-dot", "circle-radius", moscowPulse);

    // Update Camera
    map.jumpTo({
      center,
      zoom,
      pitch,
    });

    map.once("idle", () => continueRender(handle));
    map.triggerRepaint();
  }, [frame, map, delayRender, continueRender]);

  // HUD layout animations
  const headerOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hudOpacity = interpolate(frame, [60, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const targetAlertOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulseAlert = frame % 30 < 15 ? 1 : 0.4;

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: "#080612", overflow: "hidden" }}>
      {/* Map Container */}
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />

      {/* Grid overlay for tactical theme */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(to right, rgba(0, 242, 254, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 242, 254, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle, transparent 30%, rgba(8, 6, 18, 0.9) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Radar Sweep simulation using a radial gradient with conic angle rotation */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: `conic-gradient(from ${frame * 1.5}deg at 50% 50%, rgba(0, 242, 254, 0.05) 0deg, transparent 90deg, transparent 360deg)`,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />

      {/* Floating HUD Header (Top Left) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          background: "rgba(8, 6, 18, 0.8)",
          backdropFilter: "blur(16px)",
          border: "2px solid rgba(0, 242, 254, 0.25)",
          padding: "24px 40px",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          opacity: headerOpacity,
          zIndex: 100,
        }}
      >
        <span
          style={{
            color: "#00f2fe",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          TACTICAL MONITORING UNIT
        </span>
        <h2 style={{ margin: "8px 0 0 0", fontSize: 42, fontWeight: 700, color: "#ffffff" }}>
          Eastern Flank Deployment
        </h2>
      </div>

      {/* Target Alert (Top Right) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 80,
          background: "rgba(255, 0, 60, 0.15)",
          backdropFilter: "blur(12px)",
          border: "2px solid #ff003c",
          padding: "20px 35px",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: targetAlertOpacity,
          transform: `opacity 0.2s ease`,
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#ff003c",
            opacity: pulseAlert,
            boxShadow: "0 0 10px #ff003c",
          }}
        />
        <div>
          <span style={{ color: "#ff003c", fontSize: 16, fontWeight: 900, letterSpacing: "0.2em" }}>
            ALERT: TARGET LOCK
          </span>
          <div style={{ color: "#ffffff", fontSize: 26, fontWeight: 700 }}>
            MOSCOW HQ RANGE DETECTED
          </div>
        </div>
      </div>

      {/* Base info HUD Panel (Left Side) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          width: 520,
          background: "rgba(8, 6, 18, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 20,
          padding: 30,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
          opacity: hudOpacity,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}>
            US/NATO STRATEGIC BASES
          </span>
          <span style={{ color: "#00f2fe", fontSize: 14, fontFamily: "monospace" }}>
            SYS_VER: 4.82
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {BASES.map((base) => (
            <div
              key={base.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.02)",
                borderLeft: "4px solid #00f2fe",
                borderRadius: 4,
              }}
            >
              <div>
                <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 700 }}>{base.name}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{base.type}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#00f2fe", fontSize: 18, fontWeight: 700 }}>{base.distance}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>TO TARGET</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coordinate & System Status Overlay (Bottom Right) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          background: "rgba(8, 6, 18, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "20px 30px",
          borderRadius: 12,
          fontFamily: "monospace",
          fontSize: 16,
          color: "rgba(255,255,255,0.7)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 100,
        }}
      >
        <div>SYSTEM STATUS: ONLINE</div>
        <div>TARGET LAT: 55.7558° N</div>
        <div>TARGET LNG: 37.6173° E</div>
        <div style={{ color: "#ff003c" }}>MISSILE APEX: LOCK ACTIVE</div>
      </div>
    </AbsoluteFill>
  );
};

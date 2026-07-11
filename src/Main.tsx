import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";
import maplibregl, { type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadFont } from "@remotion/google-fonts/Outfit";
import usStates from "./us-states.json";
import { US_FLAG_BASE64 } from "./us-flag-base64";


const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// US Center and Europe Center coords
const US_CENTER: [number, number] = [-98.5795, 39.8283];
const EU_CENTER: [number, number] = [15.2551, 50.8654];

// Calculate translation offset
const DELTA_LNG = EU_CENTER[0] - US_CENTER[0]; // ~ 113.8346
const DELTA_LAT = EU_CENTER[1] - US_CENTER[1]; // ~ 11.0371

// Generate shifted GeoJSON once at module level
const getShiftedGeoJSON = () => {
  const shifted = JSON.parse(JSON.stringify(usStates));

  shifted.features.forEach((feature: any) => {
    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates = feature.geometry.coordinates.map((ring: any) =>
        ring.map((coord: [number, number]) => [coord[0] + DELTA_LNG, coord[1] + DELTA_LAT])
      );
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates = feature.geometry.coordinates.map((polygon: any) =>
        polygon.map((ring: any) =>
          ring.map((coord: [number, number]) => [coord[0] + DELTA_LNG, coord[1] + DELTA_LAT])
        )
      );
    }
  });

  return shifted;
};

const shiftedUsStates = getShiftedGeoJSON();

export const Main: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const [map, setMap] = useState<Map | null>(null);
  const [loadingHandle] = useState(() => delayRender("Loading MapLibre map"));

  useEffect(() => {
    if (!containerRef.current) return;

    // Use CartoDB Dark Matter style for a premium dark neon aesthetic
    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: US_CENTER,
      zoom: 3.5,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    mapInstance.on("load", () => {
      // Create Image object for Base64 flag pattern
      const img = new window.Image();
      img.onload = () => {
        if (!mapInstance.hasImage("us-flag-pattern")) {
          mapInstance.addImage("us-flag-pattern", img);
        }

        // 1. Original US States layers
        mapInstance.addSource("us-states-original", {
          type: "geojson",
          data: usStates,
        });

        mapInstance.addLayer({
          id: "us-original-fill",
          type: "fill",
          source: "us-states-original",
          paint: {
            "fill-color": "#00f2fe",
            "fill-opacity": 0.25,
          },
        });

        mapInstance.addLayer({
          id: "us-original-border",
          type: "line",
          source: "us-states-original",
          paint: {
            "line-color": "#00f2fe",
            "line-width": 3,
            "line-opacity": 0.8,
          },
        });

        // 2. Shifted US States layers (fills with Flag image)
        mapInstance.addSource("us-states-shifted", {
          type: "geojson",
          data: shiftedUsStates,
        });

        mapInstance.addLayer({
          id: "us-shifted-fill",
          type: "fill",
          source: "us-states-shifted",
          paint: {
            "fill-pattern": "us-flag-pattern",
            "fill-opacity": 0,
          },
        });

        mapInstance.addLayer({
          id: "us-shifted-border",
          type: "line",
          source: "us-states-shifted",
          paint: {
            "line-color": "#ffd700", // Gold border for majestic contrast
            "line-width": 4,
            "line-opacity": 0,
          },
        });

        // 3. Add European reference city markers
        mapInstance.addSource("eu-cities", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [-9.1393, 38.7223] },
                properties: { name: "Portugal (Lisbon)" },
              },
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [4.3517, 50.8503] },
                properties: { name: "Belgium (Brussels)" },
              },
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [17.1077, 48.1486] },
                properties: { name: "Slovakia (Bratislava)" },
              },
            ],
          },
        });

        mapInstance.addLayer({
          id: "eu-city-dots",
          type: "circle",
          source: "eu-cities",
          paint: {
            "circle-color": "#00f2fe",
            "circle-radius": 10,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        mapInstance.addLayer({
          id: "eu-city-labels",
          type: "symbol",
          source: "eu-cities",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 22,
            "text-offset": [0, 1.3],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#080612",
            "text-halo-width": 3,
          },
        });

        // Initial camera position
        mapInstance.jumpTo({
          center: US_CENTER,
          zoom: 3.5,
          pitch: 20,
          bearing: 0,
        });

        mapInstance.once("idle", () => {
          setMap(mapInstance);
          continueRender(loadingHandle);
        });
      };
      img.src = US_FLAG_BASE64;
    });
  }, [continueRender, loadingHandle]);

  // Per-frame map updates
  useEffect(() => {
    if (!map) return;

    const handle = delayRender("Rendering MapLibre frame");

    // Camera Flight Phase (frame 60 -> 150)
    let center = US_CENTER;
    let zoom = 3.5;
    let pitch = 20;

    if (frame > 60 && frame <= 150) {
      const flightProgress = interpolate(frame, [60, 150], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });

      const lng = interpolate(flightProgress, [0, 1], [US_CENTER[0], EU_CENTER[0]]);
      const lat = interpolate(flightProgress, [0, 1], [US_CENTER[1], EU_CENTER[1]]);
      center = [lng, lat];

      zoom = interpolate(flightProgress, [0, 0.5, 1], [3.5, 1.8, 3.5]);
      pitch = interpolate(flightProgress, [0, 0.5, 1], [20, 40, 20]);
    } else if (frame > 150) {
      center = EU_CENTER;
      zoom = 3.5;
      pitch = 20;
    }

    // Transition Overlay Phase (frame 150 -> 180)
    let originalFillOpacity = 0.25;
    let originalBorderOpacity = 0.8;
    let shiftedFillOpacity = 0.0;
    let shiftedBorderOpacity = 0.0;

    if (frame > 150 && frame <= 180) {
      const transitionProgress = interpolate(frame, [150, 180], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });

      originalFillOpacity = interpolate(transitionProgress, [0, 1], [0.25, 0]);
      originalBorderOpacity = interpolate(transitionProgress, [0, 1], [0.8, 0]);
      
      // Reveal the U.S. flag pattern fill (max 0.65 opacity for visual map clarity underneath)
      shiftedFillOpacity = interpolate(transitionProgress, [0, 1], [0, 0.65]);
      shiftedBorderOpacity = interpolate(transitionProgress, [0, 1], [0, 0.9]);
    } else if (frame > 180) {
      originalFillOpacity = 0;
      originalBorderOpacity = 0;
      shiftedFillOpacity = 0.65;
      shiftedBorderOpacity = 0.9;
    }

    // Apply fast paint updates (updates WebGL uniforms without re-tessellating geometries)
    map.setPaintProperty("us-original-fill", "fill-opacity", originalFillOpacity);
    map.setPaintProperty("us-original-border", "line-opacity", originalBorderOpacity);
    map.setPaintProperty("us-shifted-fill", "fill-opacity", shiftedFillOpacity);
    map.setPaintProperty("us-shifted-border", "line-opacity", shiftedBorderOpacity);

    // Apply Camera
    map.jumpTo({
      center,
      zoom,
      pitch,
    });

    map.once("idle", () => continueRender(handle));
    map.triggerRepaint();
  }, [frame, map, delayRender, continueRender]);

  // Card & Text Animations
  const cardOpacity = interpolate(frame, [185, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardTranslateY = interpolate(frame, [185, 205], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const headerOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelOpacity = interpolate(frame, [65, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily, overflow: "hidden" }}>
      {/* MapLibre Container */}
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />

      {/* Floating HUD Header (Top Left) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          background: "rgba(8, 6, 18, 0.75)",
          backdropFilter: "blur(12px)",
          border: "2px solid rgba(0, 242, 254, 0.2)",
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
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Geo-Spatial Scale
        </span>
        <h2 style={{ margin: "8px 0 0 0", fontSize: 44, fontWeight: 700, color: "#ffffff" }}>
          {frame < 150 ? "United States (Contiguous)" : "Continental Scale"}
        </h2>
      </div>

      {/* Trans-Atlantic flight label */}
      {frame >= 60 && frame < 150 && (
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(8, 6, 18, 0.8)",
            padding: "16px 32px",
            borderRadius: 30,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            fontSize: 28,
            fontWeight: 700,
            opacity: labelOpacity,
            letterSpacing: "0.1em",
            zIndex: 100,
          }}
        >
          FLIGHT PATH: USA ➔ EUROPE
        </div>
      )}

      {/* Comparison HUD Panel (Bottom Right) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          width: 580,
          background: "rgba(8, 6, 18, 0.85)",
          backdropFilter: "blur(20px)",
          border: "2px solid rgba(255, 215, 0, 0.3)", // Gold accent border
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255, 215, 0, 0.05)",
          opacity: cardOpacity,
          transform: `translate3d(0, ${cardTranslateY}px, 0)`,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <span
          style={{
            color: "#ffd700",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.15em",
          }}
        >
          CINEMATIC OVERLAY ACTIVE
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 38,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
          }}
        >
          US Flag Over Europe
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 24,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          The contiguous United States stretches completely across Europe. It spans from Lisbon, Portugal
          in the west, covers Brussels, Belgium, and extends all the way past Bratislava, Slovakia in the east.
        </p>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>West Coast Bound</span>
            <span style={{ color: "#ffd700", fontWeight: 700 }}>Portugal (Lisbon)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Central Alignment</span>
            <span style={{ color: "#ffd700", fontWeight: 700 }}>Belgium (Brussels)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>East Coast Bound</span>
            <span style={{ color: "#ffd700", fontWeight: 700 }}>Slovakia (Bratislava)</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

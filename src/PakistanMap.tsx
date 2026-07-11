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
import pakistanGeoJSON from "./pakistan.json";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

const PAKISTAN_CENTER: [number, number] = [69.3451, 30.3753];
const GLOBE_CENTER: [number, number] = [55.0, 20.0];

// Helper to draw a star
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
};

// Draw Pakistan flag dynamically on a canvas
const getPakistanFlagBase64 = (): string => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = canvas.width;
  const h = canvas.height;

  // Dark green background (official shade: #01411C)
  ctx.fillStyle = "#01411C";
  ctx.fillRect(0, 0, w, h);

  // White stripe on the left (1/4 of width)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w / 4, h);

  // Center of green part (3/4 of width)
  const greenW = (3 * w) / 4;
  const centerX = w / 4 + greenW / 2;
  const centerY = h / 2;

  // Crescent circle (white)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, h * 0.28, 0, 2 * Math.PI);
  ctx.fill();

  // Crescent cutout (green)
  ctx.fillStyle = "#01411C";
  ctx.beginPath();
  // Offset slightly top-right to form crescent shape
  ctx.arc(centerX + h * 0.08, centerY - h * 0.05, h * 0.26, 0, 2 * Math.PI);
  ctx.fill();

  // White 5-pointed star
  drawStar(ctx, centerX + h * 0.14, centerY - h * 0.1, 5, h * 0.09, h * 0.04);

  return canvas.toDataURL();
};

export const PakistanMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const [map, setMap] = useState<Map | null>(null);
  const [loadingHandle] = useState(() => delayRender("Loading Pakistan Map"));

  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: GLOBE_CENTER,
      zoom: 1.5,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    mapInstance.on("load", () => {
      const flagBase64 = getPakistanFlagBase64();
      const img = new window.Image();
      img.onload = () => {
        if (!mapInstance.hasImage("pak-flag-pattern")) {
          mapInstance.addImage("pak-flag-pattern", img);
        }

        // Add Pakistan GeoJSON source
        mapInstance.addSource("pakistan-boundary", {
          type: "geojson",
          data: pakistanGeoJSON as any,
        });

        // 1. Pakistan flag fill layer
        mapInstance.addLayer({
          id: "pak-flag-fill",
          type: "fill",
          source: "pakistan-boundary",
          paint: {
            "fill-pattern": "pak-flag-pattern",
            "fill-opacity": 0,
          },
        });

        // 2. Bold white border layer
        mapInstance.addLayer({
          id: "pak-border",
          type: "line",
          source: "pakistan-boundary",
          paint: {
            "line-color": "#ffffff",
            "line-width": 5,
            "line-opacity": 0,
          },
        });

        mapInstance.once("idle", () => {
          setMap(mapInstance);
          continueRender(loadingHandle);
        });
      };
      img.src = flagBase64;
    });
  }, [continueRender, loadingHandle]);

  // Per-frame map animations
  useEffect(() => {
    if (!map) return;

    const handle = delayRender("Rendering Pakistan Map frame");

    // Camera fly-in animation (frame 20 -> 90)
    let center = GLOBE_CENTER;
    let zoom = 1.5;
    let pitch = 0;

    if (frame > 20 && frame <= 90) {
      const progress = interpolate(frame, [20, 90], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 1, 0.3, 1), // Swift ease-out
      });

      const lng = interpolate(progress, [0, 1], [GLOBE_CENTER[0], PAKISTAN_CENTER[0]]);
      const lat = interpolate(progress, [0, 1], [GLOBE_CENTER[1], PAKISTAN_CENTER[1]]);
      center = [lng, lat];

      zoom = interpolate(progress, [0, 1], [1.5, 5.5]);
      pitch = interpolate(progress, [0, 1], [0, 20]);
    } else if (frame > 90) {
      center = PAKISTAN_CENTER;
      zoom = 5.5;
      pitch = 20;
    }

    // Bold white outline animation (frame 80 -> 110)
    let borderOpacity = 0;
    if (frame > 80 && frame <= 110) {
      borderOpacity = interpolate(frame, [80, 110], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame > 110) {
      borderOpacity = 1;
    }

    // Flag fill animation (frame 105 -> 140)
    let flagOpacity = 0;
    if (frame > 105 && frame <= 140) {
      flagOpacity = interpolate(frame, [105, 140], [0, 0.85], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
    } else if (frame > 140) {
      flagOpacity = 0.85;
    }

    map.setPaintProperty("pak-border", "line-opacity", borderOpacity);
    map.setPaintProperty("pak-flag-fill", "fill-opacity", flagOpacity);

    map.jumpTo({
      center,
      zoom,
      pitch,
    });

    map.once("idle", () => continueRender(handle));
    map.triggerRepaint();
  }, [frame, map, delayRender, continueRender]);

  // HUD and title opacity transitions
  const headerOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hudOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: "#080612", overflow: "hidden" }}>
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />

      {/* Grid overlay for tech look */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
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
          background: "radial-gradient(circle, transparent 40%, rgba(8, 6, 18, 0.9) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Header (Top Left) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          background: "rgba(8, 6, 18, 0.8)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "24px 40px",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          opacity: headerOpacity,
          zIndex: 100,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
        >
          GLOBAL MAP ZOOM
        </span>
        <h2 style={{ margin: "8px 0 0 0", fontSize: 44, fontWeight: 700, color: "#ffffff" }}>
          Islamic Republic of Pakistan
        </h2>
      </div>

      {/* Info Card Overlay (Bottom Right) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          width: 480,
          background: "rgba(8, 6, 18, 0.85)",
          backdropFilter: "blur(20px)",
          border: "2px solid #ffffff", // White accent border
          borderRadius: 24,
          padding: 40,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
          opacity: hudOpacity,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <span
          style={{
            color: "#01411C",
            background: "#ffffff",
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 900,
            alignSelf: "flex-start",
            letterSpacing: "0.1em",
          }}
        >
          PAKISTAN
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
          }}
        >
          National Boundary
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          Located at the crossroads of South Asia, Central Asia, and the Middle East, spanning a diverse landscape of peaks and coastlines.
        </p>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 15,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 18,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Capital</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>Islamabad</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Total Area</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>796,095 km²</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Center Coordinates</span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>30.3753° N, 69.3451° E</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

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
import indiaGeoJSON from "./india.json";
import afghanistanGeoJSON from "./afghanistan.json";
import iranGeoJSON from "./iran.json";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

const PAKISTAN_CENTER: [number, number] = [69.3451, 30.3753];
const GLOBE_CENTER: [number, number] = [55.0, 20.0];
const BORDER_FOCUS_CENTER: [number, number] = [73.5, 30.5];
const INDIA_CENTER: [number, number] = [78.9629, 22.5937];
const WESTERN_CENTER: [number, number] = [62.0, 32.0];

// Custom Radcliffe Line coordinates
const PARTITION_BORDER_GEOJSON = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [68.16, 23.63],
      [69.60, 24.50],
      [70.3, 26.0],
      [71.5, 27.8],
      [72.3, 28.5],
      [73.5, 29.8],
      [74.3, 31.0],
      [74.6, 32.5],
      [74.3, 33.5],
      [75.0, 34.2],
      [76.0, 34.6],
      [77.0, 34.8],
    ],
  },
};

// Canvas drawing utilities
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string = "#ffffff"
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
  ctx.fillStyle = color;
  ctx.fill();
};

const getPakistanFlagBase64 = (): string => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#01411C";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w / 4, h);

  const greenW = (3 * w) / 4;
  const centerX = w / 4 + greenW / 2;
  const centerY = h / 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, h * 0.28, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = "#01411C";
  ctx.beginPath();
  ctx.arc(centerX + h * 0.08, centerY - h * 0.05, h * 0.26, 0, 2 * Math.PI);
  ctx.fill();

  drawStar(ctx, centerX + h * 0.14, centerY - h * 0.1, 5, h * 0.09, h * 0.04);
  return canvas.toDataURL();
};

const getIndiaFlagBase64 = (): string => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = canvas.width;
  const h = canvas.height;
  const stripeH = h / 3;

  ctx.fillStyle = "#FF9933";
  ctx.fillRect(0, 0, w, stripeH);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, stripeH, w, stripeH);

  ctx.fillStyle = "#138808";
  ctx.fillRect(0, stripeH * 2, w, stripeH);

  const cx = w / 2;
  const cy = h / 2;
  const radius = stripeH * 0.4;
  ctx.strokeStyle = "#000080";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#000080";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.15, 0, 2 * Math.PI);
  ctx.fill();

  for (let i = 0; i < 24; i++) {
    const angle = (i * 2 * Math.PI) / 24;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }

  return canvas.toDataURL();
};

const getAfghanistanFlagBase64 = (): string => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = canvas.width;
  const h = canvas.height;
  const colW = w / 3;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, colW, h);

  ctx.fillStyle = "#D32011";
  ctx.fillRect(colW, 0, colW, h);

  ctx.fillStyle = "#007A33";
  ctx.fillRect(colW * 2, 0, colW, h);

  // Simplified national emblem shape in center (white outline)
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.18, 0, Math.PI, true);
  ctx.stroke();

  return canvas.toDataURL();
};

const getIranFlagBase64 = (): string => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 146;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = canvas.width;
  const h = canvas.height;
  const stripeH = h / 3;

  ctx.fillStyle = "#239E46";
  ctx.fillRect(0, 0, w, stripeH);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, stripeH, w, stripeH);

  ctx.fillStyle = "#DA0000";
  ctx.fillRect(0, stripeH * 2, w, stripeH);

  // Simplified red emblem shape in center
  ctx.fillStyle = "#DA0000";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, stripeH * 0.4, 0, 2 * Math.PI);
  ctx.fill();

  return canvas.toDataURL();
};

export const PakistanMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const [map, setMap] = useState<Map | null>(null);
  const [loadingHandle] = useState(() => delayRender("Loading Maps Environment"));

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
      // 1. Prepare flags base64
      const pakFlag = getPakistanFlagBase64();
      const indFlag = getIndiaFlagBase64();
      const afgFlag = getAfghanistanFlagBase64();
      const irnFlag = getIranFlagBase64();

      const imagesToLoad = [
        { name: "pattern-pak", src: pakFlag },
        { name: "pattern-ind", src: indFlag },
        { name: "pattern-afg", src: afgFlag },
        { name: "pattern-irn", src: irnFlag },
      ];

      let loadedCount = 0;
      imagesToLoad.forEach((imgObj) => {
        const img = new window.Image();
        img.onload = () => {
          mapInstance.addImage(imgObj.name, img);
          loadedCount++;
          if (loadedCount === imagesToLoad.length) {
            setupLayers();
          }
        };
        img.src = imgObj.src;
      });

      function setupLayers() {
        // Pakistan Source & Layers
        mapInstance.addSource("source-pakistan", {
          type: "geojson",
          data: pakistanGeoJSON as any,
        });
        mapInstance.addLayer({
          id: "fill-pakistan",
          type: "fill",
          source: "source-pakistan",
          paint: { "fill-pattern": "pattern-pak", "fill-opacity": 0 },
        });
        mapInstance.addLayer({
          id: "border-pakistan",
          type: "line",
          source: "source-pakistan",
          paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 0 },
        });

        // Partition Border Line Source & Layers
        mapInstance.addSource("source-radcliffe", {
          type: "geojson",
          data: PARTITION_BORDER_GEOJSON as any,
        });
        // Broad red blur to represent lack of natural defenses
        mapInstance.addLayer({
          id: "glow-radcliffe",
          type: "line",
          source: "source-radcliffe",
          paint: {
            "line-color": "#ff0000",
            "line-width": 35,
            "line-blur": 15,
            "line-opacity": 0,
          },
        });
        // Bold red line representing Radcliffe Line
        mapInstance.addLayer({
          id: "line-radcliffe",
          type: "line",
          source: "source-radcliffe",
          paint: {
            "line-color": "#ff3333",
            "line-width": 6,
            "line-opacity": 0,
          },
        });

        // India Source & Layers
        mapInstance.addSource("source-india", {
          type: "geojson",
          data: indiaGeoJSON as any,
        });
        mapInstance.addLayer({
          id: "fill-india",
          type: "fill",
          source: "source-india",
          paint: { "fill-pattern": "pattern-ind", "fill-opacity": 0 },
        });
        mapInstance.addLayer({
          id: "border-india",
          type: "line",
          source: "source-india",
          paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0 },
        });

        // Afghanistan Source & Layers
        mapInstance.addSource("source-afghanistan", {
          type: "geojson",
          data: afghanistanGeoJSON as any,
        });
        mapInstance.addLayer({
          id: "fill-afghanistan",
          type: "fill",
          source: "source-afghanistan",
          paint: { "fill-pattern": "pattern-afg", "fill-opacity": 0 },
        });
        mapInstance.addLayer({
          id: "border-afghanistan",
          type: "line",
          source: "source-afghanistan",
          paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 0 },
        });

        // Iran Source & Layers
        mapInstance.addSource("source-iran", {
          type: "geojson",
          data: iranGeoJSON as any,
        });
        mapInstance.addLayer({
          id: "fill-iran",
          type: "fill",
          source: "source-iran",
          paint: { "fill-pattern": "pattern-irn", "fill-opacity": 0 },
        });
        mapInstance.addLayer({
          id: "border-iran",
          type: "line",
          source: "source-iran",
          paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 0 },
        });

        let initialLoaded = false;
        const finishInitialLoad = () => {
          if (!initialLoaded) {
            initialLoaded = true;
            setMap(mapInstance);
            continueRender(loadingHandle);
          }
        };
        mapInstance.once("idle", finishInitialLoad);
        mapInstance.once("render", finishInitialLoad);
        setTimeout(finishInitialLoad, 5000); // 5 second failsafe for initial load
      }
    });
  }, [continueRender, loadingHandle]);

  // Per-frame map and camera animations
  useEffect(() => {
    if (!map) return;

    const handle = delayRender("Rendering current frame");

    let center = GLOBE_CENTER;
    let zoom = 1.5;
    let pitch = 0;
    let bearing = 0;

    let borderPakOpacity = 0;
    let fillPakOpacity = 0;

    let borderIndOpacity = 0;
    let fillIndOpacity = 0;

    let borderAfgOpacity = 0;
    let fillAfgOpacity = 0;

    let borderIrnOpacity = 0;
    let fillIrnOpacity = 0;

    let radcliffeOpacity = 0;

    // --- SCENE SEQUENCING SYSTEM ---

    // SCENE 1: Globe to Pakistan Zoom-in (Frames 0 -> 90)
    if (frame <= 90) {
      if (frame > 20) {
        const progress = interpolate(frame, [20, 80], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.25, 1, 0.3, 1),
        });
        center = [
          interpolate(progress, [0, 1], [GLOBE_CENTER[0], PAKISTAN_CENTER[0]]),
          interpolate(progress, [0, 1], [GLOBE_CENTER[1], PAKISTAN_CENTER[1]]),
        ];
        zoom = interpolate(progress, [0, 1], [1.5, 5.5]);
        pitch = interpolate(progress, [0, 1], [0, 20]);
      } else {
        center = GLOBE_CENTER;
        zoom = 1.5;
      }

      // Draw outline (80 -> 90)
      borderPakOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      fillPakOpacity = interpolate(frame, [75, 90], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    }

    // SCENE 2: Border Focus & Radcliffe Line (Frames 90 -> 180)
    else if (frame > 90 && frame <= 180) {
      borderPakOpacity = 1;
      fillPakOpacity = 0.85;

      // Swift pan and tilt focus to the border
      const progress = interpolate(frame, [90, 110], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });

      center = [
        interpolate(progress, [0, 1], [PAKISTAN_CENTER[0], BORDER_FOCUS_CENTER[0]]),
        interpolate(progress, [0, 1], [PAKISTAN_CENTER[1], BORDER_FOCUS_CENTER[1]]),
      ];
      zoom = interpolate(progress, [0, 1], [5.5, 6.8]);
      pitch = interpolate(progress, [0, 1], [20, 50]);
      bearing = interpolate(progress, [0, 1], [0, 35]);

      // Radcliffe outline & Glow reveal (110 -> 145)
      radcliffeOpacity = interpolate(frame, [110, 140], [0, 0.8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }

    // SCENE 3: India Focus & Military Pulse (Frames 180 -> 300)
    else if (frame > 180 && frame <= 300) {
      borderPakOpacity = 1;
      fillPakOpacity = 0.85;

      // Shift camera eastward to India
      const progress = interpolate(frame, [180, 210], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 1, 0.3, 1),
      });

      const baseCenter: [number, number] = [
        interpolate(progress, [0, 1], [BORDER_FOCUS_CENTER[0], INDIA_CENTER[0]]),
        interpolate(progress, [0, 1], [BORDER_FOCUS_CENTER[1], INDIA_CENTER[1]]),
      ];

      pitch = interpolate(progress, [0, 1], [50, 15]);
      bearing = interpolate(progress, [0, 1], [35, 0]);

      // Fast zoom-in/out pulse effect (Frames 220 -> 280)
      let pulseZoom = interpolate(progress, [0, 1], [6.8, 4.4]);
      if (frame > 220 && frame <= 280) {
        // Oscillating pulse values to visualize conflict tension
        const t = (frame - 220) / 60; // 0 to 1
        const wave = Math.sin(t * Math.PI * 3); // 3 complete cycles
        pulseZoom = 4.4 + wave * 0.45;
      }
      zoom = pulseZoom;
      center = baseCenter;

      // Reveal India outline and fill
      borderIndOpacity = interpolate(frame, [200, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      fillIndOpacity = interpolate(frame, [215, 235], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    }

    // SCENE 4: Pan Westward to Afghanistan & Iran (Frames 300 -> 420)
    else if (frame > 300) {
      borderPakOpacity = 1;
      fillPakOpacity = 0.85;
      borderIndOpacity = 1;
      fillIndOpacity = 0.8;

      // Pan camera westward
      const progress = interpolate(frame, [300, 335], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 1, 0.3, 1),
      });

      center = [
        interpolate(progress, [0, 1], [INDIA_CENTER[0], WESTERN_CENTER[0]]),
        interpolate(progress, [0, 1], [INDIA_CENTER[1], WESTERN_CENTER[1]]),
      ];
      zoom = interpolate(progress, [0, 1], [4.4, 4.1]);
      pitch = interpolate(progress, [0, 1], [15, 30]);
      bearing = interpolate(progress, [0, 1], [0, -10]);

      // Outline and fill Afghanistan (330 -> 365)
      borderAfgOpacity = interpolate(frame, [325, 345], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      fillAfgOpacity = interpolate(frame, [335, 360], [0, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

      // Outline and fill Iran (360 -> 395)
      borderIrnOpacity = interpolate(frame, [355, 375], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      fillIrnOpacity = interpolate(frame, [365, 390], [0, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    }

    // Apply computed map properties
    map.setPaintProperty("border-pakistan", "line-opacity", borderPakOpacity);
    map.setPaintProperty("fill-pakistan", "fill-opacity", fillPakOpacity);

    map.setPaintProperty("glow-radcliffe", "line-opacity", radcliffeOpacity * 0.45);
    map.setPaintProperty("line-radcliffe", "line-opacity", radcliffeOpacity);

    map.setPaintProperty("border-india", "line-opacity", borderIndOpacity);
    map.setPaintProperty("fill-india", "fill-opacity", fillIndOpacity);

    map.setPaintProperty("border-afghanistan", "line-opacity", borderAfgOpacity);
    map.setPaintProperty("fill-afghanistan", "fill-opacity", fillAfgOpacity);

    map.setPaintProperty("border-iran", "line-opacity", borderIrnOpacity);
    map.setPaintProperty("fill-iran", "fill-opacity", fillIrnOpacity);

    map.jumpTo({
      center,
      zoom,
      pitch,
      bearing,
    });

    let frameRendered = false;
    const finishFrame = () => {
      if (!frameRendered) {
        frameRendered = true;
        continueRender(handle);
      }
    };
    
    map.once("idle", finishFrame);
    setTimeout(finishFrame, 800); // 800ms failsafe for frame rendering
    map.triggerRepaint();
  }, [frame, map, delayRender, continueRender]);

  // UI HUD Info Titles & Descriptions
  let title = "Islamic Republic of Pakistan";
  let subtitle = "Global Map Fly-In";
  let description = "Entering geographical viewport centered on South Asia.";
  let badgeColor = "#ffffff";
  let badgeText = "PAKISTAN";

  if (frame > 90 && frame <= 180) {
    title = "Radcliffe Partition Line";
    subtitle = "Vulnerable Frontier Border";
    description = "Tracing the 2,912 KM border with India. Red highlights indicate flat agricultural plains completely lacking natural defensive barriers.";
    badgeColor = "#ff3333";
    badgeText = "BORDER DANGER ZONE";
  } else if (frame > 180 && frame <= 300) {
    title = "Subcontinent Rivals";
    subtitle = "Republic of India";
    description = "Pulsing viewport represents active border skirmishes, territorial friction points, and historic conflicts defining the bilateral relationship.";
    badgeColor = "#FF9933";
    badgeText = "RIVALRY & FRICTION";
  } else if (frame > 300) {
    title = "Western Frontiers";
    subtitle = "Afghanistan & Iran Boundaries";
    description = "Panning westward to reveal regional neighbors. Bold borders outline geopolitical buffer sectors along the western mountain ranges.";
    badgeColor = "#007A33";
    badgeText = "REGIONAL PERSPECTIVE";
  }

  // General fade-in transition for the HUD panels
  const panelOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: "#080612", overflow: "hidden" }}>
      {/* Map Canvas */}
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />

      {/* Futuristic Overlay Grid */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Cinematic Vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle, transparent 35%, rgba(8, 6, 18, 0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top HUD Display Info Panel */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          width: 580,
          background: "rgba(8, 6, 18, 0.85)",
          backdropFilter: "blur(20px)",
          border: `1px solid rgba(255, 255, 255, 0.15)`,
          padding: "32px 40px",
          borderRadius: 24,
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          opacity: panelOpacity,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          transition: "border-color 0.5s ease",
        }}
      >
        <span
          style={{
            color: badgeColor === "#ffffff" ? "#080612" : "#ffffff",
            background: badgeColor,
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 900,
            alignSelf: "flex-start",
            letterSpacing: "0.15em",
          }}
        >
          {badgeText}
        </span>
        <h2
          style={{
            margin: "8px 0 0 0",
            fontSize: 40,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
          {subtitle}
        </span>
        <p
          style={{
            margin: "12px 0 0 0",
            fontSize: 19,
            lineHeight: 1.6,
            color: "rgba(255, 255, 255, 0.75)",
          }}
        >
          {description}
        </p>
      </div>

      {/* Tech corner accents representing active capture */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          fontFamily: "monospace",
          fontSize: 16,
          color: "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#ff3333",
            animation: "pulse 1s infinite alternate",
          }}
        />
        SYS.CAPTURE: ACTIVE [F_{frame}]
      </div>
    </AbsoluteFill>
  );
};

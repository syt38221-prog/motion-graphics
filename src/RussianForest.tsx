import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";

export const RussianForest: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow descending drone push-in camera animation
  const scale = interpolate(frame, [0, durationInFrames], [1.12, 1.22], {
    easing: Easing.out(Easing.quad),
  });

  const translateY = interpolate(frame, [0, durationInFrames], [-20, 20], {
    easing: Easing.out(Easing.quad),
  });

  // Fade from black transition (0 -> 35 frames)
  const blackOpacity = interpolate(frame, [0, 35], [1, 0], {
    extrapolateRight: "clamp",
  });

  // Drifting fog layer offsets
  const fog1X = interpolate(frame, [0, durationInFrames], [-150, 150]);
  const fog2X = interpolate(frame, [0, durationInFrames], [100, -200]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#040508", overflow: "hidden" }}>
      {/* Cinematic Background Image with Camera Motion */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${scale}) translateY(${translateY}px)`,
          backgroundImage: `url(${staticFile("russian_forest_dawn.jpg")})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Layer 1: Slow Drifting Low-lying Fog */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-20%",
          width: "140%",
          height: "60%",
          background: "radial-gradient(ellipse at center, rgba(160, 180, 200, 0.22) 0%, rgba(160, 180, 200, 0) 70%)",
          filter: "blur(60px)",
          transform: `translateX(${fog1X}px) scaleY(0.7)`,
          pointerEvents: "none",
        }}
      />

      {/* Layer 2: Drifting Volumetric Mist */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "-30%",
          width: "160%",
          height: "50%",
          background: "radial-gradient(ellipse at center, rgba(180, 200, 220, 0.15) 0%, rgba(180, 200, 220, 0) 80%)",
          filter: "blur(80px)",
          transform: `translateX(${fog2X}px) scaleY(0.5)`,
          pointerEvents: "none",
        }}
      />

      {/* Film Grain Texture Overlay for IMAX Quality */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.05,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
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
          background: "radial-gradient(circle, transparent 40%, rgba(4, 5, 8, 0.75) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Letterbox Bars (IMAX 2.39:1 Aspect Ratio Overlay) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "8%",
          backgroundColor: "#000000",
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "8%",
          backgroundColor: "#000000",
          zIndex: 10,
        }}
      />

      {/* Fade From Black Overlay */}
      {blackOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
            opacity: blackOpacity,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Outfit";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

export const EuropeanUnrest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast-paced montage timings
  const protestDuration = 45;
  const parliamentDuration = 45;
  const newsDuration = 60;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily, overflow: "hidden" }}>
      
      {/* Scene 1: Street Protests */}
      <Sequence from={0} durationInFrames={protestDuration}>
        <SceneProtest />
      </Sequence>

      {/* Scene 2: Parliament Debate */}
      <Sequence from={protestDuration} durationInFrames={parliamentDuration}>
        <SceneParliament />
      </Sequence>

      {/* Scene 3: News Headlines */}
      <Sequence from={protestDuration + parliamentDuration} durationInFrames={newsDuration}>
        <SceneNews />
      </Sequence>
      
      {/* Glitch Overlay Effect applied globally across cuts */}
      <GlitchOverlay frame={frame} />
    </AbsoluteFill>
  );
};

const SceneProtest: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Aggressive push-in
  const scale = interpolate(frame, [0, 45], [1, 1.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const textOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <img
        src={staticFile("eu_protest.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          filter: "contrast(1.2) saturate(1.1)",
        }}
        alt="European Protest"
      />
      {/* Text Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 100,
          opacity: textOpacity,
          textShadow: "0 10px 30px rgba(0,0,0,0.8)",
        }}
      >
        <h1 style={{ color: "#fff", fontSize: 80, fontWeight: 900, margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          CIVIL UNREST
        </h1>
        <p style={{ color: "#ff3333", fontSize: 36, fontWeight: 700, margin: "10px 0 0 0", letterSpacing: "0.05em" }}>
          TENSIONS BOIL OVER IN EUROPEAN CAPITALS
        </p>
      </div>
    </AbsoluteFill>
  );
};

const SceneParliament: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Slow pan right
  const translateX = interpolate(frame, [0, 45], [0, -5], { // fixed to number
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <img
        src={staticFile("eu_parliament.jpg")}
        style={{
          width: "110%", // Extra width for panning
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${translateX}%)`,
          filter: "contrast(1.1) brightness(0.9)",
        }}
        alt="European Parliament"
      />
      {/* Top Right HUD text */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 100,
          textAlign: "right",
          textShadow: "0 5px 20px rgba(0,0,0,0.9)",
        }}
      >
        <h2 style={{ color: "#ffd700", fontSize: 64, fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
          POLITICAL DEADLOCK
        </h2>
        <div style={{ width: 100, height: 4, backgroundColor: "#ffd700", marginLeft: "auto", marginTop: 10 }} />
      </div>
    </AbsoluteFill>
  );
};

const SceneNews: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Jerky, chaotic scale
  const scale = interpolate(frame, [0, 30, 60], [1.1, 1.05, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });

  return (
    <AbsoluteFill>
      <img
        src={staticFile("eu_news.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "contrast(1.3) saturate(1.2)",
        }}
        alt="Breaking News Screens"
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      
      {/* Central Flashy Text */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          textShadow: "0 10px 40px rgba(255, 0, 0, 0.8)",
          opacity: frame > 10 ? 1 : 0, // Quick pop in
        }}
      >
        <div style={{ background: "#ff0000", padding: "10px 30px", display: "inline-block", marginBottom: 20 }}>
          <span style={{ color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: "0.2em" }}>BREAKING NEWS</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 100, fontWeight: 900, margin: 0, lineHeight: 1 }}>
          CRISIS ESCALATES
        </h1>
      </div>
    </AbsoluteFill>
  );
};

const GlitchOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  // Add subtle glitch opacity at specific frames to simulate chaotic news footage
  const isGlitchFrame = [12, 14, 44, 46, 88, 91].includes(frame % 100);
  
  if (!isGlitchFrame) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

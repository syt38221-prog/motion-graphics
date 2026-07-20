import React from "react";
import { Series } from "remotion";

// Import all our custom scenes
import { PakistanMap } from "./PakistanMap";

export const Documentary: React.FC = () => {
  return (
    <Series>
      {/* 1. Pakistan/India/Afghanistan/Iran Borders */}
      <Series.Sequence durationInFrames={420}>
        <PakistanMap />
      </Series.Sequence>
    </Series>
  );
};

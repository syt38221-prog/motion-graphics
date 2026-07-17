import React from "react";
import { Series } from "remotion";

// Import all our custom scenes
import { PakistanMap } from "./PakistanMap";
import { Main as NatoTroops } from "./Main";
import { EuropeanUnrest } from "./EuropeanUnrest";
import { MilitaryMap } from "./MilitaryMap";
import { RussianForest } from "./RussianForest";

export const Documentary: React.FC = () => {
  return (
    <Series>
      {/* 1. Pakistan/India/Afghanistan/Iran Borders */}
      <Series.Sequence durationInFrames={420}>
        <PakistanMap />
      </Series.Sequence>

      {/* 2. NATO Troops / US Leadership */}
      <Series.Sequence durationInFrames={450}>
        <NatoTroops />
      </Series.Sequence>

      {/* 3. European Capitals Unrest Collage */}
      <Series.Sequence durationInFrames={150}>
        <EuropeanUnrest />
      </Series.Sequence>

      {/* 4. Military Map (US Bases near Russia) */}
      <Series.Sequence durationInFrames={300}>
        <MilitaryMap />
      </Series.Sequence>

      {/* 5. Russian Forest (Drone push-in) */}
      <Series.Sequence durationInFrames={150}>
        <RussianForest />
      </Series.Sequence>
    </Series>
  );
};

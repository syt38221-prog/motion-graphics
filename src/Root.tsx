import { Composition } from "remotion";
import { Main } from "./Main";
import { MilitaryMap } from "./MilitaryMap";
import { PakistanMap } from "./PakistanMap";
import { RussianForest } from "./RussianForest";
import { EuropeanUnrest } from "./EuropeanUnrest";
import { Documentary } from "./Documentary";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={450} // 15 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MilitaryMap"
        component={MilitaryMap}
        durationInFrames={300} // 10 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PakistanMap"
        component={PakistanMap}
        durationInFrames={420} // 14 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RussianForest"
        component={RussianForest}
        durationInFrames={150} // 5 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EuropeanUnrest"
        component={EuropeanUnrest}
        durationInFrames={150} // 5 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Documentary"
        component={Documentary}
        durationInFrames={1470} // 49 seconds total
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};


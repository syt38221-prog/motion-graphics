import { Composition } from "remotion";
import { Main } from "./Main";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={450} // 15 seconds at 30 fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

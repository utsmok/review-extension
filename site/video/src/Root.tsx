import { Composition } from "remotion";
import { TrustExplainer } from "./TrustExplainer";
import { ExtensionWalkthrough } from "./ExtensionWalkthrough";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="TrustExplainer"
        component={TrustExplainer}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ExtensionWalkthrough"
        component={ExtensionWalkthrough}
        durationInFrames={480}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};

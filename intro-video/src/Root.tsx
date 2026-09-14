import { Composition } from "remotion";
import { IEduIntro } from "./Video";

export const Root: React.FC = () => (
  <>
    <Composition
      id="IEduIntro"
      component={IEduIntro}
      durationInFrames={900}
      fps={30}
      width={2560}
      height={1440}
      defaultProps={{}}
    />
  </>
);

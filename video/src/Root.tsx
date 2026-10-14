import React from "react";
import { Composition, Still } from "remotion";
import { Cut, Thumb, cutFrames } from "./Explainer";

const SHORT = ["a2", "a4", "b2", "c3", "d"];

export const Root: React.FC = () => (
  <>
    <Composition id="Explainer" component={Cut} width={1920} height={1080} fps={30} durationInFrames={cutFrames()} defaultProps={{}} />
    <Composition id="Vertical" component={Cut} width={1080} height={1920} fps={30} durationInFrames={cutFrames(SHORT)} defaultProps={{ ids: SHORT, vertical: true }} />
    <Still id="Thumbnail" component={Thumb} width={1280} height={720} />
  </>
);

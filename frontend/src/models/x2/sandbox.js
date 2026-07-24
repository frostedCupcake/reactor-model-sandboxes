import { X2Model } from "@reactor-models/x2";
import { attachMainVideo, sandboxControls, uploadImage } from "../shared.js";

export const model = {
  slug: "x2",
  name: "X2",
  requiresVideo: true,
  requiresReference: true,
};

export async function startSandbox({ jwt, outputVideo, sourceTrack, referenceFile, prompt }) {
  if (!sourceTrack) throw new Error("X2 requires a webcam or uploaded video track.");
  if (!referenceFile) throw new Error("X2 requires a reference image.");

  const session = new X2Model();
  attachMainVideo(session, outputVideo);
  await session.connect(jwt);
  await session.publishSource(sourceTrack);
  await session.setKeepBacklog({ keep_backlog: false });
  await uploadImage(session, referenceFile, {
    acceptedType: "reference_image_accepted",
    method: "setReferenceImage",
    field: "reference_image",
  });
  await session.setPrompt({ prompt });

  return sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt }));
}

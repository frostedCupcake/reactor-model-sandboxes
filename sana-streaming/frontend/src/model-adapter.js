import { SanaStreamingModel } from "@reactor-models/sana-streaming";
import { attachMainVideo, sandboxControls } from "./model-shared.js";

export const model = {
  slug: "sana-streaming",
  name: "SANA-Streaming",
  docs: "https://docs.reactor.inc/model-api-reference/sana-streaming/overview",
  requiresVideo: true,
};

export async function startSandbox({ jwt, outputVideo, sourceTrack, prompt }) {
  if (!sourceTrack) throw new Error("SANA-Streaming requires a webcam or uploaded video track.");

  const session = new SanaStreamingModel();
  attachMainVideo(session, outputVideo);
  await session.connect(jwt);
  await session.publishCamera(sourceTrack);
  await session.setPrompt({ prompt });
  await session.start();

  return {
    ...sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt })),
    replaceSource: async (nextTrack) => {
      await session.unpublishCamera();
      await session.publishCamera(nextTrack);
    },
  };
}

import { HappyOysterModel } from "@reactor-models/happy-oyster";
import { sandboxControls } from "../shared.js";

export const model = {
  slug: "happy-oyster",
  name: "Happy Oyster",
  docs: "https://docs.reactor.inc/model-api-reference/happy-oyster/overview",
  modes: ["adventure", "directing"],
  acceptsReference: true,
};

export async function startSandbox({ jwt, outputVideo, referenceFile, prompt, mode = "adventure" }) {
  const session = new HappyOysterModel({ mode, videoElement: outputVideo });
  await session.connect(jwt);
  await session.createWorld({
    prompt,
    ...(referenceFile ? { firstFrameImage: referenceFile } : {}),
    ...(mode === "adventure"
      ? { perspective: "third_person" }
      : { resolution: "720p", layout: "Stable", narrative: "Normal" }),
  });
  await session.startTravel();

  const applyPrompt = mode === "directing"
    ? (nextPrompt) => session.instruct(nextPrompt)
    : null;
  return {
    ...sandboxControls(session, applyPrompt),
    move: (direction) => session.move(direction),
    look: (direction) => session.look(direction),
    releaseMovement: () => session.release({ translation: true }),
    releaseLook: () => session.release({ rotation: true }),
  };
}

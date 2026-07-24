import { LingbotModel } from "@reactor-models/lingbot";
import { attachMainVideo, sandboxControls, uploadImage } from "../shared.js";

export const model = {
  slug: "lingbot",
  name: "LingBot",
  requiresReference: true,
};

export async function startSandbox({ jwt, outputVideo, referenceFile, prompt, rotationSpeed = 5 }) {
  if (!referenceFile) throw new Error("LingBot requires a reference image.");

  const session = new LingbotModel();
  attachMainVideo(session, outputVideo);
  await session.connect(jwt);
  await uploadImage(session, referenceFile);
  await session.setPrompt({ prompt });
  await session.setRotationSpeedDeg({ rotation_speed_deg: Number(rotationSpeed) });
  await session.start();

  return sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt }));
}

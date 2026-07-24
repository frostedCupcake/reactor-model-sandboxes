import { LingbotModel } from "@reactor-models/lingbot";
import { attachMainVideo, sandboxControls, uploadImage } from "./model-shared.js";

export const model = {
  slug: "lingbot",
  name: "LingBot",
  docs: "https://docs.reactor.inc/model-api-reference/lingbot/overview",
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

  return {
    ...sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt })),
    updateReference: (file) => uploadImage(session, file),
    setRotationSpeed: (value) => session.setRotationSpeedDeg({ rotation_speed_deg: Number(value) }),
    move: (value, active = true) => session.setMovement({ movement: active ? value : "idle" }),
    lookHorizontal: (value, active = true) => session.setLookHorizontal({ look_horizontal: active ? value : "idle" }),
    lookVertical: (value, active = true) => session.setLookVertical({ look_vertical: active ? value : "idle" }),
  };
}

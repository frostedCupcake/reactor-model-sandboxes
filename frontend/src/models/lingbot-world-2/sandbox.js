import { LingbotWorld2Model } from "@reactor-models/lingbot-world-2";
import { attachMainVideo, sandboxControls, uploadImage } from "../shared.js";

export const model = {
  slug: "lingbot-world-2",
  name: "LingBot World 2",
  docs: "https://docs.reactor.inc/model-api-reference/lingbot-world-2/overview",
  requiresReference: true,
};

export async function startSandbox({ jwt, outputVideo, referenceFile, prompt, rotationSpeed = 5 }) {
  if (!referenceFile) throw new Error("LingBot World 2 requires a reference image.");

  const session = new LingbotWorld2Model();
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
    moveLongitudinal: (value) => session.setMoveLongitudinal({ move_longitudinal: value }),
    moveLateral: (value) => session.setMoveLateral({ move_lateral: value }),
    lookHorizontal: (value) => session.setLookHorizontal({ look_horizontal: value }),
    lookVertical: (value) => session.setLookVertical({ look_vertical: value }),
  };
}

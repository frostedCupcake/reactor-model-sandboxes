import { HeliosModel } from "@reactor-models/helios";
import { attachMainVideo, sandboxControls, uploadImage } from "./model-shared.js";

export const model = {
  slug: "helios",
  name: "Helios",
  docs: "https://docs.reactor.inc/model-api-reference/helios/overview",
  acceptsReference: true,
};

export async function startSandbox({ jwt, outputVideo, referenceFile, prompt }) {
  const session = new HeliosModel();
  attachMainVideo(session, outputVideo);
  await session.connect(jwt);
  if (referenceFile) {
    await uploadImage(session, referenceFile, { extra: { image_b64: "" } });
  }
  await session.setPrompt({ prompt });
  await session.start();

  return {
    ...sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt })),
    updateReference: (file) => uploadImage(session, file, { extra: { image_b64: "" } }),
    setImageStrength: (value) => session.setImageStrength({ image_strength: Number(value) }),
  };
}

import { HeliosModel } from "@reactor-models/helios";
import { attachMainVideo, sandboxControls, uploadImage } from "../shared.js";

export const model = {
  slug: "helios",
  name: "Helios",
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

  return sandboxControls(session, (nextPrompt) => session.setPrompt({ prompt: nextPrompt }));
}

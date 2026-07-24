import { LongliveV2Model } from "@reactor-models/longlive-v2";
import { attachMainVideo, sandboxControls } from "../shared.js";

export const model = {
  slug: "longlive-v2",
  name: "LongLive 2",
  docs: "https://docs.reactor.inc/model-api-reference/longlive-v2/overview",
};

export async function startSandbox({ jwt, outputVideo, prompt }) {
  const session = new LongliveV2Model();
  attachMainVideo(session, outputVideo);
  await session.connect(jwt);
  await session.setShot({ prompt });
  await session.start();

  return {
    ...sandboxControls(session, (nextPrompt) => session.sceneCut({ prompt: nextPrompt })),
    cutTo: (nextPrompt) => session.sceneCut({ prompt: nextPrompt }),
  };
}

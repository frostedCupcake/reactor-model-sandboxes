export function attachMainVideo(model, videoElement) {
  const attach = (_track, stream) => {
    videoElement.srcObject = stream;
    void videoElement.play();
  };

  model.onMainVideo?.(attach);
  model.on?.("trackReceived", (name, track, stream) => {
    if (name === "main_video") attach(track, stream);
  });
}

export function waitForMessage(model, predicate, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Reactor did not confirm the uploaded reference in time."));
    }, timeoutMs);

    const handler = (event) => {
      const message = event?.data || event;
      if (!predicate(message)) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(message);
    };

    if (model.onMessage) unsubscribe = model.onMessage(handler) || (() => {});
    else {
      model.on?.("message", handler);
      unsubscribe = () => model.off?.("message", handler);
    }
  });
}

export async function uploadImage(model, file, options = {}) {
  if (!file) return;
  const {
    acceptedType = "image_accepted",
    method = "setImage",
    field = "image",
    extra = {},
  } = options;
  const accepted = waitForMessage(model, (message) => message?.type === acceptedType);
  const reference = await model.uploadFile(file, { name: file.name });
  await model[method]({ [field]: reference, ...extra });
  await accepted;
}

export async function disconnectSandbox(model) {
  if (!model) return;
  await model.reset?.().catch(() => {});
  await model.endTravelSession?.().catch(() => {});
  await model.unpublishSource?.().catch(() => {});
  await model.unpublishCamera?.().catch(() => {});
  await model.disconnect?.().catch(() => {});
}

export function sandboxControls(model, applyPrompt) {
  return {
    applyPrompt,
    pause: model.pause ? () => model.pause() : null,
    resume: model.resume ? () => model.resume() : null,
    disconnect: () => disconnectSandbox(model),
  };
}

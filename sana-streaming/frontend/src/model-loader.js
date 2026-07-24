export async function loadModel() {
  return { module: await import("@reactor-models/sana-streaming"), className: "SanaStreamingModel" };
}

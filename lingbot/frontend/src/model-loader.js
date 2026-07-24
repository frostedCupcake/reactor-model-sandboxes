export async function loadModel() {
  return { module: await import("@reactor-models/lingbot"), className: "LingbotModel" };
}

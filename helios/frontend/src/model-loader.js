export async function loadModel() {
  return { module: await import("@reactor-models/helios"), className: "HeliosModel" };
}

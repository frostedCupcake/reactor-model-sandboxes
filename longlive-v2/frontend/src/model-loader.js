export async function loadModel() {
  return { module: await import("@reactor-models/longlive-v2"), className: "LongliveV2Model" };
}

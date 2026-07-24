export async function loadModel() {
  return { module: await import("@reactor-models/x2"), className: "X2Model" };
}

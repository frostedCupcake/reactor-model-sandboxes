export async function loadModel() {
  return { module: await import("@reactor-models/happy-oyster"), className: "HappyOysterModel" };
}

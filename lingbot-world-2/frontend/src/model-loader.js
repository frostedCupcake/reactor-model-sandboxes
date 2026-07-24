export async function loadModel() {
  return { module: await import("@reactor-models/lingbot-world-2"), className: "LingbotWorld2Model" };
}

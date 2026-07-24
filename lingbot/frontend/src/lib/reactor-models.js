export const REACTOR_MODELS = {
  "lingbot": {
    "slug": "lingbot",
    "name": "LingBot",
    "category": "Action Controlled World Generation",
    "description": "High-fidelity environments with real-time interactive output.",
    "price": "$12/HOUR",
    "credits": "33 CREDITS/SEC",
    "family": "world",
    "docs": "https://docs.reactor.inc/model-api-reference/lingbot/overview",
    "prompt": "A vast alien landscape with towering crystalline formations"
  }
};

export const REACTOR_MODEL_SLUGS = ["lingbot"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["lingbot"];
}

export const REACTOR_MODELS = {
  "lingbot-world-2": {
    "slug": "lingbot-world-2",
    "name": "LingBot World 2",
    "category": "Action Controlled World Generation",
    "description": "High-fidelity environments with real-time interactive output.",
    "price": "$12/HOUR",
    "credits": "33 CREDITS/SEC",
    "family": "world",
    "docs": "https://docs.reactor.inc/model-api-reference/lingbot-world-2/overview",
    "prompt": "A cinematic path through a rain-soaked futuristic city"
  }
};

export const REACTOR_MODEL_SLUGS = ["lingbot-world-2"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["lingbot-world-2"];
}

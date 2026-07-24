export const REACTOR_MODELS = {
  "helios": {
    "slug": "helios",
    "name": "Helios",
    "category": "Interactive Video Generation",
    "description": "Interactive real-time video generation with infinite streaming.",
    "price": "$6/HOUR",
    "credits": "17 CREDITS/SEC",
    "family": "prompt",
    "docs": "https://docs.reactor.inc/model-api-reference/helios/overview",
    "prompt": "A lion walking through warm summer rain",
    "presets": [
      "In the Rain",
      "King of the Jungle"
    ]
  }
};

export const REACTOR_MODEL_SLUGS = ["helios"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["helios"];
}

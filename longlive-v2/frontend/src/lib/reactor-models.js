export const REACTOR_MODELS = {
  "longlive-v2": {
    "slug": "longlive-v2",
    "name": "LongLive 2",
    "category": "Multi-Shot Video Generation",
    "description": "Real-time multi-shot video generation with seamless shot changes and hard cuts.",
    "price": "$6/HOUR",
    "credits": "17 CREDITS/SEC",
    "family": "storyboard",
    "docs": "https://docs.reactor.inc/model-api-reference/longlive-v2/overview",
    "prompt": "A drone reveal of a Martian outpost at sunrise"
  }
};

export const REACTOR_MODEL_SLUGS = ["longlive-v2"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["longlive-v2"];
}

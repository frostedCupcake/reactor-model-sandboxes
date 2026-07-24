export const REACTOR_MODELS = {
  "happy-oyster": {
    "slug": "happy-oyster",
    "name": "Happy Oyster",
    "category": "Real-Time World Model by Alibaba",
    "description": "Describe a world and explore it live, generated frame by frame as you move.",
    "price": "$50/HOUR",
    "credits": "139 CREDITS/SEC",
    "offer": "50% off · first 2 weeks",
    "family": "happy",
    "docs": "https://docs.reactor.inc/model-api-reference/happy-oyster/overview",
    "prompt": "A sunlit meadow with a winding path through ancient ruins"
  }
};

export const REACTOR_MODEL_SLUGS = ["happy-oyster"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["happy-oyster"];
}

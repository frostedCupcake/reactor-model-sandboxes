export const REACTOR_MODELS = {
  "x2": {
    "slug": "x2",
    "name": "X2",
    "category": "Streaming Video Editing",
    "description": "Real-time streaming video-to-video editing.",
    "price": "$6/HOUR",
    "credits": "17 CREDITS/SEC",
    "family": "camera",
    "docs": "https://docs.reactor.inc/model-api-reference/x2/overview",
    "prompt": "Replace the person with a cinematic silver robot",
    "presets": [
      "Replace with reference",
      "Spawn at pointer",
      "Follow the drag"
    ]
  }
};

export const REACTOR_MODEL_SLUGS = ["x2"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["x2"];
}

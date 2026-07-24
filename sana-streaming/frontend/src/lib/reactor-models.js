export const REACTOR_MODELS = {
  "sana-streaming": {
    "slug": "sana-streaming",
    "name": "SANA-Streaming",
    "category": "Streaming Video Editing",
    "description": "Real-time video editing.",
    "price": "$6/HOUR",
    "credits": "17 CREDITS/SEC",
    "family": "camera",
    "docs": "https://docs.reactor.inc/model-api-reference/sana-streaming/overview",
    "prompt": "Van Gogh",
    "presets": [
      "Van Gogh",
      "Pencil Sketch",
      "Watercolor",
      "Cowboy Hat",
      "Royal Crown",
      "Fox",
      "Otter",
      "Neon Cyber",
      "Claymation"
    ]
  }
};

export const REACTOR_MODEL_SLUGS = ["sana-streaming"];

export function getReactorModel(slug) {
  return REACTOR_MODELS[slug] || REACTOR_MODELS["sana-streaming"];
}

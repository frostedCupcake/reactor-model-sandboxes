import ReactorModelSandbox from "@/components/reactor-sandbox/ReactorModelSandbox";
import { getReactorModel, REACTOR_MODEL_SLUGS } from "@/lib/reactor-models";

function currentSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const slug = parts.at(-1);
  return REACTOR_MODEL_SLUGS.includes(slug) ? slug : "x2";
}

export default function App() {
  const slug = currentSlug();
  if (window.location.pathname.startsWith("/models/")) {
    window.history.replaceState({}, "", `/reactor/models/${slug}`);
  }
  return <ReactorModelSandbox model={getReactorModel(slug)} />;
}

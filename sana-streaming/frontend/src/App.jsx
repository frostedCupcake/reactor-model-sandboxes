import ReactorModelSandbox from "@/components/reactor-sandbox/ReactorModelSandbox";
import { REACTOR_MODELS } from "@/lib/reactor-models";

export default function App() {
  return <ReactorModelSandbox model={REACTOR_MODELS["sana-streaming"]} />;
}

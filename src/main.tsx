import { createRoot } from "react-dom/client";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import App from "./app/App.tsx";
import { AppErrorBoundary, ConfigErrorScreen } from "./app/fallbacks.tsx";
import { configErrors } from "./lib/config";
import "./styles/index.css";

// Broken env renders a clear configuration screen instead of mounting providers on bad values;
// the boundary catches any render-time crash below it with a reload CTA.
createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    {configErrors.length > 0 ? <ConfigErrorScreen errors={configErrors} /> : <App />}
  </AppErrorBoundary>,
);

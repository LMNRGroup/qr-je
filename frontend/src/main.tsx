import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile-ui-v2.css";

if (import.meta.env.VITE_MOBILE_UI_V2 === "true" && typeof document !== "undefined") {
  document.documentElement.dataset.mobileUi = "v2";
}

createRoot(document.getElementById("root")!).render(<App />);

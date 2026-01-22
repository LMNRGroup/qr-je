import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile-ui-v2.css";

if (import.meta.env.VITE_MOBILE_UI_V2 === "true" && typeof document !== "undefined") {
  document.documentElement.dataset.mobileUi = "v2";
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      metaTheme.setAttribute("content", isDark ? "#111827" : "#ffffff");
    };
    updateThemeColor();
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
}

createRoot(document.getElementById("root")!).render(<App />);

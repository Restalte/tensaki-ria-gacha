import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Overlay from "./Overlay";

const root = createRoot(
  document.getElementById("root")!
);

const isOverlay =
  window.location.pathname === "/overlay";

root.render(
  <StrictMode>
    {isOverlay ? <Overlay /> : <App />}
  </StrictMode>
);
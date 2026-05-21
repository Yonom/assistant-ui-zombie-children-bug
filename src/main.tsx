import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

// StrictMode intentionally OFF: it double-invokes effects which can
// mask timing-dependent races. Without StrictMode the bug reproduces.
createRoot(document.getElementById("root")!).render(<App />);

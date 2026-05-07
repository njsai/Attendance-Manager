import { createRoot } from "react-dom/client";
import { installSwrCache } from "@/lib/swr-cache";
import App from "./App";
import "./index.css";

// Install SWR cache BEFORE rendering — intercepts all fetch() calls globally
// so page navigations return cached data instantly on repeat visits.
installSwrCache();

createRoot(document.getElementById("root")!).render(<App />);

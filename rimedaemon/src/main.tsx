import { createRoot } from "react-dom/client";
import Home from "./page";
import "./globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("RIME/DAEMON could not find its root node.");
}

createRoot(root).render(<Home />);

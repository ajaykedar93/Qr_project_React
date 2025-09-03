import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Global styles
import "./index.css";
import "./App.css";

// Ensure full-viewport wrapper
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <div className="app">
      <App />
    </div>
  </React.StrictMode>
);
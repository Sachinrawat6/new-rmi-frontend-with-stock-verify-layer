import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { StockContextProvider } from "./components/context/StockContextProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StockContextProvider>
    <App />
  </StockContextProvider>
);

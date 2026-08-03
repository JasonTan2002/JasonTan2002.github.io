import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ClothPortfolio from "./ClothPortfolio";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClothPortfolio />
  </StrictMode>,
);

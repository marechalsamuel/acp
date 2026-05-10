import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { PCAImageCompressor } from "./PCAImageCompressor"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PCAImageCompressor />
    </ThemeProvider>
  </StrictMode>
)

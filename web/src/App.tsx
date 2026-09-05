import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { About } from "./pages/About";
import { Floor } from "./pages/Floor";
import { NotFound } from "./pages/NotFound";
import { Technician } from "./pages/Technician";
import { ProgrammeProvider } from "./state/ProgrammeContext";
import { SessionProvider } from "./state/SessionContext";
import { WellProvider } from "./state/WellContext";

import { Landing } from "./pages/Landing";

/** RexMetrix (the company) lands at /. Chronarch (this product) lives under
 *  /chronarch: the programme well, /chronarch/tech (the workbench) and
 *  /chronarch/about. Old paths still resolve so bookmarks live: /tech and the
 *  retired protocol pages land in the workbench; /about and /consortium in
 *  About Chronarch. */
const RETIRED_TO_TECH = ["/tech", "/lab", "/council", "/timechain", "/hearth", "/farm", "/gym", "/operator"];
export const CHRONARCH = "/chronarch";
export const CHRONARCH_TECH = "/chronarch/tech";
export const CHRONARCH_ABOUT = "/chronarch/about";

export function App() {
  return (
    <SessionProvider>
      <ProgrammeProvider>
      <WellProvider>
      <Shell>
        <ErrorBoundary name="page">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path={CHRONARCH} element={<Floor />} />
            <Route path={CHRONARCH_ABOUT} element={<About />} />
            <Route path={CHRONARCH_TECH} element={<Technician />} />
            {RETIRED_TO_TECH.map((p) => (
              <Route key={p} path={p} element={<Navigate to={CHRONARCH_TECH} replace />} />
            ))}
            <Route path="/about" element={<Navigate to={CHRONARCH_ABOUT} replace />} />
            <Route path="/consortium" element={<Navigate to={CHRONARCH_ABOUT} replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Shell>
      </WellProvider>
      </ProgrammeProvider>
    </SessionProvider>
  );
}

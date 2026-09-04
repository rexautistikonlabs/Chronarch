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

/** One app, two rooms: the programme well (/) and the technician room (/tech).
 *  The old protocol pages are gone as surfaces; their paths still resolve so
 *  no link 404s, but they land in the one operator room (or About). */
const RETIRED_TO_TECH = ["/lab", "/council", "/timechain", "/hearth", "/farm", "/gym", "/operator"];

export function App() {
  return (
    <SessionProvider>
      <ProgrammeProvider>
      <WellProvider>
      <Shell>
        <ErrorBoundary name="page">
          <Routes>
            <Route path="/" element={<Floor />} />
            <Route path="/about" element={<About />} />
            <Route path="/tech" element={<Technician />} />
            {RETIRED_TO_TECH.map((p) => (
              <Route key={p} path={p} element={<Navigate to="/tech" replace />} />
            ))}
            <Route path="/consortium" element={<Navigate to="/about" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Shell>
      </WellProvider>
      </ProgrammeProvider>
    </SessionProvider>
  );
}

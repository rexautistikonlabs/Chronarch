import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { Consortium } from "./pages/Consortium";
import { Council } from "./pages/Council";
import { Farm } from "./pages/Farm";
import { Gym } from "./pages/Gym";
import { Hearth } from "./pages/Hearth";
import { Floor } from "./pages/Floor";
import { NotFound } from "./pages/NotFound";
import { Operator } from "./pages/Operator";
import { Technician } from "./pages/Technician";
import { Timechain } from "./pages/Timechain";
import { SessionProvider } from "./state/SessionContext";

export function App() {
  return (
    <SessionProvider>
      <Shell>
        <ErrorBoundary name="page">
          <Routes>
            <Route path="/" element={<Floor />} />
            <Route path="/tech" element={<Technician />} />
            <Route path="/lab" element={<Navigate to="/tech" replace />} />
            <Route path="/timechain" element={<Timechain />} />
            <Route path="/council" element={<Council />} />
            <Route path="/hearth" element={<Hearth />} />
            <Route path="/farm" element={<Farm />} />
            <Route path="/gym" element={<Gym />} />
            <Route path="/consortium" element={<Consortium />} />
            <Route path="/operator" element={<Operator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Shell>
    </SessionProvider>
  );
}

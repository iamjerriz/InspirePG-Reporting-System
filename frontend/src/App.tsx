import { Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import LoggerPage from "./pages/LoggerPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoggerPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

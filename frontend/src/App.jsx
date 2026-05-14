import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import JoinSession from "./Login"; // Renamed from Login
import Workspace from "./Workspace";
import AuthSuccess from "./AuthSuccess";
import { Navigate } from "react-router-dom";

// Protected Route Component - Now just checks for a session username
const ProtectedRoute = ({ children }) => {
  const userStr = localStorage.getItem("coderoom_user");
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<JoinSession />} />
      <Route 
        path="/room/:roomId" 
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        } 
      />
      <Route path="/auth-success" element={<AuthSuccess />} />
    </Routes>
  );
}

export default App;
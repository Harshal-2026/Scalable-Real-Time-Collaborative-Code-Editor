import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userStr = params.get("user");

    if (userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        // Store user info in localStorage for persistence
        localStorage.setItem("coderoom_user", JSON.stringify(user));
        
        // Generate a random room or redirect to a dashboard if you have one
        const room = `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        navigate(`/room/${room}`, { state: { username: user.username } });
      } catch (e) {
        console.error("Failed to parse user data", e);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [location, navigate]);

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "#0a0a0c", 
      color: "#fff",
      fontFamily: "sans-serif" 
    }}>
      <div style={{ textAlign: "center" }}>
        <div className="auth-spinner" style={{ 
          width: "40px", 
          height: "40px", 
          border: "3px solid rgba(139, 92, 246, 0.3)", 
          borderTopColor: "#8b5cf6", 
          borderRadius: "50%", 
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px"
        }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "8px" }}>Authenticating...</h2>
        <p style={{ color: "rgba(255,255,255,0.6)" }}>Preparing your collaborative workspace</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AuthSuccess;

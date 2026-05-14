import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowLeft, Users, Hash } from "lucide-react";
import "./Login.css";

// Particle system (Kept for premium feel)
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.1,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="particles-canvas" />;
}

function JoinSession() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setStatus("loading");
    
    // Store username for the session
    const user = { 
      username: username.trim(),
      id: `user-${Math.random().toString(36).slice(2, 7)}`
    };
    localStorage.setItem("coderoom_user", JSON.stringify(user));

    // Determine target room
    const targetRoom = roomId.trim() || `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        navigate(`/room/${targetRoom}`, { state: { username: user.username } });
      }, 500);
    }, 800);
  };

  return (
    <div className="login-page">
      <button className="back-to-home" onClick={() => navigate("/")}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>
      <Particles />

      {/* Deep space background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />

      {/* Subtle grid overlay */}
      <div className="grid-overlay" />

      <div className="login-card">
        {/* Animated gradient border */}
        <div className="card-border" />

        {/* Header */}
        <div className="lc-header">
          <div className="lc-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6366f1' }}>
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <h1 className="lc-brand">CodeRoom</h1>
          <p className="lc-sub">Join a collaborative session instantly</p>
        </div>

        {/* Form */}
        <form className="lc-form" onSubmit={handleJoin}>
          <div className="field-group">
            <label htmlFor="lc-username">Display Name</label>
            <div className="field-wrap">
              <Users className="field-icon" size={16} />
              <input 
                id="lc-username" 
                type="text" 
                placeholder="Enter your name" 
                value={username}
                onChange={e => setUsername(e.target.value)} 
                required 
                autoFocus
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="lc-room">Room ID (Optional)</label>
            <div className="field-wrap">
              <Hash className="field-icon" size={16} />
              <input 
                id="lc-room" 
                type="text" 
                placeholder="Leave blank for new room" 
                value={roomId}
                onChange={e => setRoomId(e.target.value)} 
              />
            </div>
          </div>

          <button
            type="submit"
            className={`submit-btn premium ${status}`}
            disabled={status === "loading" || status === "success"}
          >
            <Zap size={18} fill="currentColor" />
            <span className="btn-text">
              {status === "loading" ? "JOINING..." : status === "success" ? "READY! ✓" : "Launch Workspace"}
            </span>
            <div className="btn-shimmer" />
          </button>
        </form>

        {/* Status pulse */}
        <div className="status-row">
          <span className="status-dot" />
          <span className="status-text">Public Node Active</span>
        </div>
      </div>
    </div>
  );
}

export default JoinSession;

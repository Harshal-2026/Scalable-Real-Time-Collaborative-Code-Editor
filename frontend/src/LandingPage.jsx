import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Code, Users, Zap, Terminal, Bot, FolderTree, MessageSquare, ArrowLeft, Shield, FileText, Mail, X, PlayCircle } from "lucide-react";
import "./App.css";
import "./LandingPage.css";
import WorkflowTutorial from "./WorkflowTutorial";

function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 

  const toggleFeatures = (show) => {
    setShowFeatures(show);
    // Reset scroll when switching
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const particles = [];
    const droplets = [];
    const particleCount = 100;
    const mouse = { x: null, y: null };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // Spawn droplets as mouse moves
      if (Math.random() > 0.2) {
        droplets.push(new Droplet(mouse.x, mouse.y));
      }
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    resizeCanvas();

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.color = `rgba(168, 85, 247, ${Math.random() * 0.3})`;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Droplet {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.alpha = 1;
        this.color = `rgba(99, 102, 241, ${this.alpha})`;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.02;
        this.size *= 0.96;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#6366f1';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Match Workspace background color exactly
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      for (let i = droplets.length - 1; i >= 0; i--) {
        droplets[i].update();
        droplets[i].draw();
        if (droplets[i].alpha <= 0) {
          droplets.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="landing-container">
      <canvas ref={canvasRef} className="background-canvas" />
      
      <nav className="landing-nav">
        <div className="logo-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="logo-container">
            <Code width="32" height="32" className="logo-icon" />
            <span className="logo-text">CodeRoom</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '-4px', marginLeft: '44px', fontWeight: '500', letterSpacing: '0.5px' }}>Code together Create together</span>
        </div>
        <div className="nav-actions">
          <button className="nav-tutorial-btn" onClick={() => {
            const el = document.getElementById('how-it-works');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            <PlayCircle size={16} />
            Tutorial
          </button>
        </div>
      </nav>

      <main className={`hero-section ${showFeatures ? 'hidden' : ''}`}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">Collaborate.</span>
            <br />
            <span className="gradient-text">Code.</span>
            <br />
            <span className="gradient-text">Innovate.</span>
          </h1>
          <p className="hero-subtitle">
            Experience the future of real-time collaborative development. 
            Built for developers who want to build together, anywhere in the world.
          </p>
          <div className="hero-buttons">
            <button className="cta-button primary" onClick={() => navigate("/login")}>
              Join Session
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="cta-button secondary" onClick={() => {
                const el = document.getElementById('features-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Zap size={18} style={{ marginRight: '8px' }} />
                Features
              </button>
            </div>
          </div>
        </div>

        <div className="video-animation-container">
           <div className="floating-code-window">
              <div className="window-header">
                <div className="dot red"></div>
                <div className="dot yellow"></div>
                <div className="dot green"></div>
                <span className="file-name">App.jsx</span>
              </div>
              <div className="window-body">
                <pre>
                  <code>
                    <span className="code-keyword">import</span> React <span className="code-keyword">from</span> <span className="code-string">'react'</span>;<br/>
                    <span className="code-keyword">function</span> <span className="code-func">Collaborate</span>() &#123;<br/>
                    &nbsp;&nbsp;<span className="code-keyword">return</span> (<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="code-tag">div</span>&gt;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Building the future...<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="code-tag">div</span>&gt;<br/>
                    &nbsp;&nbsp;);<br/>
                    &#125;
                  </code>
                </pre>
              </div>
           </div>
           <div className="decoration-orb purple"></div>
           <div className="decoration-orb blue"></div>
        </div>
      </main>

      <WorkflowTutorial />

      <div id="features-section" className="features-overlay active">
        <section className="features-view">
          <div className="section-header">
            <h2 className="section-title">Why choose <span className="gradient-text">CodeRoom?</span></h2>
            <p className="section-subtitle">Everything you need to learn, build, and collaborate in one place.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box blue">
                <Users size={24} />
              </div>
              <h3>Work Together</h3>
              <p>See your friends' cursors and type together in real-time. It's like Google Docs, but for coding.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box purple">
                <Zap size={24} />
              </div>
              <h3>Smart Editor</h3>
              <p>A fast, professional editor that helps you catch errors and suggests code as you type.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box green">
                <Terminal size={24} />
              </div>
              <h3>Interactive Terminal</h3>
              <p>Run your code instantly. You can type into the terminal to talk to your programs.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box orange">
                <Bot size={24} />
              </div>
              <h3>AI Buddy</h3>
              <p>Get stuck? Our built-in AI explains bugs and helps you write better code whenever you need it.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box pink">
                <FolderTree size={24} />
              </div>
              <h3>Project Explorer</h3>
              <p>Organize your work into multiple files and folders, just like a real developer does.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box cyan">
                <MessageSquare size={24} />
              </div>
              <h3>Team Chat</h3>
              <p>Talk to your teammates right inside the app. No need to switch tabs to stay in sync.</p>
            </div>
          </div>

          <div className="features-bottom-nav">
            <button className="cta-button primary" onClick={() => navigate("/login")}>
              Join Session
            </button>
            <button className="back-btn-bottom" onClick={() => toggleFeatures(false)}>
              <ArrowLeft size={18} style={{ transform: 'rotate(90deg)' }} />
              <span>Back to Home</span>
            </button>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <p>&copy; 2026 CodeRoom Inc. All rights reserved.</p>
        <div className="footer-links">
          <span onClick={() => setActiveModal('privacy')}>Privacy</span>
          <span onClick={() => setActiveModal('terms')}>Terms</span>
          <span onClick={() => setActiveModal('contact')}>Contact</span>
        </div>
      </footer>

      {/* FOOTER MODALS */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="custom-modal footer-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === 'privacy' && <><Shield size={18} color="#2dd4bf" /> Privacy Policy</>}
                {activeModal === 'terms' && <><FileText size={18} color="#8b5cf6" /> Terms of Service</>}
                {activeModal === 'contact' && <><Mail size={18} color="#f59e0b" /> Contact Support</>}
              </h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {activeModal === 'privacy' && (
                <div className="modal-text-content">
                  <p>At <strong>CodeRoom</strong>, your privacy is our top priority. We use industry-standard encryption for all real-time collaborative sessions.</p>
                  <ul>
                    <li><strong>Data Security:</strong> Your code is synchronized using end-to-end encryption.</li>
                    <li><strong>Usage Data:</strong> We only collect minimal diagnostic data to improve editor performance.</li>
                    <li><strong>Cookies:</strong> We use cookies solely for session management and authentication.</li>
                  </ul>
                  <p>We never sell your data to third parties. Your code belongs to you.</p>
                </div>
              )}
              {activeModal === 'terms' && (
                <div className="modal-text-content">
                  <p>Welcome to <strong>CodeRoom</strong>. By using our platform, you agree to the following terms:</p>
                  <ul>
                    <li><strong>Fair Use:</strong> Do not use the platform for malicious purposes or high-frequency automated bots.</li>
                    <li><strong>Content:</strong> You retain full ownership of all code created on CodeRoom.</li>
                    <li><strong>AI Features:</strong> AI assistance is provided "as is" and should be verified for security.</li>
                  </ul>
                  <p>We reserve the right to suspend accounts that violate our safety guidelines.</p>
                </div>
              )}
              {activeModal === 'contact' && (
                <div className="modal-text-content contact-center">
                  <p>Need help or have a suggestion? Our support team is here for you.</p>
                  <div className="contact-id-box">
                    <Mail size={16} />
                    <span>support.coderoom@gmail.com</span>
                  </div>
                  <a 
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=support.coderoom@gmail.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="cta-button primary mini-btn"
                  >
                    Send Email Now
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn confirm" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;

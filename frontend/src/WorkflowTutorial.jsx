import { useState, useEffect } from 'react';
import { LogIn, Users, Play, Sparkles, ChevronRight } from 'lucide-react';
import './WorkflowTutorial.css';

const steps = [
  {
    id: 'join',
    title: '1. Connect with Ease',
    description: 'Enter a Room ID or create a new session to start collaborating instantly. No complex setup required.',
    icon: <LogIn size={20} />,
  },
  {
    id: 'collab',
    title: '2. Real-time Synergy',
    description: 'Write, edit, and refactor code together. See live cursors and changes from your team in milliseconds.',
    icon: <Users size={20} />,
  },
  {
    id: 'execute',
    title: '3. Instant Execution',
    description: 'Run your code in our integrated terminal. Support for multiple languages with real-time feedback.',
    icon: <Play size={20} />,
  },
  {
    id: 'ai',
    title: '4. AI-Powered Insights',
    description: 'Get help from our built-in AI assistant. Debug errors, optimize code, and learn faster than ever.',
    icon: <Sparkles size={20} />,
  }
];

const WorkflowTutorial = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleStepClick = (index) => {
    setActiveStep(index);
    setIsAutoPlaying(false);
  };

  const renderVisual = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="visual-join">
            <div className="mock-input">
              ROOM-42-BETA
              <div className="cursor-blink"></div>
            </div>
            <div className="mock-btn">Connect to Room</div>
          </div>
        );
      case 1:
        return (
          <div className="visual-collab">
            <div className="window-header" style={{ marginBottom: '10px' }}>
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
              <span className="file-name">Main.js</span>
            </div>
            <pre style={{ margin: 0, padding: '10px' }}>
              <code>
                <span style={{ color: '#c678dd' }}>function</span> <span style={{ color: '#61afef' }}>hello</span>() &#123;<br/>
                &nbsp;&nbsp;<span style={{ color: '#98c379' }}>console</span>.<span style={{ color: '#e06c75' }}>log</span>(<span style={{ color: '#98c379' }}>"Hello World"</span>);<br/>
                &#125;
              </code>
            </pre>
            <div className="remote-cursor user1" style={{ top: '60px', left: '120px' }}>
              <div className="cursor-tag user1-tag">Alex coding...</div>
            </div>
            <div className="remote-cursor user2" style={{ top: '80px', left: '200px' }}>
              <div className="cursor-tag user2-tag">Sarah editing...</div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="visual-terminal">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-command">node Main.js</span>
            </div>
            <div className="terminal-output">
              Hello World<br/>
              Process exited with code 0
            </div>
            <div className="terminal-line" style={{ marginTop: '20px' }}>
              <span className="terminal-prompt">$</span>
              <div className="cursor-blink"></div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="visual-ai">
            <div className="chat-bubble user">
              How can I optimize this loop?
            </div>
            <div className="chat-bubble ai">
              You can use .map() for better readability...
              <div className="ai-typing">
                <div className="ai-dot"></div>
                <div className="ai-dot"></div>
                <div className="ai-dot"></div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="workflow-section" id="how-it-works">
      <div className="workflow-header">
        <h2 className="workflow-title">Seamless Workflow</h2>
        <p className="section-subtitle">From idea to execution in seconds. See how CodeRoom empowers your development process.</p>
      </div>

      <div className="workflow-container">
        <div className="workflow-steps">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`step-card ${activeStep === index ? 'active' : ''}`}
              onClick={() => handleStepClick(index)}
            >
              <div className="step-icon">
                {step.icon}
              </div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              {activeStep === index && <ChevronRight className="active-arrow" />}
            </div>
          ))}
        </div>

        <div className="workflow-visual">
          {renderVisual()}
        </div>
      </div>
    </section>
  );
};

export default WorkflowTutorial;

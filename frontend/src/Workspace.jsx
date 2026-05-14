import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import socket from "./socket";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import Editor from "@monaco-editor/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Bot, X, Settings, Terminal as TerminalIcon, Moon, Sun, User,
  Users, Zap, Folder, Key, Plus, Trash2, Globe, FileCode,
  CheckCircle, MousePointer2, Layout, MoreVertical, Share2, Code, Search,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  PanelLeft, PanelBottom, PanelRight, FilePlus, FolderPlus,
  Edit2, Download, Share, Paperclip, Send as SendIcon, MessageSquare,
  UserPlus, Copy
} from "lucide-react";
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import "./App.css";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const languageTemplates = {
  python: "import numpy as np\nimport requests\n\nprint('Welcome to Code Room')\nprint(f'Numpy version: {np.__version__}')\n# try:\n#     res = requests.get('https://api.github.com')\n#     print(f'API Status: {res.status_code}')\n# except: pass",
  javascript: "// Popular libraries available: axios, lodash, moment\nconst axios = require('axios');\nconst _ = require('lodash');\n\nconsole.log('Welcome to Code Room');\nconsole.log('Lodash Random:', _.random(1, 100));\n// axios.get('https://api.github.com').then(res => console.log('API Status:', res.status)).catch(e => {});",
  java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Welcome to Code Room\");\n    List<String> list = new ArrayList<>();\n    list.add(\"Java\");\n    list.add(\"Libraries\");\n    System.out.println(\"Collections: \" + list);\n  }\n}",
  cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n  cout << \"Welcome to Code Room\" << endl;\n  vector<int> v = {3, 1, 4};\n  sort(v.begin(), v.end());\n  return 0;\n}",
  c: "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n  printf(\"Welcome to Code Room\\n\");\n  return 0;\n}",
  html: "<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n  <!-- Popular Libraries Included -->\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css\">\n</head>\n<body class=\"bg-slate-900 text-white flex flex-col items-center justify-center min-h-screen\">\n  <div class=\"p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 text-center\">\n    <h1 class=\"text-4xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent\">\n      <i class=\"fas fa-code mr-2\"></i>Welcome to Code Room\n    </h1>\n    <p class=\"text-slate-400 mb-6\">Live Preview with Tailwind CSS is active!</p>\n    <button class=\"px-6 py-2 bg-teal-500 hover:bg-teal-600 rounded-full transition-all active:scale-95\">\n      Get Started\n    </button>\n  </div>\n</body>\n</html>"
};

const languageLabels = {
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  html: "HTML"
};

function Workspace() {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState(paramRoomId || "");
  const [fileName, setFileName] = useState("main.py");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(languageTemplates.python);
  const [theme, setTheme] = useState("dark");
  const [terminalOutput, setTerminalOutput] = useState("Terminal ready...");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { user: "System", text: "Welcome to the Code Room! Start collaborating." }
  ]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { user: "AI", text: "Ask for help with bugs, logic, or code review." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(300);
  const [leftView, setLeftView] = useState('panel'); // 'panel' | 'explorer'
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [aiPosition, setAiPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [aiBtnPosition, setAiBtnPosition] = useState({ x: window.innerWidth - 90, y: window.innerHeight - 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingBtn, setIsDraggingBtn] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [terminalHeight, setTerminalHeight] = useState(210);
  const [chatHeight, setChatHeight] = useState(360);
  const [activeTerminalTab, setActiveTerminalTab] = useState("terminal");

  const [activeUsers, setActiveUsers] = useState([]);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [openFiles, setOpenFiles] = useState([]); // Track open tabs
  const [problems, setProblems] = useState([]); // List of detected code issues
  const [explorerMenu, setExplorerMenu] = useState(null); // { name, x, y }
  const [clipboard, setClipboard] = useState(null); // { type: 'cut'|'copy', item }
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatEditModal, setShowChatEditModal] = useState(false);
  const [chatMenu, setChatMenu] = useState(null); // { index, x, y, message }
  const [itemToAction, setItemToAction] = useState(null);
  const [messageToEdit, setMessageToEdit] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(['Project']); // Track expanded folders
  const [modalError, setModalError] = useState(""); // Track validation errors
  const [isFollowing, setIsFollowing] = useState(false); // Follow other users' file selections
  const [showInviteModal, setShowInviteModal] = useState(false); // Invite user popup
  const [showAnalysisModal, setShowAnalysisModal] = useState(false); // Learning analysis popup
  const [sessionErrorsCount, setSessionErrorsCount] = useState(0); // Track total errors encountered
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('editor');
  // Editor settings
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState('off');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showMinimap, setShowMinimap] = useState(false);
  const [cursorStyle, setCursorStyle] = useState('line');
  const [formatOnSave, setFormatOnSave] = useState(false);
  // Terminal settings
  const [terminalFontSize, setTerminalFontSize] = useState(13);
  const [clearTerminalOnRun, setClearTerminalOnRun] = useState(true);
  // Autosave
  const [autoSaveDelay, setAutoSaveDelay] = useState(5000);
  // Appearance
  const [accentColor, setAccentColor] = useState('#2dd4bf');

  // Get username from location state or default to guest
  const initialUsername = location.state?.username || `Guest-${Math.floor(Math.random() * 1000)}`;
  const [username, setUsername] = useState(initialUsername);
  const [joinedRoom, setJoinedRoom] = useState("");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddon = useRef(null);
  const autoSaveTimer = useRef(null);
  const particlesInit = useRef(false);
  const sharedFilesRef = useRef(null);
  const sharedAiRef = useRef(null);
  const aiMessagesEndRef = useRef(null);
  const aiContainerRef = useRef(null);

  // Initialize XTerm
  useEffect(() => {
    if (activeTerminalTab === "terminal" && xtermRef.current && !xtermInstance.current) {
      const term = new Terminal({
        theme: {
          background: 'transparent',
          foreground: '#f1f1f4',
          cursor: '#2dd4bf',
          selectionBackground: 'rgba(45, 212, 191, 0.3)',
        },
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: 13,
        cursorBlink: true,
        allowProposedApi: true
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(xtermRef.current);

      setTimeout(() => fit.fit(), 100);

      term.onData((data) => {
        socket.emit("terminal-data", data);
      });

      xtermInstance.current = term;
      fitAddon.current = fit;

      socket.on("terminal-data", (data) => {
        term.write(data);
      });
    }

    const handleResize = () => {
      if (fitAddon.current) fitAddon.current.fit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTerminalTab]);

  // Auto-scroll AI assistant chat
  useEffect(() => {
    if (aiContainerRef.current) {
      aiContainerRef.current.scrollTop = aiContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Particles for Workspace
  useEffect(() => {
    if (particlesInit.current) return;
    const canvas = document.getElementById("workspace-particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const particles = [];
    const particleCount = 100;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
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

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    particlesInit.current = true;

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !code || !joinedRoom) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      // Silent save to localStorage
      const key = `autosave-${joinedRoom}-${activeFile || 'default'}`;
      localStorage.setItem(key, code);
      setLastSaved(new Date().toLocaleTimeString());
      console.log(`[AutoSave] Saved to ${key}`);
    }, autoSaveDelay || 5000);

    return () => clearTimeout(autoSaveTimer.current);
  }, [code, autoSave, joinedRoom, activeFile, autoSaveDelay]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setAiPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
      if (isDraggingBtn) {
        setAiBtnPosition({
          x: clamp(e.clientX - dragOffset.current.x, 20, window.innerWidth - 80),
          y: clamp(e.clientY - dragOffset.current.y, 20, window.innerHeight - 80)
        });
      }
    };
    const handleMouseUp = (e) => {
      // Logic for button toggle moved to onClick with distance check
      setIsDragging(false);
      setIsDraggingBtn(false);
    };

    if (isDragging || isDraggingBtn) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDraggingBtn]);

  const onDragStart = (e) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - aiPosition.x,
      y: e.clientY - aiPosition.y
    };
  };

  const onBtnDragStart = (e) => {
    e.preventDefault();
    setIsDraggingBtn(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = {
      x: e.clientX - aiBtnPosition.x,
      y: e.clientY - aiBtnPosition.y
    };
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;

      // F5 → Run Code
      if (e.key === 'F5') {
        e.preventDefault();
        runCode();
        return;
      }

      // Ctrl+S → Save File
      if (ctrl && e.key === 's') {
        e.preventDefault();
        saveCode();
        return;
      }

      // Ctrl+N → New File (open modal)
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        setShowNewFileModal(true);
        return;
      }

      // Ctrl+` → Toggle Terminal
      if (ctrl && e.key === '`') {
        e.preventDefault();
        setTerminalCollapsed(prev => {
          setTerminalHeight(!prev ? 210 : 40);
          return !prev;
        });
        return;
      }

      // Ctrl+G → Go to Line
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        triggerMonacoAction('editor.action.gotoLine');
        return;
      }

      // Ctrl+H → Replace (only prevent default if editor focused)
      if (ctrl && e.key === 'h') {
        e.preventDefault();
        triggerMonacoAction('editor.action.startFindReplaceAction');
        return;
      }

      // Ctrl+/ → Comment Line
      if (ctrl && e.key === '/') {
        e.preventDefault();
        triggerMonacoAction('editor.action.commentLine');
        return;
      }

      // Shift+Alt+F → Format Code
      if (e.shiftKey && e.altKey && e.key === 'F') {
        e.preventDefault();
        triggerMonacoAction('editor.action.formatDocument');
        return;
      }

      // Ctrl+I → Toggle AI
      if (ctrl && e.key === 'i') {
        e.preventDefault();
        setIsAIOpen(prev => !prev);
        return;
      }

      // Ctrl+F → Find
      if (ctrl && e.key === 'f') {
        e.preventDefault();
        triggerMonacoAction('actions.find');
        return;
      }

      // Ctrl+A → Select All
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        triggerMonacoAction('editor.action.selectAll');
        return;
      }

      // Ctrl+Z → Undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        triggerMonacoAction('undo');
        return;
      }

      // Ctrl+Y → Redo
      if (ctrl && e.key === 'y') {
        e.preventDefault();
        triggerMonacoAction('redo');
        return;
      }

      // Tab → Indent
      if (e.key === 'Tab' && !e.shiftKey) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          triggerMonacoAction('tab');
          return;
        }
      }

      // Shift+Tab → Outdent
      if (e.key === 'Tab' && e.shiftKey) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          triggerMonacoAction('outdent');
          return;
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language]);

  // ================= YJS & SOCKET =================
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("sync-room", (data) => {
      console.log("Sync Room Received:", data);
      if (data.messages) setChatMessages(data.messages);
      if (data.users) {
        console.log("Setting initial users from sync:", data.users);
        setActiveUsers(data.users);
      }
      setTerminalOutput("Sync complete! Ready to collaborate.");
    });

    socket.on("room-users", (users) => {
      console.log("Updated room users list:", users);
      setActiveUsers(users);
    });

    socket.on("chat-message", (data) => {
      setChatMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sync-room");
      socket.off("room-users");
      socket.off("chat-message");
    };
  }, []); // Run ONLY once on mount

  // Handle Auto-join separately
  useEffect(() => {
    if (paramRoomId && joinedRoom !== paramRoomId) {
      console.log("Room ID detected or changed. Joining:", paramRoomId);
      setActiveUsers([]); // Clear users when moving rooms
      joinRoom(paramRoomId);
    }
  }, [paramRoomId, username]); // Re-join if URL or Username changes

  // ================= YJS COLLABORATION =================
  useEffect(() => {
    if (!joinedRoom || !editorInstance) return;

    const ydoc = new Y.Doc();
    const BACKEND_URL = import.meta.env.VITE_API_URL || "https://scalable-real-time-collaborative-code.onrender.com";
    const WS_URL = BACKEND_URL.replace(/^http/, "ws");
    const provider = new WebsocketProvider(
      WS_URL,
      joinedRoom,
      ydoc
    );

    // Use a unique name for each file's text to sync multiple files correctly
    const ytext = ydoc.getText(`file-${joinedRoom}-${activeFile}`);

    const binding = new MonacoBinding(
      ytext,
      editorInstance.getModel(),
      new Set([editorInstance]),
      provider.awareness
    );

    // --- SHARED FILE EXPLORER SYNC ---
    const yfiles = ydoc.getArray("explorer-files");
    const yaiMessages = ydoc.getArray("ai-messages");
    sharedFilesRef.current = yfiles;
    sharedAiRef.current = yaiMessages;

    const syncFilesFromYjs = () => {
      const currentYFiles = yfiles.toArray();
      if (currentYFiles.length > 0) {
        setFiles(currentYFiles);
        // Auto-open first file if none active
        if (!activeFile && currentYFiles.length > 0) {
          const first = currentYFiles[0];
          setActiveFile(first.name);
          setFileName(first.name);
          if (first.lang) setLanguage(first.lang);
          setCode(languageTemplates[first.lang] || '');
          setOpenFiles([first.name]);
        }
      }
    };

    const syncAiMessagesFromYjs = () => {
      const currentMessages = yaiMessages.toArray();
      if (currentMessages.length > 0) {
        setAiMessages(currentMessages);
      }
    };

    yfiles.observe(() => syncFilesFromYjs());
    yaiMessages.observe(() => syncAiMessagesFromYjs());

    // Initial sync
    syncFilesFromYjs();
    syncAiMessagesFromYjs();

    const cursorColors = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
      '#F3FF33', '#FF8333', '#33FF83', '#8333FF', '#FF3383'
    ];
    const cursorColor = cursorColors[Math.floor(Math.random() * cursorColors.length)];

    provider.awareness.setLocalStateField("user", {
      name: username,
      color: cursorColor,
      activeFile: activeFile
    });

    const handleAwarenessChange = () => {
      // 1. Follow Mode logic
      if (isFollowing) {
        const states = Array.from(provider.awareness.getStates().values());
        const leader = states.find(s => s.user && s.user.name !== username && s.user.activeFile);
        if (leader && leader.user.activeFile !== activeFile) {
          const targetFileName = leader.user.activeFile;
          const file = files.find(f => f.name === targetFileName);
          if (file) {
            setActiveFile(targetFileName);
            setFileName(targetFileName);
            if (file.lang) setLanguage(file.lang);
            setCode(languageTemplates[file.lang] || '');
          }
        }
      }

      // 2. Dynamic Cursor Colors logic
      const states = provider.awareness.getStates();
      let styleEl = document.getElementById('yjs-cursor-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'yjs-cursor-styles';
        document.head.appendChild(styleEl);
      }

      let styles = '';
      states.forEach((state, clientID) => {
        if (state.user && state.user.color) {
          const color = state.user.color;
          // Create unique classes for each client
          styles += `
            .yRemoteSelection.yclient-${clientID} { background-color: ${color}33 !important; }
            .yRemoteSelectionHead.yclient-${clientID} { border-color: ${color} !important; --cursor-color: ${color}; }
            .yRemoteSelectionHead.yclient-${clientID}::after { background-color: ${color} !important; }
          `;
        }
      });
      styleEl.innerHTML = styles;
    };

    provider.awareness.on("change", handleAwarenessChange);

    return () => {
      provider.awareness.off("change", handleAwarenessChange);
      binding.destroy();
      provider.disconnect();
      ydoc.destroy();
    };
  }, [joinedRoom, editorInstance, username, activeFile, isFollowing]);

  // ================= CODE VALIDATION (PROBLEMS) =================
  useEffect(() => {
    if (!code || !editorInstance) return;

    const markers = [];
    const newProblems = [];

    // --- ADVANCED VALIDATION ---
    const lines = code.split('\n');

    // 1. Brace & Paren Matching
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      newProblems.push({ id: 'brace-miss', message: "Missing closing brace '}'.", line: lines.length, severity: 'Error' });
    } else if (closeBraces > openBraces) {
      newProblems.push({ id: 'brace-extra', message: "Extra closing brace '}'.", line: lines.length, severity: 'Error' });
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      newProblems.push({ id: 'paren-miss', message: "Missing closing parenthesis ')'.", line: lines.length, severity: 'Error' });
    }

    // 2. Unclosed Quotes
    lines.forEach((line, idx) => {
      const quotes = (line.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        newProblems.push({ id: `quote-${idx}`, message: "Unclosed string literal (missing double quote).", line: idx + 1, severity: 'Error' });
        markers.push({ startLineNumber: idx + 1, startColumn: 1, endLineNumber: idx + 1, endColumn: 100, message: "Unclosed string", severity: 8 });
      }
    });

    // 3. Language Specific Logic (C/C++)
    if (language === 'c' || language === 'cpp') {
      // Missing main check
      if (!code.includes('main')) {
        newProblems.push({ id: 'no-main', message: "Missing 'main' function. C programs need an entry point.", line: 1, severity: 'Warning' });
      }

      // Check for 'int ()' instead of 'int main()'
      if (code.includes('int ()')) {
        const lineNo = lines.findIndex(l => l.includes('int ()')) + 1;
        const msg = "Syntax Error: Function name missing. Did you mean 'int main()' ?";
        newProblems.push({
          id: 'missing-main', message: msg, line: lineNo, severity: 'Error',
          fix: (c) => c.replace('int ()', 'int main()')
        });
        markers.push({ startLineNumber: lineNo, startColumn: 1, endLineNumber: lineNo, endColumn: 100, message: msg, severity: 8 });
      }

      // Missing semicolons
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if ((trimmed.startsWith('printf') || trimmed.startsWith('scanf') || trimmed.includes('sum =')) && !trimmed.endsWith(';')) {
          const msg = "Missing semicolon ';' at end of statement.";
          newProblems.push({
            id: `semi-${idx}`, message: msg, line: idx + 1, severity: 'Error',
            fix: (c) => {
              const l = c.split('\n');
              l[idx] = l[idx].trimEnd() + ';';
              return l.join('\n');
            }
          });
          markers.push({ startLineNumber: idx + 1, startColumn: 1, endLineNumber: idx + 1, endColumn: 100, message: msg, severity: 8 });
        }
      });
    }

    setProblems(newProblems);
    const model = editorInstance.getModel();
    if (model) {
      window.monaco.editor.setModelMarkers(model, "owner", markers);
    }
  }, [code, language, editorInstance]);

  // Broadcast active file change to others
  useEffect(() => {
    if (editorInstance && activeFile) {
      const provider = editorInstance.y_provider;
      if (provider && provider.awareness) {
        provider.awareness.setLocalStateField("user", {
          name: username,
          activeFile: activeFile
        });
      }
    }
  }, [activeFile, editorInstance, username]);

  // Track total errors for analysis
  useEffect(() => {
    if (problems.length > 0) {
      setSessionErrorsCount(prev => prev + problems.length);
    }
  }, [problems]);
  function startResize(type, event) {
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeftWidth = leftWidth;
    const startRightWidth = rightWidth;
    const startTerminalHeight = terminalHeight;
    const startChatHeight = chatHeight;

    function handlePointerMove(moveEvent) {
      if (type === "left") {
        setLeftWidth(clamp(startLeftWidth + moveEvent.clientX - startX, 210, 500));
      }

      if (type === "right") {
        setRightWidth(clamp(startRightWidth + startX - moveEvent.clientX, 250, 600));
      }

      if (type === "terminal") {
        setTerminalHeight(
          clamp(startTerminalHeight + startY - moveEvent.clientY, 40, 600)
        );
      }

      if (type === "chat") {
        setChatHeight(clamp(startChatHeight + moveEvent.clientY - startY, 220, 620));
      }
    }

    function stopResize() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("is-resizing");
    }

    document.body.classList.add("is-resizing");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  }

  function createRoom() {
    const nextRoomId = `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setRoomId(nextRoomId);
    setTerminalOutput(`New Room ID generated: ${nextRoomId}. Joining...`);
    joinRoom(nextRoomId);
  }

  function joinRoom(idToJoin = roomId) {
    const cleanRoomId = idToJoin.trim();
    if (cleanRoomId) {
      console.log(`[Socket] Attempting to join room: ${cleanRoomId} as ${username}`);
      socket.emit("join-room", { roomId: cleanRoomId, username });
      setJoinedRoom(cleanRoomId);

      // Update URL if it doesn't match the current room
      if (cleanRoomId !== paramRoomId) {
        navigate(`/room/${cleanRoomId}`, { state: { username } });
      }

      setTerminalOutput(`Joined room ${cleanRoomId}. Syncing...`);
    } else {
      setTerminalOutput("Please enter a room code first.");
    }
  }

  function changeLanguage(event) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    const extMap = { python: "py", javascript: "js", java: "java", cpp: "cpp", c: "c", html: "html" };
    setFileName(`main.${extMap[nextLanguage]}`);
    setCode(languageTemplates[nextLanguage]);
    setTerminalOutput(`${languageLabels[nextLanguage]} selected.`);
  }

  async function runCode() {
    if (!code.trim()) return;

    setActiveTerminalTab("terminal");
    setTerminalCollapsed(false);
    setTerminalHeight(210);

    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.focus();
    }

    socket.emit("terminal-spawn", { code, language });
  }

  async function saveCode() {
    try {
      if ('showSaveFilePicker' in window) {
        const extension = { python: "py", javascript: "js", java: "java", cpp: "cpp", c: "c", html: "html" }[language] || "txt";
        const opts = {
          suggestedName: fileName.trim() || `main.${extension}`,
          types: [{
            description: 'Source Code File',
            accept: { 'text/plain': [`.${extension}`] },
          }],
        };
        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();
        setLastSaved(new Date().toLocaleTimeString());
        setTerminalOutput(`Successfully saved to ${handle.name}`);
      } else {
        // Fallback for older browsers
        const extension = { python: "py", javascript: "js", java: "java", cpp: "cpp", c: "c", html: "html" }[language] || "txt";
        const safeFileName = fileName.trim() || `main.${extension}`;
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = safeFileName;
        link.click();
        URL.revokeObjectURL(url);
        setLastSaved(new Date().toLocaleTimeString());
        setTerminalOutput(`Downloaded ${safeFileName}`);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setTerminalOutput(`Save error: ${err.message}`);
      }
    }
  }

  function sendChatMessage() {
    const text = chatMessage.trim();
    if (!text) return;
    const msg = { user: username, text };
    setChatMessages((messages) => [...messages, msg]);
    socket.emit("chat-message", { roomId: joinedRoom || roomId, ...msg });
    setChatMessage("");
  }

  async function askAi() {
    const text = aiPrompt.trim();
    if (!text) return;

    const userMsg = { user: username, text };
    if (sharedAiRef.current) {
      sharedAiRef.current.push([userMsg]);
    } else {
      setAiMessages((messages) => [...messages, userMsg]);
    }

    setAiPrompt("");
    setAiLoading(true);

    try {
      console.log("Sending AI request with history...");
      const BACKEND_URL = import.meta.env.VITE_API_URL || 
        (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) 
          ? 'http://localhost:5000' 
          : "https://scalable-real-time-collaborative-code.onrender.com");
      console.log("[AI] Using BACKEND_URL:", BACKEND_URL);
        const response = await fetch(`${BACKEND_URL}/api/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            code,
            language,
            history: aiMessages.slice(-10) 
          })
        });

        const data = await response.json();
        if (!response.ok) {
          if (data.error && data.error.includes("GROQ_API_KEY")) {
             throw new Error("AI Assistant is not configured. Please add GROQ_API_KEY to your backend .env file.");
          }
          throw new Error(data.error || "AI request failed");
        }

      const aiMsg = { user: "AI", text: data.reply };
      if (sharedAiRef.current) {
        sharedAiRef.current.push([aiMsg]);
      } else {
        setAiMessages((messages) => [...messages, aiMsg]);
      }
    } catch (error) {
      const errorMsg = { user: "AI", text: `Error: ${error.message}` };
      if (sharedAiRef.current) {
        sharedAiRef.current.push([errorMsg]);
      } else {
        setAiMessages((messages) => [...messages, errorMsg]);
      }
    } finally {
      setAiLoading(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      setTerminalOutput(`Uploading ${file.name}...`);
      // Simulate upload and add a message
      const msg = {
        user: username,
        text: `📎 Sent a file: ${file.name}`,
        isFile: true
      };
      setChatMessages(prev => [...prev, msg]);
      socket.emit("chat-message", { roomId: joinedRoom || roomId, ...msg });
    }
  }

  const handleAddNewFile = () => {
    const name = newFileNameInput.trim();
    if (!name) return;

    if (!name.includes('.')) {
      setModalError("Extension is mandatory (e.g., .js, .py, .html)");
      return;
    }

    const parts = name.split('.');
    const ext = parts[parts.length - 1].toLowerCase();
    const langMap = { py: 'python', java: 'java', cpp: 'cpp', c: 'c', html: 'html' };

    if (!langMap[ext]) {
      setModalError(`Unsupported extension: .${ext}. Use .py, .js, .java, .cpp, .c, or .html`);
      return;
    }

    const lang = langMap[ext];

    // Check if file already exists
    if (files.find(f => f.name === name)) {
      setModalError(`File ${name} already exists.`);
      return;
    }

    const newFile = { name, lang };

    if (sharedFilesRef.current) {
      sharedFilesRef.current.push([newFile]);
    } else {
      setFiles(prev => [...prev, newFile]);
    }

    setTerminalOutput(`File ${name} created in explorer.`);

    // Success - close and reset
    setShowNewFileModal(false);
    setNewFileNameInput("");
    setModalError("");
  };

  const handleAddNewFolder = () => {
    const name = newFolderNameInput.trim();
    if (name) {
      const newFolder = { name, isFolder: true };
      if (sharedFilesRef.current) {
        sharedFilesRef.current.push([newFolder]);
      } else {
        setFiles(prev => [...prev, newFolder]);
      }
    }
    setShowNewFolderModal(false);
    setNewFolderNameInput("");
  };

  function closeFile(e, fileNameToClose) {
    e.stopPropagation();
    if (files.length <= 1) {
      setTerminalOutput("Cannot close the last file.");
      return;
    }
    const newFiles = files.filter(f => f.name !== fileNameToClose);
    setFiles(newFiles);
    // Also remove from open tabs if it was there
    setOpenFiles(prev => prev.filter(name => name !== fileNameToClose));

    if (activeFile === fileNameToClose) {
      const remainingOpen = openFiles.filter(name => name !== fileNameToClose);
      if (remainingOpen.length > 0) {
        const nextFile = files.find(f => f.name === remainingOpen[0]);
        setActiveFile(nextFile.name);
        setFileName(nextFile.name);
        if (nextFile.lang) setLanguage(nextFile.lang);
        setCode(languageTemplates[nextFile.lang] || '');
      }
    }
  }

  function closeTab(e, fileNameToClose) {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(name => name !== fileNameToClose);
    setOpenFiles(newOpenFiles);

    if (activeFile === fileNameToClose) {
      if (newOpenFiles.length > 0) {
        const nextFileName = newOpenFiles[0];
        const nextFile = files.find(f => f.name === nextFileName);
        setActiveFile(nextFileName);
        setFileName(nextFileName);
        if (nextFile?.lang) setLanguage(nextFile.lang);
        setCode(languageTemplates[nextFile?.lang] || '');
      } else {
        // No more tabs open, show a blank state or default
        setActiveFile(null);
        setFileName("No file open");
        setCode("");
      }
    }
  }

  // --- EXPLORER ACTIONS ---
  const handleExplorerAction = (action, item) => {
    setExplorerMenu(null);
    setItemToAction(item);
    switch (action) {
      case 'delete':
        setShowDeleteModal(true);
        break;
      case 'rename':
        setNewFileNameInput(item.name);
        setShowRenameModal(true);
        break;
      case 'download':
        if (item.isFolder) {
          setTerminalOutput("Folder download not supported yet.");
        } else {
          const blob = new Blob([code], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.name;
          a.click();
          URL.revokeObjectURL(url);
        }
        break;
      case 'share':
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl);
        setTerminalOutput(`Room link copied to clipboard! Share this to collaborate on ${item.name}`);
        break;
      case 'copy':
        setClipboard({ type: 'copy', item });
        setTerminalOutput(`Copied ${item.name}`);
        break;
      case 'cut':
        setClipboard({ type: 'cut', item });
        setTerminalOutput(`Cut ${item.name}`);
        break;
      default:
        break;
    }
  };

  const confirmRename = () => {
    if (newFileNameInput && itemToAction && sharedFilesRef.current) {
      const name = newFileNameInput.trim();
      const currentFiles = sharedFilesRef.current.toArray();
      const index = currentFiles.findIndex(f => f.name === itemToAction.name);

      if (index !== -1) {
        const updatedItem = { ...currentFiles[index], name };
        sharedFilesRef.current.delete(index);
        sharedFilesRef.current.insert(index, [updatedItem]);

        setOpenFiles(prev => prev.map(n => n === itemToAction.name ? name : n));
        if (activeFile === itemToAction.name) {
          setActiveFile(name);
          setFileName(name);
        }
        setTerminalOutput(`Renamed ${itemToAction.name} to ${name}`);
      }
    }
    setShowRenameModal(false);
    setItemToAction(null);
  };

  const confirmDelete = () => {
    if (itemToAction && sharedFilesRef.current) {
      const currentFiles = sharedFilesRef.current.toArray();
      const index = currentFiles.findIndex(f => f.name === itemToAction.name);

      if (index !== -1) {
        sharedFilesRef.current.delete(index);
        setOpenFiles(prev => prev.filter(name => name !== itemToAction.name));
        if (activeFile === itemToAction.name) {
          setActiveFile(null);
          setFileName("No file open");
          setCode("");
        }
        setTerminalOutput(`Deleted ${itemToAction.name}`);
      }
    }
    setShowDeleteModal(false);
    setItemToAction(null);
  };

  const handleChatAction = (action, index, message) => {
    setChatMenu(null);
    switch (action) {
      case 'delete':
        if (message.user === username) {
          setChatMessages(prev => prev.filter((_, i) => i !== index));
          setTerminalOutput("Message deleted.");
        } else {
          setTerminalOutput("You can only delete your own messages.");
        }
        break;
      case 'edit':
        if (message.user === username) {
          setItemToAction({ index, ...message });
          setMessageToEdit(message.text);
          setShowChatEditModal(true);
        } else {
          setTerminalOutput("You can only edit your own messages.");
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(message.text);
        setTerminalOutput("Message copied to clipboard.");
        break;
    }
  };

  const confirmChatEdit = () => {
    if (itemToAction && messageToEdit) {
      setChatMessages(prev => prev.map((msg, i) => i === itemToAction.index ? { ...msg, text: messageToEdit } : msg));
    }
    setShowChatEditModal(false);
    setItemToAction(null);
  };

  function leaveRoom() {
    navigate('/login');
  }

  // ================= MENU BAR =================

  function openLocalFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py,.js,.java,.cpp,.c,.html,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCode(ev.target.result);
        setFileName(file.name);
        const ext = file.name.split('.').pop();
        const langMap = { py: 'python', java: 'java', cpp: 'cpp', c: 'c', html: 'html' };
        if (langMap[ext]) setLanguage(langMap[ext]);
      };
      reader.readAsText(file);
    };
    input.click();
    setActiveMenu(null);
  }

  function saveAs() {
    const ext = { python: 'py', java: 'java', cpp: 'cpp', c: 'c', html: 'html' }[language];
    const newName = prompt('Save as:', fileName || `main.${ext}`);
    if (newName) {
      setFileName(newName);
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = newName;
      link.click();
      URL.revokeObjectURL(url);
      setTerminalOutput(`Saved as ${newName}.`);
    }
    setActiveMenu(null);
  }

  function revertFile() {
    if (window.confirm('Revert to default template for this language?')) {
      setCode(languageTemplates[language]);
      setTerminalOutput('File reverted to default template.');
    }
    setActiveMenu(null);
  }

  function triggerMonacoAction(actionId) {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger('keyboard', actionId);
    } else {
      setTerminalOutput("Editor not ready.");
    }
  }

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        setTerminalOutput(`Error entering full screen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  function shareRoom() {
    setShowInviteModal(true);
    setActiveMenu(null);
  }

  function openSearch() {
    triggerMonacoAction('actions.find');
  }

  const menuItems = [
    {
      label: "File",
      items: [
        { label: "New File...", shortcut: "Ctrl+Alt+N", action: () => { setShowNewFileModal(true); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Open File...", shortcut: "Ctrl+O", action: openLocalFile },
        { label: "separator" },
        { label: "Save", shortcut: "Ctrl+S", action: () => { saveCode(); setActiveMenu(null); } },
        { label: "Save As...", shortcut: "Ctrl+Shift+S", action: () => { saveCode(); setActiveMenu(null); } },
        { label: "Save All", shortcut: "Ctrl+K S", action: () => { saveCode(); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Share", shortcut: "", action: shareRoom },
        { label: "separator" },
        { label: `Auto Save ${autoSave ? '✓' : ''}`, shortcut: "", action: () => { setAutoSave(v => !v); setTerminalOutput(`Auto Save ${!autoSave ? 'enabled (saves 5s after changes)' : 'disabled'}.`); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Exit", shortcut: "", action: () => { leaveRoom(); setActiveMenu(null); } },
      ]
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => { triggerMonacoAction('undo'); setActiveMenu(null); } },
        { label: "Redo", shortcut: "Ctrl+Y", action: () => { triggerMonacoAction('redo'); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Cut", shortcut: "Ctrl+X", action: () => { triggerMonacoAction('editor.action.clipboardCutAction'); setActiveMenu(null); } },
        { label: "Copy", shortcut: "Ctrl+C", action: () => { triggerMonacoAction('editor.action.clipboardCopyAction'); setActiveMenu(null); } },
        { label: "Paste", shortcut: "Ctrl+V", action: () => { triggerMonacoAction('editor.action.clipboardPasteAction'); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Find", shortcut: "Ctrl+F", action: () => { triggerMonacoAction('actions.find'); setActiveMenu(null); } },
        { label: "Replace", shortcut: "Ctrl+H", action: () => { triggerMonacoAction('editor.action.startFindReplaceAction'); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Select All", shortcut: "Ctrl+A", action: () => { triggerMonacoAction('editor.action.selectAll'); setActiveMenu(null); } },
      ]
    },
    {
      label: "Go",
      items: [
        { label: "Back", shortcut: "Alt+Left", action: () => { window.history.back(); setActiveMenu(null); } },
        { label: "Forward", shortcut: "Alt+Right", action: () => { window.history.forward(); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Go to Line...", shortcut: "Ctrl+G", action: () => { triggerMonacoAction('editor.action.gotoLine'); setActiveMenu(null); } },
      ]
    },
    {
      label: "Run",
      items: [
        { label: "▶  Run Code", shortcut: "F5", action: () => { runCode(); setActiveMenu(null); } },
        { label: "separator" },
        { label: "Python", action: () => { setLanguage("python"); setFileName("main.py"); setCode(languageTemplates.python); setActiveMenu(null); } },

        { label: "C", action: () => { setLanguage("c"); setFileName("main.c"); setCode(languageTemplates.c); setActiveMenu(null); } },
        { label: "C++", action: () => { setLanguage("cpp"); setFileName("main.cpp"); setCode(languageTemplates.cpp); setActiveMenu(null); } },
        { label: "Java", action: () => { setLanguage("java"); setFileName("Main.java"); setCode(languageTemplates.java); setActiveMenu(null); } },
        { label: "HTML", action: () => { setLanguage("html"); setFileName("index.html"); setCode(languageTemplates.html); setActiveMenu(null); } },
      ]
    },
    {
      label: "Terminal",
      items: [
        { label: "New Terminal", action: () => { if (xtermInstance.current) { xtermInstance.current.clear(); xtermInstance.current.writeln('\x1b[32mNew terminal session started.\x1b[0m'); } setTerminalCollapsed(false); setTerminalHeight(210); setActiveTerminalTab('terminal'); setActiveMenu(null); } },
        { label: "Clear Terminal", action: () => { if (xtermInstance.current) { xtermInstance.current.clear(); } setTerminalCollapsed(false); setActiveTerminalTab('terminal'); setActiveMenu(null); } },
      ]
    },
    {
      label: "Help",
      action: () => { setIsAIOpen(true); setActiveMenu(null); }
    }
  ];

  return (
    <div className={`workspace ${theme}`} style={{
      "--left-width": `${leftWidth}px`,
      "--right-width": rightCollapsed ? '0px' : `${rightWidth}px`,
      "--terminal-height": `${terminalHeight}px`,
      "--chat-height": `${chatHeight}px`
    }} onClick={() => setActiveMenu(null)}>

      {/* Deep Space Background */}
      <div className="workspace-bg">
        <div className="workspace-grid" />
        <div className="workspace-orb blue"></div>
        <div className="workspace-orb purple"></div>
        <canvas id="workspace-particles" style={{ width: '100%', height: '100%' }}></canvas>
      </div>

      {/* ANALYSIS MODAL */}
      {showAnalysisModal && (
        <div className="modal-overlay" onClick={() => setShowAnalysisModal(false)}>
          <div className="custom-modal analysis-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Layout size={18} color="#2dd4bf" /> Learning & Improvement Analysis</h3>
              <button className="modal-close" onClick={() => setShowAnalysisModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body analysis-body">
              <div className="analysis-stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{100 - (problems.length * 5)}%</div>
                  <div className="stat-label">Code Quality</div>
                  <div className="stat-progress"><div className="progress-fill" style={{ width: `${100 - (problems.length * 5)}%` }}></div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{sessionErrorsCount}</div>
                  <div className="stat-label">Total Errors Tracked</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{problems.length === 0 ? "A+" : "B"}</div>
                  <div className="stat-label">Current Grade</div>
                </div>
              </div>

              <div className="analysis-section">
                <h4><Bot size={16} color="#8b5cf6" /> AI Learning Insight</h4>
                <div className="ai-insight-box">
                  {problems.length > 0 ? (
                    <p>I've noticed you're encountering <strong>{problems.length} issues</strong> related to syntax and types. Focusing on <strong>{language}</strong> documentation for these specific errors will help you improve your logic speed by 20%.</p>
                  ) : (
                    <p>Excellent work! Your code is currently clean. You've demonstrated strong attention to detail. Next step: Try optimizing your algorithm complexity.</p>
                  )}
                </div>
              </div>

              <div className="analysis-section">
                <h4><Zap size={16} color="#f59e0b" /> Achievement Unlocked</h4>
                <div className="achievements-list">
                  <div className="achievement-item active">
                    <div className="badge-icon"><Code size={16} /></div>
                    <div className="badge-info">
                      <h5>First Code Sync</h5>
                      <span>Successfully collaborated on a real-time project.</span>
                    </div>
                  </div>
                  <div className={`achievement-item ${sessionErrorsCount > 10 ? 'active' : 'locked'}`}>
                    <div className="badge-icon"><Trash2 size={16} /></div>
                    <div className="badge-info">
                      <h5>Error Buster</h5>
                      <span>Identified and fixed over 10 development errors.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn confirm" onClick={() => setShowAnalysisModal(false)}>Keep Growing</button>
            </div>
          </div>
        </div>
      )}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="custom-modal invite-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserPlus size={18} color="#2dd4bf" /> Invite Teammates</h3>
              <button className="modal-close" onClick={() => setShowInviteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Share this link with your team to start collaborating in real-time.</p>
              <div className="share-link-container">
                <input readOnly value={window.location.href} />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setTerminalOutput("Room link copied to clipboard!");
                    alert("Copied to clipboard!");
                  }}
                >
                  <Copy size={16} /> Copy
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn confirm" onClick={() => setShowInviteModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER AREA */}
      <header className="workspace-header" onClick={e => e.stopPropagation()}>
        <div className="header-left">
          <div className="workspace-logo" onClick={() => navigate("/")} style={{ cursor: 'pointer' }} title="Back to Landing Page">
            <Code size={20} color="#8b5cf6" strokeWidth={3} />
          </div>
          <nav className="menubar">
            {menuItems.map(menu => (
              <div key={menu.label} className="menubar-item">
                <button
                  className={`menubar-btn ${activeMenu === menu.label ? 'active' : ''}`}
                  onClick={() => {
                    if (menu.action) {
                      menu.action();
                    } else {
                      setActiveMenu(activeMenu === menu.label ? null : menu.label);
                    }
                  }}
                >
                  {menu.label}
                </button>
                {menu.items && activeMenu === menu.label && (
                  <div className="menubar-dropdown">
                    {menu.items.map((item, i) =>
                      item.label === "separator"
                        ? <div key={i} className="menu-separator" />
                        : (
                          <button key={i} className="menu-option" onClick={item.action}>
                            <span className="menu-label">{item.label}</span>
                            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                          </button>
                        )
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="header-center">
          <div className="badge active-user-count">
            <div className="dot pulse" />
            <span>active user: {activeUsers.length}</span>
          </div>
          <div className="badge live-sync">
            <div className="dot" />
            <span>Live Sync Active</span>
          </div>
        </div>

        <div className="header-right">
          <button className="header-icon-btn" onClick={() => { setShowSettingsModal(true); setSettingsTab('editor'); }}><Settings size={18} /> Settings</button>
          <button className="header-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Theme
          </button>
          {/* Panel Toggle Buttons - between Theme and User */}
          <div className="split-toggle-group">
            <button
              className={`split-toggle-btn ${leftView === 'explorer' ? 'collapsed' : ''}`}
              onClick={() => setLeftView(leftView === 'panel' ? 'explorer' : 'panel')}
              title={leftView === 'explorer' ? 'Show Panel' : 'Show Explorer'}
            >
              <PanelLeft size={16} />
            </button>
            <button
              className={`split-toggle-btn ${terminalCollapsed ? 'collapsed' : ''}`}
              onClick={() => { setTerminalCollapsed(!terminalCollapsed); setTerminalHeight(terminalCollapsed ? 210 : 40); }}
              title={terminalCollapsed ? 'Expand Terminal' : 'Collapse Terminal'}
            >
              <PanelBottom size={16} />
            </button>
            <button
              className={`split-toggle-btn ${rightCollapsed ? 'collapsed' : ''}`}
              onClick={() => setRightCollapsed(!rightCollapsed)}
              title={rightCollapsed ? 'Expand Chat' : 'Collapse Chat'}
            >
              <PanelRight size={16} />
            </button>
          </div>
          <div className="profile-dropdown-wrap" onClick={e => e.stopPropagation()}>
            <div className="profile-badge" onClick={() => setActiveMenu(activeMenu === 'profile' ? null : 'profile')}>
              <div className="profile-avatar">{username.charAt(0).toUpperCase()}</div>
              <span>{username}</span>
              <ChevronDown size={14} />
            </div>
            {activeMenu === 'profile' && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-avatar large">{username.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="profile-name">{username}</div>
                    <div className="profile-status-label">● Online</div>
                  </div>
                </div>
                <div className="profile-dropdown-divider" />
                <button className="profile-dropdown-item highlight-btn" onClick={() => { setShowAnalysisModal(true); setActiveMenu(null); }}>
                  <Layout size={14} /> Analyze Improvement
                </button>
                <button className="profile-dropdown-item" onClick={() => {
                  const status = prompt('Set your status:', 'Available');
                  if (status) setTerminalOutput(`Status updated: ${status}`);
                  setActiveMenu(null);
                }}>
                  <Users size={14} /> User Status
                </button>
                <div className="profile-dropdown-divider" />
                <button className="profile-dropdown-item danger" onClick={() => { leaveRoom(); setActiveMenu(null); }}>
                  <X size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="left-sidebar">

        {leftView === 'explorer' ? (
          /* ---- FILE EXPLORER VIEW ---- */
          <>
            <div className="sidebar-header">
              <span className="sidebar-title">EXPLORER</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="icon-only-btn" onClick={() => setShowNewFileModal(true)} title="New File"><FilePlus size={16} /></button>
                <button className="icon-only-btn" onClick={() => setShowNewFolderModal(true)} title="New Folder"><FolderPlus size={16} /></button>
              </div>
            </div>
            <section className="explorer-section">
              <div
                className="explorer-item folder"
                onClick={() => {
                  const name = roomId || 'Project';
                  setExpandedFolders(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
                }}
              >
                {expandedFolders.includes(roomId || 'Project') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <Folder size={13} color="#f59e0b" fill="#f59e0b" />
                <span>{roomId || 'Project'}</span>
              </div>

              {expandedFolders.includes(roomId || 'Project') && (
                <div className="explorer-children">
                  {files.map(file => (
                    <div
                      key={file.name}
                      className={`explorer-item ${file.isFolder ? 'folder' : 'file'} ${activeFile === file.name ? 'active' : ''}`}
                      onClick={() => {
                        if (file.isFolder) {
                          setExpandedFolders(prev => prev.includes(file.name) ? prev.filter(f => f !== file.name) : [...prev, file.name]);
                          return;
                        }

                        // Add to open files if not already there
                        if (!openFiles.includes(file.name)) {
                          setOpenFiles(prev => [...prev, file.name]);
                        }

                        setActiveFile(file.name);
                        setFileName(file.name);
                        if (file.lang) setLanguage(file.lang);
                        setCode(languageTemplates[file.lang] || '');
                      }}
                    >
                      {file.isFolder ? (
                        <>
                          {expandedFolders.includes(file.name) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <Folder size={13} color="#f59e0b" fill="#f59e0b" />
                        </>
                      ) : (
                        <FileCode size={13} color={file.lang === 'python' ? '#3b82f6' : file.lang === 'html' ? '#f97316' : '#facc15'} />
                      )}
                      <span>{file.name}</span>
                      <button
                        className={`explorer-item-more ${explorerMenu?.name === file.name ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setExplorerMenu({ name: file.name, x: rect.left - 170, y: rect.top, item: file });
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* ---- PANEL VIEW ---- */
          <>
            <section className="sidebar-section">
              <label className="input-label">Your Name</label>
              <div className="input-with-icon">
                <User size={16} className="icon" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              </div>

              <label className="input-label">Room Code</label>
              <div className="input-with-icon">
                <Key size={16} className="icon" />
                <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter room code" />
              </div>

              <div className="sidebar-buttons">
                <button className="create-btn" onClick={createRoom}>Create</button>
                <button className="join-btn" onClick={() => joinRoom(roomId)}>Join</button>
              </div>
            </section>
          </>
        )}

        {/* ACTIVE USERS - Always visible at bottom of sidebar */}
        <section className="sidebar-section active-users-section">
          <div className="section-header">
            <Users size={16} />
            <h2>ACTIVE USERS ({activeUsers.length})</h2>
          </div>
          <div className="users-list">
            {activeUsers.map((user) => (
              <div className="user-item" key={user.id}>
                <div className="user-dot" />
                <span>{user.name} {user.name === username ? <small style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>(You)</small> : ''}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="sidebar-footer">
          <button className="invite-btn" onClick={shareRoom}>
            <Plus size={18} /> Invite Users
          </button>
        </div>
      </aside>

      <main className="editor-column">
        <header className="editor-tabs">
          <div className="editor-tabs-scroll">
            {openFiles.map(openedName => {
              const file = files.find(f => f.name === openedName);
              if (!file) return null;
              return (
                <div
                  key={file.name}
                  className={`editor-tab ${activeFile === file.name ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFile(file.name);
                    setFileName(file.name);
                    if (file.lang) setLanguage(file.lang);
                    setCode(languageTemplates[file.lang] || '');
                  }}
                >
                  <FileCode size={14} color={file.lang === 'python' ? '#3b82f6' : file.lang === 'html' ? '#f97316' : '#facc15'} />
                  <span>{file.name}</span>
                  <button className="close-tab-btn" onClick={(e) => closeTab(e, file.name)}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <button className="add-tab-btn" onClick={() => setShowNewFileModal(true)}>+</button>
          <div className="editor-tab-actions">
            <select value={language} onChange={changeLanguage} className="lang-select">
              <option value="python">Python</option>

              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="html">HTML</option>
            </select>
            <button className="run-code-btn" onClick={runCode}>
              <Zap size={14} fill="white" /> Run Code
            </button>
          </div>
        </header>

        <section className="code-panel">
          <Editor
            height="100%"
            language={language}
            theme={theme === "dark" ? "vs-dark" : "light"}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              setEditorInstance(editor);

              // Register custom snippets for all languages
              const languages = ['python', 'java', 'cpp', 'c', 'html'];

              languages.forEach(lang => {
                monaco.languages.registerCompletionItemProvider(lang, {
                  provideCompletionItems: (model, position) => {
                    const word = model.getWordUntilPosition(position);
                    const range = {
                      startLineNumber: position.lineNumber,
                      endLineNumber: position.lineNumber,
                      startColumn: word.startColumn,
                      endColumn: word.endColumn
                    };

                    const snippets = {
                      python: [
                        { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:fname}(${2:params}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a function' },
                        { label: 'ifmain', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if __name__ == "__main__":\n\t${1:main()}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main block' },
                        { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Class definition' }
                      ],

                      java: [
                        { label: 'sout', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'System.out.println(${1:text});', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
                        { label: 'psvm', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'public static void main(String[] args) {\n\t${1}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main method' }
                      ],
                      cpp: [
                        { label: 'cout', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'std::cout << ${1:value} << std::endl;', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Standard output' }
                      ]
                    };

                    const currentSnippets = snippets[lang] || [];

                    return {
                      suggestions: [
                        ...currentSnippets.map(s => ({ ...s, range }))
                      ]
                    };
                  }
                });
              });
            }}
            onChange={(newValue) => { setCode(newValue); }}
            options={{
              minimap: { enabled: showMinimap },
              fontSize: editorFontSize,
              tabSize: tabSize,
              wordWrap: wordWrap,
              lineNumbers: showLineNumbers ? 'on' : 'off',
              cursorStyle: cursorStyle,
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              renderLineHighlight: 'all',
              quickSuggestions: {
                other: true,
                comments: true,
                strings: true
              },
              parameterHints: {
                enabled: true
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: true,
              suggest: {
                showWords: true,
                showSnippets: true,
                showUsers: true
              }
            }}
          />
        </section>

        <button className="resize-handle resize-terminal" onPointerDown={(e) => startResize("terminal", e)} />

        <section className="terminal-panel">
          <div className="terminal-header">
            <div className="terminal-tabs-container">
              {["problems", "terminal", "live preview"].map(tab => (
                <div
                  key={tab}
                  className={`terminal-tab ${activeTerminalTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTerminalTab(tab)}
                >
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </div>
              ))}
            </div>
            <div className="terminal-actions">
              <button onClick={() => setTerminalOutput("")} title="Clear Terminal"><Trash2 size={16} /></button>
              <button onClick={() => { setTerminalCollapsed(true); setTerminalHeight(40); }} title="Collapse Panel"><X size={16} /></button>
            </div>
          </div>
          <div className={`terminal-body ${activeTerminalTab === "terminal" ? "terminal-interactive" : ""}`} ref={terminalRef}>
            {activeTerminalTab === "terminal" && (
              <div
                ref={xtermRef}
                className="terminal-xterm-container"
                style={{ height: '100%', width: '100%', padding: '4px' }}
              />
            )}
            {activeTerminalTab === "problems" && (
              <div className="problems-view">
                {problems.length === 0 ? (
                  <div className="no-problems">
                    <CheckCircle size={40} color="#4ade80" />
                    <p>No problems have been detected in the workspace.</p>
                  </div>
                ) : (
                  <div className="problems-list">
                    {problems.map(p => (
                      <div
                        key={p.id}
                        className={`problem-item ${p.severity.toLowerCase()}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (editorInstance && p.line > 0) {
                            editorInstance.revealLineInCenter(p.line);
                            editorInstance.setSelection({
                              startLineNumber: p.line,
                              startColumn: 1,
                              endLineNumber: p.line,
                              endColumn: 1000
                            });
                            editorInstance.focus();
                          }
                        }}
                      >
                        <span className="problem-severity">{p.severity}:</span>
                        <span className="problem-msg">{p.message}</span>
                        <span className="problem-loc">Line {p.line}</span>
                        {p.fix && (
                          <button
                            className="ai-fix-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // Don't trigger line selection
                              const fixedCode = p.fix(code);
                              setCode(fixedCode);
                              setTerminalOutput(`[AI] Automatically fixed: ${p.message}`);
                            }}
                          >
                            <Zap size={12} /> Fix with AI
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTerminalTab === "output" && (
              <div className="terminal-placeholder-content">
                <p className="log-line">[System] Initializing build environment...</p>
                <p className="log-line">[System] Fetching dependencies...</p>
                <p className="log-line">[System] Ready for execution.</p>
              </div>
            )}
            {activeTerminalTab === "debug console" && (
              <div className="terminal-placeholder-content">
                <p className="debug-line">Debug session started...</p>
                <p className="debug-line text-muted">Listening on debugger port...</p>
              </div>
            )}
            {activeTerminalTab === "live preview" && (
              <div className="live-preview-container" style={{ height: '100%', background: 'white' }}>
                {language === 'html' ? (
                  <iframe
                    title="Live Preview"
                    srcDoc={code}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <div className="no-preview-msg" style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
                    <Globe size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Live Preview is only available for HTML files.</p>
                  </div>
                )}
              </div>
            )}
            {activeTerminalTab === "ports" && (
              <div className="terminal-placeholder-content">
                <table className="ports-table">
                  <thead>
                    <tr>
                      <th>Port</th>
                      <th>Protocol</th>
                      <th>Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>5173</td>
                      <td>HTTP</td>
                      <td>your-app.vercel.app</td>
                      <td className="status-open">Open</td>
                    </tr>
                    <tr>
                      <td>5000</td>
                      <td>HTTP</td>
                      <td>scalable-real-time-collaborative-code.onrender.com</td>
                      <td className="status-open">Open</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <aside className="right-sidebar" style={rightCollapsed ? { width: '0', minWidth: '0', overflow: 'hidden', border: 'none' } : {}}>
        <section className="chat-panel">
          <div className="sidebar-header">
            <MessageSquare size={16} />
            <span className="sidebar-title">TEAM CHAT</span>
          </div>
          <div className="messages">
            {chatMessages.map((message, index) => {
              const isOwn = message.user === username;
              return (
                <div key={index} className={`message-item-box ${isOwn ? 'own' : 'other'}`}>
                  <div className="message-box">
                    <div className="message-box-header">{isOwn ? 'you' : message.user}</div>
                    <p className="message-box-text">{message.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="message-form-simple">
            <label className="attach-btn">
              <Plus size={20} />
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            <input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} placeholder="type here ....." />
            <button className="chat-send-btn" onClick={sendChatMessage}>
              <SendIcon size={18} />
            </button>
          </div>
        </section>
      </aside>

      <footer className="workspace-status-bar">
        <div className="status-left">
          <div className="status-item">
            <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="status-item">Python 3.11.0</div>
          <div className="status-item">UTF-8</div>
          <div
            className={`status-item follow-mode-btn ${isFollowing ? 'active' : ''}`}
            onClick={() => setIsFollowing(!isFollowing)}
            title="Toggle Follow Mode: Automatically switch to the file others are editing"
          >
            <Zap size={14} fill={isFollowing ? "white" : "transparent"} />
            Follow Mode: {isFollowing ? 'On' : 'Off'}
          </div>
        </div>
        <div className="status-right">
          {lastSaved && (
            <div className="status-item" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} /> Saved {lastSaved}
            </div>
          )}
          <div className="status-item">Ln 1, Col 1</div>
          <div className="status-item">Spaces: 4</div>
        </div>
      </footer>

      {/* ===== SETTINGS MODAL ===== */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2><Settings size={20} color="#2dd4bf" /> Settings</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}><X size={18} /></button>
            </div>
            <div className="settings-body">
              {/* Tabs */}
              <div className="settings-tabs">
                {[['editor', 'Editor'], ['appearance', 'Appearance'], ['terminal', 'Terminal'], ['collaboration', 'Collaboration'], ['keybindings', 'Keybindings']].map(([key, label]) => (
                  <button key={key} className={`settings-tab-btn ${settingsTab === key ? 'active' : ''}`} onClick={() => setSettingsTab(key)}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="settings-content">

                {/* EDITOR TAB */}
                {settingsTab === 'editor' && (
                  <div className="settings-section-list">
                    <div className="settings-group">
                      <h4>Editor</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Font Size</span>
                          <span className="setting-desc">Controls the font size in pixels for the editor.</span>
                        </div>
                        <div className="setting-control">
                          <input type="range" min="10" max="28" value={editorFontSize} onChange={e => setEditorFontSize(Number(e.target.value))} className="settings-range" />
                          <span className="setting-value-badge">{editorFontSize}px</span>
                        </div>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Tab Size</span>
                          <span className="setting-desc">Number of spaces inserted per tab.</span>
                        </div>
                        <select className="settings-select" value={tabSize} onChange={e => setTabSize(Number(e.target.value))}>
                          {[2, 4, 8].map(v => <option key={v} value={v}>{v} spaces</option>)}
                        </select>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Word Wrap</span>
                          <span className="setting-desc">Controls how lines are wrapped in the editor.</span>
                        </div>
                        <select className="settings-select" value={wordWrap} onChange={e => setWordWrap(e.target.value)}>
                          <option value="off">Off</option>
                          <option value="on">On</option>
                          <option value="wordWrapColumn">At column</option>
                          <option value="bounded">Bounded</option>
                        </select>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Line Numbers</span>
                          <span className="setting-desc">Show line numbers in the gutter.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={showLineNumbers} onChange={e => setShowLineNumbers(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Minimap</span>
                          <span className="setting-desc">Show/hide the editor minimap on the right.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={showMinimap} onChange={e => setShowMinimap(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Cursor Style</span>
                          <span className="setting-desc">Set the cursor style in the editor.</span>
                        </div>
                        <select className="settings-select" value={cursorStyle} onChange={e => setCursorStyle(e.target.value)}>
                          <option value="line">Line</option>
                          <option value="block">Block</option>
                          <option value="underline">Underline</option>
                          <option value="line-thin">Line (Thin)</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h4>Files</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Auto Save</span>
                          <span className="setting-desc">Automatically save files after changes.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      {autoSave && (
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Auto Save Delay</span>
                            <span className="setting-desc">Delay in ms before auto saving.</span>
                          </div>
                          <select className="settings-select" value={autoSaveDelay} onChange={e => setAutoSaveDelay(Number(e.target.value))}>
                            <option value={1000}>1 second</option>
                            <option value={3000}>3 seconds</option>
                            <option value={5000}>5 seconds</option>
                            <option value={10000}>10 seconds</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* APPEARANCE TAB */}
                {settingsTab === 'appearance' && (
                  <div className="settings-section-list">
                    <div className="settings-group">
                      <h4>Theme</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Color Theme</span>
                          <span className="setting-desc">Switch between dark and light modes.</span>
                        </div>
                        <div className="theme-toggle-group">
                          <button className={`theme-choice-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                            <Moon size={16} /> Dark
                          </button>
                          <button className={`theme-choice-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                            <Sun size={16} /> Light
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="settings-group">
                      <h4>Accent Color</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Primary Accent</span>
                          <span className="setting-desc">Changes the highlight color across the editor.</span>
                        </div>
                        <div className="accent-colors">
                          {['#2dd4bf', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444', '#10b981'].map(color => (
                            <button
                              key={color}
                              className={`accent-swatch ${accentColor === color ? 'active' : ''}`}
                              style={{ background: color }}
                              onClick={() => {
                                setAccentColor(color);
                                document.documentElement.style.setProperty('--accent', color);
                                document.documentElement.style.setProperty('--accent-glow', color + '40');
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="settings-group">
                      <h4>Layout</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Left Panel</span>
                          <span className="setting-desc">Toggle the left sidebar visibility.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={leftView === 'panel' || leftView === 'explorer'} onChange={e => setLeftView(e.target.checked ? 'panel' : 'hidden')} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Chat Panel</span>
                          <span className="setting-desc">Toggle the right chat sidebar.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={!rightCollapsed} onChange={e => setRightCollapsed(!e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Terminal Panel</span>
                          <span className="setting-desc">Toggle the bottom terminal panel.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={!terminalCollapsed} onChange={e => { setTerminalCollapsed(!e.target.checked); setTerminalHeight(e.target.checked ? 210 : 40); }} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TERMINAL TAB */}
                {settingsTab === 'terminal' && (
                  <div className="settings-section-list">
                    <div className="settings-group">
                      <h4>Terminal</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Terminal Font Size</span>
                          <span className="setting-desc">Controls the font size in the integrated terminal.</span>
                        </div>
                        <div className="setting-control">
                          <input type="range" min="10" max="22" value={terminalFontSize} onChange={e => {
                            const sz = Number(e.target.value);
                            setTerminalFontSize(sz);
                            if (xtermInstance.current) xtermInstance.current.options.fontSize = sz;
                            if (fitAddon.current) fitAddon.current.fit();
                          }} className="settings-range" />
                          <span className="setting-value-badge">{terminalFontSize}px</span>
                        </div>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Clear on Run</span>
                          <span className="setting-desc">Clear terminal output before each new run.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={clearTerminalOnRun} onChange={e => setClearTerminalOnRun(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Terminal Height</span>
                          <span className="setting-desc">Default height of the terminal panel.</span>
                        </div>
                        <div className="setting-control">
                          <input type="range" min="80" max="500" value={terminalHeight} onChange={e => setTerminalHeight(Number(e.target.value))} className="settings-range" />
                          <span className="setting-value-badge">{terminalHeight}px</span>
                        </div>
                      </div>
                      <div className="setting-row" style={{ marginTop: '12px' }}>
                        <div className="setting-info">
                          <span className="setting-label">Clear Terminal Now</span>
                          <span className="setting-desc">Immediately clear the current terminal output.</span>
                        </div>
                        <button className="settings-action-btn" onClick={() => { if (xtermInstance.current) xtermInstance.current.clear(); }}>
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* COLLABORATION TAB */}
                {settingsTab === 'collaboration' && (
                  <div className="settings-section-list">
                    <div className="settings-group">
                      <h4>Your Identity</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Display Name</span>
                          <span className="setting-desc">Your visible name to other collaborators.</span>
                        </div>
                        <input
                          className="settings-text-input"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder="Your username..."
                        />
                      </div>
                    </div>
                    <div className="settings-group">
                      <h4>Follow Mode</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Follow Mode</span>
                          <span className="setting-desc">Automatically switch to the file others are editing.</span>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={isFollowing} onChange={e => setIsFollowing(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="settings-group">
                      <h4>Room</h4>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Current Room</span>
                          <span className="setting-desc">The room you are currently connected to.</span>
                        </div>
                        <span className="setting-value-badge" style={{ fontSize: '13px', padding: '6px 12px' }}>{joinedRoom || 'Not joined'}</span>
                      </div>
                      <div className="setting-row">
                        <div className="setting-info">
                          <span className="setting-label">Invite Collaborators</span>
                          <span className="setting-desc">Share the room link with your team.</span>
                        </div>
                        <button className="settings-action-btn" onClick={() => { setShowInviteModal(true); setShowSettingsModal(false); }}>
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* KEYBINDINGS TAB */}
                {settingsTab === 'keybindings' && (
                  <div className="settings-section-list">
                    <div className="settings-group">
                      <h4>Keyboard Shortcuts</h4>
                      <div className="keybindings-table">
                        {[
                          ['Run Code', 'F5'],
                          ['Save File', 'Ctrl + S'],
                          ['New File', 'Ctrl + N'],
                          ['Find', 'Ctrl + F'],
                          ['Replace', 'Ctrl + H'],
                          ['Select All', 'Ctrl + A'],
                          ['Undo', 'Ctrl + Z'],
                          ['Redo', 'Ctrl + Y'],
                          ['Go to Line', 'Ctrl + G'],
                          ['Comment Line', 'Ctrl + /'],
                          ['Toggle Terminal', 'Ctrl + `'],
                          ['Format Code', 'Shift + Alt + F'],
                          ['Indent Line', 'Tab'],
                          ['Outdent Line', 'Shift + Tab'],
                        ].map(([action, keys]) => (
                          <div key={action} className="keybinding-row">
                            <span className="kb-action">{action}</span>
                            <kbd className="kb-key">{keys}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
            <div className="settings-footer">
              <button className="modal-btn cancel" onClick={() => setShowSettingsModal(false)}>Close</button>
              <button className="modal-btn confirm" onClick={() => { setShowSettingsModal(false); setTerminalOutput('Settings saved successfully.'); }}>
                <Zap size={14} fill="currentColor" /> Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className={`ai-floating-btn ${isDraggingBtn ? 'dragging' : ''} ${problems.some(p => p.severity === 'Error') ? 'has-errors' : problems.length > 0 ? 'has-warnings' : ''}`}
        style={{
          left: `${aiBtnPosition.x}px`,
          top: `${aiBtnPosition.y}px`,
          position: 'fixed',
          zIndex: 9999
        }}
        onMouseDown={onBtnDragStart}
        onClick={(e) => {
          // If we were dragging, don't trigger click
          const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.current.x, 2) + Math.pow(e.clientY - dragStartPos.current.y, 2));
          if (dist < 8) {
            setIsAIOpen(!isAIOpen);
            if (!isAIOpen && problems.length > 0) {
              const errorMsgs = problems.map(p => `- ${p.message} (Line ${p.line})`).join('\n');
              setAiPrompt(`I see ${problems.length} issues in the code:\n${errorMsgs}\n\nCan you help me fix them?`);
            }
          }
        }}
        aria-label="Toggle AI Assistant"
        title={problems.length > 0 ? `${problems.length} Code Issues Detected` : "AI Assistant"}
      >
        <Bot size={28} />
        {problems.length > 0 && (
          <div className="ai-badge-count">{problems.length}</div>
        )}
      </button>

      {isAIOpen && (
        <div
          className="ai-popup-window"
          style={{
            left: `${aiPosition.x}px`,
            top: `${aiPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'auto'
          }}
        >
          <div className="ai-popup-header" onMouseDown={onDragStart} style={{ cursor: 'grab' }}>
            <h2><Bot size={20} color="#4ade80" /> AI Assistant (ask AI....)</h2>
            <button className="ai-close-btn" onClick={() => setIsAIOpen(false)} onMouseDown={e => e.stopPropagation()}>
              <X size={20} />
            </button>
          </div>
          <div className="ai-popup-messages messages" ref={aiContainerRef}>
            {aiMessages.map((message, index) => (
              <div key={index} className="ai-message-block" style={{ marginBottom: "16px" }}>
                <strong>{message.user}:</strong>
                {message.user === "AI" ? <ReactMarkdown>{message.text}</ReactMarkdown> : <p style={{ marginTop: "4px" }}>{message.text}</p>}
              </div>
            ))}
            {aiLoading && (
              <div className="ai-message-block" style={{ marginBottom: "16px", opacity: 0.7 }}>
                <strong>AI:</strong> <span className="ai-thinking-dots">Thinking...</span>
              </div>
            )}
            <div ref={aiMessagesEndRef} />
          </div>
          <div className="ai-popup-form message-form">
            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askAi()} placeholder="Ask me anything about the code..." disabled={aiLoading} />
            <button onClick={askAi} disabled={aiLoading}>{aiLoading ? "..." : "Send"}</button>
          </div>
        </div>
      )}

      {/* NEW FILE MODAL */}
      {showNewFileModal && (
        <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FileCode size={18} color="#4ade80" /> Create New File</h3>
              <button className="modal-close" onClick={() => setShowNewFileModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label>Filename (Extension mandatory)</label>
              <input
                autoFocus
                className={modalError ? 'error-input' : ''}
                value={newFileNameInput}
                onChange={e => {
                  setNewFileNameInput(e.target.value);
                  setModalError("");
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddNewFile()}
                placeholder="e.g. script.js, app.py"
              />
              {modalError ? (
                <p className="modal-error-text" style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>{modalError}</p>
              ) : (
                <p className="modal-hint">Tip: Use extensions like .js, .py, or .html to set language automatically.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowNewFileModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleAddNewFile}>
                <Zap size={14} fill="currentColor" /> Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FolderPlus size={18} color="#f59e0b" /> Create New Folder</h3>
              <button className="modal-close" onClick={() => setShowNewFolderModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label>Folder Name</label>
              <input
                autoFocus
                value={newFolderNameInput}
                onChange={e => setNewFolderNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNewFolder()}
                placeholder="Enter folder name..."
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={handleAddNewFolder}>
                <Zap size={14} fill="currentColor" /> Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPLORER CONTEXT MENU */}
      {explorerMenu && (
        <div className="explorer-context-menu-overlay" onClick={() => setExplorerMenu(null)}>
          <div
            className="explorer-context-menu"
            style={{ left: `${explorerMenu.x}px`, top: `${explorerMenu.y}px` }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => handleExplorerAction('cut', explorerMenu.item)}><Layout size={14} /> Cut</button>
            <button onClick={() => handleExplorerAction('copy', explorerMenu.item)}><Share2 size={14} /> Copy</button>
            <div className="menu-separator" />
            <button onClick={() => handleExplorerAction('rename', explorerMenu.item)}><Edit2 size={14} /> Rename</button>
            <button onClick={() => handleExplorerAction('download', explorerMenu.item)}><Download size={14} /> Download</button>
            <button onClick={() => handleExplorerAction('share', explorerMenu.item)}><Share size={14} /> Share</button>
            <div className="menu-separator" />
            <button className="danger" onClick={() => handleExplorerAction('delete', explorerMenu.item)}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit2 size={18} color="#4ade80" /> Rename Item</h3>
              <button className="modal-close" onClick={() => setShowRenameModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label>New Name</label>
              <input
                autoFocus
                value={newFileNameInput}
                onChange={e => setNewFileNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmRename()}
                placeholder="Enter new name..."
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowRenameModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={confirmRename}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Trash2 size={18} color="#f87171" /> Delete Item</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text)', fontSize: '14px' }}>Are you sure you want to delete <strong>{itemToAction?.name}</strong>?</p>
              <p className="modal-hint" style={{ color: '#f87171' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={confirmDelete} style={{ background: '#f87171 !important', color: 'white !important' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* CHAT CONTEXT MENU */}
      {chatMenu && (
        <div className="explorer-context-menu-overlay" onClick={() => setChatMenu(null)}>
          <div
            className="explorer-context-menu chat-context-menu"
            style={{ left: `${chatMenu.x}px`, top: `${chatMenu.y}px` }}
            onClick={e => e.stopPropagation()}
          >
            {chatMenu.message.user === username && (
              <button onClick={() => handleChatAction('edit', chatMenu.index, chatMenu.message)}><Edit2 size={14} /> Edit</button>
            )}
            <button onClick={() => handleChatAction('copy', chatMenu.index, chatMenu.message)}><Share2 size={14} /> Copy</button>
            {chatMenu.message.user === username && (
              <>
                <div className="menu-separator" />
                <button className="danger" onClick={() => handleChatAction('delete', chatMenu.index, chatMenu.message)}><Trash2 size={14} /> Delete</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHAT EDIT MODAL */}
      {showChatEditModal && (
        <div className="modal-overlay" onClick={() => setShowChatEditModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit2 size={18} color="#4ade80" /> Edit Message</h3>
              <button className="modal-close" onClick={() => setShowChatEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label>Message</label>
              <textarea
                autoFocus
                value={messageToEdit}
                onChange={e => setMessageToEdit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && confirmChatEdit()}
                placeholder="Edit your message..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: 'var(--text)',
                  minHeight: '80px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowChatEditModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={confirmChatEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workspace;

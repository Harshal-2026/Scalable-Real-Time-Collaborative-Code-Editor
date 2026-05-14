require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Groq = require("groq-sdk");
const WebSocket = require("ws");
const Y = require("yjs");
const { setupWSConnection, setPersistence } = require("y-websocket/bin/utils");
const { LeveldbPersistence } = require("y-leveldb");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const pty = require("node-pty");
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const bcrypt = require("bcryptjs");
const { Level } = require("level");

// Groq is initialized lazily to avoid crashing at startup if API key is missing
let groq = null;
function getGroqClient() {
    if (!groq) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            if (process.env.NODE_ENV === "production") {
                throw new Error("GROQ_API_KEY environment variable is not set. Please add it in your Render dashboard.");
            } else {
                console.warn("[AI] GROQ_API_KEY is missing. AI Assistant will run in MOCK mode.");
                return null;
            }
        }
        groq = new Groq({ apiKey });
    }
    return groq;
}
const app = express();

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl)
        if (!origin) return callback(null, true);
        // Allow any localhost / 127.0.0.1
        if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
            return callback(null, true);
        }
        // Allow any Vercel preview/production URL
        if (origin.endsWith(".vercel.app")) {
            return callback(null, true);
        }
        // Allow explicitly listed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));
app.use(express.json());

// ----- AUTHENTICATION CONFIGURATION -----
app.use(session({
    secret: process.env.SESSION_SECRET || "coderoom-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Google Strategy
console.log("Checking Google Credentials...", { 
    id: process.env.GOOGLE_CLIENT_ID ? "PRESENT" : "MISSING",
    secret: process.env.GOOGLE_CLIENT_SECRET ? "PRESENT" : "MISSING" 
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log("Registering Google Strategy...");
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.BACKEND_URL 
            ? `${process.env.BACKEND_URL}/auth/google/callback` 
            : "/auth/google/callback"
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, {
            id: profile.id,
            username: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatar: profile.photos?.[0]?.value,
            provider: "google"
        });
    }));
}

// GitHub Strategy
console.log("Checking GitHub Credentials...", { 
    id: process.env.GITHUB_CLIENT_ID ? "PRESENT" : "MISSING",
    secret: process.env.GITHUB_CLIENT_SECRET ? "PRESENT" : "MISSING" 
});

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    console.log("Registering GitHub Strategy...");
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.BACKEND_URL 
            ? `${process.env.BACKEND_URL}/auth/github/callback` 
            : "/auth/github/callback"
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, {
            id: profile.id,
            username: profile.username || profile.displayName,
            email: profile.emails?.[0]?.value,
            avatar: profile.photos?.[0]?.value,
            provider: "github"
        });
    }));
}

// Auth Routes
app.get("/auth/google", (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).send("Configuration Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing in Render Environment Variables.");
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

app.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:5173/login" }),
    (req, res) => {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth-success?user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

app.get("/auth/github", (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        return res.status(500).send("Configuration Error: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are missing in Render Environment Variables.");
    }
    passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

app.get("/auth/github/callback", 
    passport.authenticate("github", { failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:5173/login" }),
    (req, res) => {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth-success?user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

app.get("/auth/logout", (req, res) => {
    req.logout(() => {
        res.redirect(process.env.FRONTEND_URL);
    });
});

app.get("/auth/me", (req, res) => {
    res.json(req.user || null);
});

// ----- EMAIL/PASSWORD AUTHENTICATION -----
const USER_DB_PATH = path.join(__dirname, "users-db");
const userDb = new Level(USER_DB_PATH, { valueEncoding: "json" });

app.post("/auth/register", async (req, res) => {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    try {
        // Check if user exists
        try {
            await userDb.get(email);
            return res.status(400).json({ error: "User already exists" });
        } catch (e) {
            // User doesn't exist, proceed
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            username: username || email.split("@")[0],
            provider: "local"
        };

        await userDb.put(email, user);
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    try {
        const user = await userDb.get(email);
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Remove password before sending to client
        const { password: _, ...userWithoutPassword } = user;
        
        // Log user in manually for session-based auth
        req.login(userWithoutPassword, (err) => {
            if (err) return res.status(500).json({ error: "Login failed" });
            res.json({ user: userWithoutPassword });
        });
    } catch (error) {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

const server = http.createServer(app);

// ----- YJS WITH PERSISTENCE -----
const YJS_DB_PATH = process.env.YJS_DB_PATH || path.join(__dirname, "yjs-db");
const ldb = new LeveldbPersistence(YJS_DB_PATH);
setPersistence({
  bindState: async (docName, ydoc) => {
    const persistedYdoc = await ldb.getYDoc(docName);
    const newUpdates = Y.encodeStateAsUpdate(ydoc);
    ldb.storeUpdate(docName, newUpdates);
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
    ydoc.on("update", (update) => {
      ldb.storeUpdate(docName, update);
    });
  },
  writeState: async (docName, ydoc) => {
    return new Promise((resolve) => resolve());
  }
});

const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  // Let Socket.io handle its own upgrades
  if (request.url.startsWith("/socket.io/")) return;
  
  // Pass everything else to Yjs WebSocket Server
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", setupWSConnection);

// ----- ROOMS, ACTIVE USERS, CHAT PERSISTENCE -----
const io = new Server(server, { cors: { origin: "*" } });
const rooms = new Map();

function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { messages: [], users: [] });
    }
    return rooms.get(roomId);
}

io.on("connection", (socket) => {
    socket.on("join-room", (payload) => {
        const roomId = typeof payload === "string" ? payload : payload.roomId;
        const username = typeof payload === "object" && payload.username ? payload.username : `Guest-${socket.id.slice(0, 4)}`;

        if (!roomId) return;

        // Leave old room if any
        if (socket.data.roomId && socket.data.roomId !== roomId) {
            const oldRoom = rooms.get(socket.data.roomId);
            if (oldRoom) {
                oldRoom.users = oldRoom.users.filter(u => u.id !== socket.id);
                socket.leave(socket.data.roomId);
                io.to(socket.data.roomId).emit("room-users", oldRoom.users);
            }
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.username = username;

        const room = getOrCreateRoom(roomId);
        
        // Remove existing entry for this socket if any (to avoid duplicates)
        room.users = room.users.filter(u => u.id !== socket.id);
        room.users.push({ id: socket.id, name: username });

        console.log(`User ${username} (${socket.id}) joined room ${roomId}`);
        console.log(`Active users in ${roomId}:`, room.users.map(u => u.name));

        // Send chat history and current users to the joiner
        socket.emit("sync-room", { 
            messages: room.messages,
            users: room.users 
        });
        
        // Broadcast updated user list to everyone in the room
        io.to(roomId).emit("room-users", room.users);
    });

    socket.on("chat-message", (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            room.messages.push(data);
            if (room.messages.length > 100) room.messages.shift();
            socket.to(data.roomId).emit("chat-message", data);
        }
    });

    // ----- INTERACTIVE TERMINAL HANDLING -----
    let currentPty = null;

    socket.on("terminal-spawn", ({ code, language }) => {
        if (currentPty) {
            try { currentPty.kill(); } catch (e) {}
        }

        const fileId = Math.random().toString(36).substring(7);
        const execDir = path.join(TEMP_DIR, fileId);
        if (!fs.existsSync(execDir)) fs.mkdirSync(execDir);

        const spawnInteractive = (cmd, args) => {
            try {
                currentPty = pty.spawn(cmd, args, {
                    name: "xterm-color",
                    cols: 80,
                    rows: 24,
                    cwd: execDir,
                    env: process.env,
                });
                
                currentPty.onData((data) => {
                    socket.emit("terminal-data", data);
                });

                currentPty.onExit(({ exitCode }) => {
                    socket.emit("terminal-data", `\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
                    currentPty = null;
                    setTimeout(() => {
                        fs.rm(execDir, { recursive: true, force: true }, () => {});
                    }, 2000);
                });
            } catch (err) {
                console.error("PTY Spawn Error:", err);
                socket.emit("terminal-data", `\r\nError: Failed to start process (${cmd}). Is it installed?\r\n`);
                setTimeout(() => {
                    fs.rm(execDir, { recursive: true, force: true }, () => {});
                }, 2000);
            }
        };

        if (language === "python") {
            const filePath = path.join(execDir, "script.py");
            fs.writeFileSync(filePath, code);
            const cmd = process.platform === "win32" ? "python" : "python3";
            spawnInteractive(cmd, ["-u", filePath]);
        } else if (language === "javascript") {
            const filePath = path.join(execDir, "script.js");
            fs.writeFileSync(filePath, code);
            spawnInteractive("node", [filePath]);
        } else if (language === "c" || language === "cpp") {
            const ext = language === "c" ? "c" : "cpp";
            const compiler = language === "c" ? "gcc" : "g++";
            const filePath = path.join(execDir, `main.${ext}`);
            const outPath = path.join(execDir, "main.exe");
            fs.writeFileSync(filePath, code);
            
            socket.emit("terminal-data", "Compiling...\r\n");
            const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
            exec(`${compiler} "${filePath}" -o "${outPath}"`, { cwd: execDir, shell }, (err, stdout, stderr) => {
                if (err) {
                    socket.emit("terminal-data", `\r\nCompilation Error:\r\n${stderr || err.message}\r\n`);
                    return;
                }
                const runCmd = outPath;
                spawnInteractive(runCmd, []);
            });
        } else if (language === "java") {
            const filePath = path.join(execDir, "Main.java");
            fs.writeFileSync(filePath, code);
            
            const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
            socket.emit("terminal-data", "Compiling...\r\n");
            exec(`javac "${filePath}"`, { cwd: execDir, shell }, (err, stdout, stderr) => {
                if (err) {
                    socket.emit("terminal-data", `\r\nCompilation Error:\r\n${stderr || err.message}\r\n`);
                    return;
                }
                spawnInteractive("java", ["-cp", execDir, "Main"]);
            });
        } else {
            socket.emit("terminal-data", "\r\nError: Language not supported for interactive terminal.\r\n");
        }
    });

    socket.on("terminal-data", (data) => {
        if (currentPty) {
            currentPty.write(data);
        }
    });

    socket.on("disconnect", () => {
        const roomId = socket.data.roomId;
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.users = room.users.filter(u => u.id !== socket.id);
                console.log(`User ${socket.data.username} left room ${roomId}`);
                io.to(roomId).emit("room-users", room.users);
            }
        }
        if (currentPty) {
            try { currentPty.kill(); } catch (e) {}
        }
    });
});

// ----- REAL LOCAL EXECUTION ENGINE -----
const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

app.post("/api/execute", (req, res) => {
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).json({ error: "Missing required fields" });

    const fileId = Math.random().toString(36).substring(7);
    const execDir = path.join(TEMP_DIR, fileId);
    if (!fs.existsSync(execDir)) fs.mkdirSync(execDir);

    let filePath, command;

    if (language === "python") {
        filePath = path.join(execDir, "script.py");
        fs.writeFileSync(filePath, code);
        const cmd = process.platform === "win32" ? "python" : "python3";
        command = `${cmd} "${filePath}"`;
    } else if (language === "c") {
        filePath = path.join(execDir, "main.c");
        const outName = process.platform === "win32" ? "main.exe" : "./main";
        const outPath = path.join(execDir, outName);
        fs.writeFileSync(filePath, code);
        command = `gcc "${filePath}" -o "${outPath}" && "${outPath}"`;
    } else if (language === "cpp") {
        filePath = path.join(execDir, "main.cpp");
        const outName = process.platform === "win32" ? "main.exe" : "./main";
        const outPath = path.join(execDir, outName);
        fs.writeFileSync(filePath, code);
        command = `g++ "${filePath}" -o "${outPath}" && "${outPath}"`;
    } else if (language === "java") {
        filePath = path.join(execDir, "Main.java");
        fs.writeFileSync(filePath, code);
        command = `javac "${filePath}" && java -cp "${execDir}" Main`;
    } else {
        return res.status(400).json({ error: "Language not supported" });
    }

    console.log(`Executing ${language} for session ${fileId}...`);

    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    exec(command, { timeout: 30000, shell }, (error, stdout, stderr) => {
        // Cleanup this specific execution directory
        fs.rm(execDir, { recursive: true, force: true }, (err) => {
            if (err) console.error(`Error cleaning up ${execDir}:`, err);
        });

        if (error) {
            console.log(`Execution failed for ${fileId}: ${error.message}`);
            return res.json({ output: stderr || error.message });
        }
        console.log(`Execution success for ${fileId}`);
        res.json({ output: stdout });
    });
});

app.post("/api/ai", async (req, res) => {
    try {
        const { message, code, language, history = [] } = req.body;
        if (!message) return res.status(400).json({ error: "message is required" });

        console.log(`[AI] Processing request: "${message.substring(0, 30)}..."`);

        const mappedHistory = history
            .filter(msg => msg && msg.text)
            .map(msg => ({
                role: msg.user === "AI" ? "assistant" : "user",
                content: msg.text
            }));

        let groqClient;
        try {
            groqClient = getGroqClient();
        } catch (keyError) {
            console.error("[AI] API key error:", keyError.message);
            return res.status(503).json({ error: "AI Assistant is not configured. Please add GROQ_API_KEY to the Render environment variables." });
        }

        let reply = "";
        if (!groqClient) {
            reply = "[MOCK MODE] I'm currently running without an API key. To enable real AI, please add `GROQ_API_KEY` to your backend `.env` file.\n\nHowever, I can still see your code and message:\n\n**Language**: " + language + "\n**Your Message**: " + message;
        } else {
            const completion = await groqClient.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI coding assistant inside a collaborative code editor. Help users debug, explain, improve, and write code. You have access to the current code and the conversation history. Keep answers clear and useful."
                    },
                    ...mappedHistory,
                    {
                        role: "user",
                        content: `Language: ${language}\n\nCurrent code:\n${code}\n\nQuestion:\n${message}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1024
            });
            reply = completion.choices?.[0]?.message?.content || "No reply returned.";
        }

        console.log(`[AI] Response generated (${reply.length} chars)`);
        res.json({ reply });
    } catch (error) {
        console.error("[AI] Error:", error.message);
        res.status(500).json({ error: error.message || "AI assistant failed to respond. Please try again." });
    }
});

app.get("/", (req, res) => res.send("Backend Running"));
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (HTTP, Socket.io, and Yjs WebSockets)`);
});
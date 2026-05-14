# Collaborative Code Editor

A real-time collaborative code editor with AI assistance, live chat, and a local code execution engine.

## Features
- **Real-time Collaboration**: Powered by Yjs and WebSockets.
- **AI Assistant**: Get help with debugging and explanations using Groq AI (Llama 3).
- **Code Execution**: Run Python, Java, C, and C++ code directly from the editor.
- **Live Chat**: Communicate with other users in the same room.
- **Active User List**: See who else is currently in the room with live cursor tracking.

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Vivek-1587/collaborative-code-editor-.git
cd collaborative-code-editor-
```

### 2. Setup the Backend
The backend handles the execution engine, AI assistance, and WebSocket synchronization.

1. Navigate to the backend directory:
   ```bash
   cd "new backend"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   - Create a `.env` file based on `.env.example`.
   - Add your [Groq API Key](https://console.groq.com/keys).
   ```env
   GROQ_API_KEY=your_actual_key_here
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### 3. Setup the Frontend
The frontend is the main user interface.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 4. Open in Browser
Visit your deployed frontend URL (e.g., `https://your-app.vercel.app`) to start coding!

## Requirements
- **Node.js**: Version 18 or higher.
- **Compilers** (for code execution):
  - `python` for Python.
  - `gcc` for C.
  - `g++` for C++.
  - `java/javac` for Java.

## Project Structure
- `frontend/`: React + Vite frontend application.
- `new backend/`: Node.js + Express + Socket.io + Yjs backend server.

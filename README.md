# FaceVault AI — Real-Time Face Recognition & Mesh Engine

A high-performance, real-time facial recognition and holographic mesh tracking engine running entirely client-side in the browser. Powered by `@vladmandic/face-api` (TensorFlow.js) and HTML5 Canvas.

![Platform](https://img.shields.io/badge/Platform-Web-00f0ff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge)
![FPS](https://img.shields.io/badge/Performance-60_FPS-ff00e5?style=for-the-badge)

---

## ⚡ Features

- **60+ FPS Decoupled Pipeline**: Decoupled high-frequency tracking (30 FPS) with hardware-accelerated 60 FPS landmark LERP interpolation.
- **Cyberpunk Holographic Mesh**: Batched GPU multi-pass neon glow contours, wireframe triangles, synthesized forehead arch, and iris reticles.
- **Instant Recognition Pop-Up**: Cyberpunk HUD banner slides down with photo preview, verified badge, and match percentage whenever a subject is recognized.
- **Interactive Click-to-Name & Quick Actions**: Click directly on any face or HUD card on the canvas, or use the top-bar **Name Face** button to identify and rename subjects.
- **Self-Learning Neural Storage**: Local biometric storage in IndexedDB with vector averaging and continuous accuracy learning.
- **Voice Speech Synthesis**: Real-time voice announcements upon recognizing registered subjects.
- **Multiple Mesh Styles & Palettes**: Neon Wireframe, Filled Mesh, Cyber Grid, Dots Only with Cyan, Magenta, Lime, Gold, and Rainbow palettes.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/adityakumarpanditstudent-star/VISION-AI.git

# Navigate to project
cd "Face recognition bot"

# Start local server
npm start
# or
npx serve -l 3000 --cors
```

Open [http://localhost:3000](http://localhost:3000) in your browser, allow camera access, and test the real-time recognition engine!

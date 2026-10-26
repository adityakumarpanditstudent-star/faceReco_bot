/* ══════════════════════════════════════════════════════════════
   FaceVault AI — v2.5 — High-FPS & Cyberpunk HUD Edition
   ─────────────────────────────────────────────────────────────
   • 60+ FPS decoupled render loop with landmark LERP interpolation
   • Ultra-detailed face-copying holographic mesh with forehead expansion
   • High-tech Side HUD Parameter Card anchored to the side of the mesh
   • Voice Speech Synthesis announcing recognized names ("Face recognized: Alex")
   • Dedicated Name Parameter input and interactive click-to-name workflow
   ══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────
const CONFIG = {
    MODEL_URL: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/',
    DETECT_INTERVAL_MS: 30,          // High-frequency async detection loop (~30 FPS)
    AUTO_LEARN_FRAMES: 8,            // Frames before auto-learn prompt
    AUTO_LEARN_COOLDOWN: 12000,      // ms cooldown between auto-learn prompts
    MAX_SAMPLES_PER_FACE: 12,        // Feature vectors stored per person
    DEFAULT_THRESHOLD: 0.58,
    FACE_CROP_SIZE: 180,
    DB_NAME: 'FaceVaultDB',
    DB_VERSION: 1,
    STORE_NAME: 'faces',
    META_STORE: 'meta',
};

/* ── 68-point facial triangulation ──────────────── */
const TRI = [
    // Jaw → features
    [0,1,36],[1,2,41],[1,36,41],[2,3,31],[2,41,31],
    [3,4,48],[3,31,48],[4,5,48],[5,6,59],[5,48,59],
    [6,7,58],[6,58,59],[7,8,57],[7,57,58],
    [8,9,56],[8,56,57],[9,10,55],[9,55,56],
    [10,11,54],[10,54,55],[11,12,54],
    // Left jaw
    [12,13,35],[12,35,54],[13,14,46],[13,35,46],
    [14,15,45],[14,45,46],[15,16,45],
    // Right eyebrow
    [0,17,36],[17,18,36],[18,37,36],[18,19,37],
    [19,20,38],[19,37,38],[20,21,38],[21,38,39],
    // Left eyebrow
    [16,26,45],[25,26,45],[25,44,45],[24,25,44],
    [23,24,43],[23,43,44],[22,23,42],[22,42,43],
    // Forehead bridge
    [21,27,22],[21,27,39],[22,27,42],
    // Right eye
    [36,37,41],[37,40,41],[37,38,40],[38,39,40],
    // Left eye
    [42,43,47],[43,46,47],[43,44,46],[44,45,46],
    // Nose bridge
    [27,28,39],[28,29,39],[27,28,42],[28,29,42],
    // Lower nose
    [29,30,31],[29,30,35],[29,31,39],[29,35,42],
    [30,31,32],[30,32,33],[30,33,34],[30,34,35],
    // Nose → eyes
    [31,40,41],[31,39,40],[35,46,47],[35,42,47],
    // Nose → mouth
    [31,32,48],[32,49,48],[32,33,50],[32,49,50],
    [33,50,51],[33,34,51],[34,52,51],[34,35,52],
    [35,53,52],[35,54,53],
    // Outer mouth
    [48,49,60],[49,60,61],[49,50,61],
    [50,51,62],[50,61,62],[51,52,62],
    [52,63,62],[52,53,63],
    [53,54,64],[53,63,64],
    [54,55,64],[55,64,65],
    [55,56,65],[56,65,66],
    [56,57,66],[57,66,67],
    [57,58,67],[58,59,67],
    [59,48,60],[59,60,67],
    // Inner mouth
    [60,61,67],[61,66,67],[61,62,66],
    [62,65,66],[62,63,65],[63,64,65],
    // Forehead expansion (points 68..75 to eyebrows)
    [17,68,18],[18,68,69],[18,69,19],[19,69,70],[19,70,20],[20,70,71],[20,71,21],
    [21,71,27],[22,27,72],[22,72,23],[23,72,73],[23,73,24],[24,73,74],[24,74,25],[25,74,75],[25,75,26]
];

const CONN = {
    jaw:        [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16]],
    rBrow:      [[17,18],[18,19],[19,20],[20,21]],
    lBrow:      [[22,23],[23,24],[24,25],[25,26]],
    forehead:   [[68,69],[69,70],[70,71],[71,72],[72,73],[73,74],[74,75]],
    noseBridge: [[27,28],[28,29],[29,30]],
    noseBot:    [[31,32],[32,33],[33,34],[34,35],[30,31],[30,35]],
    rEye:       [[36,37],[37,38],[38,39],[39,40],[40,41],[41,36]],
    lEye:       [[42,43],[43,44],[44,45],[45,46],[46,47],[47,42]],
    outerLip:   [[48,49],[49,50],[50,51],[51,52],[52,53],[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,48]],
    innerLip:   [[60,61],[61,62],[62,63],[63,64],[64,65],[65,66],[66,67],[67,60]],
    cross:      [[0,36],[16,45],[21,27],[22,27],[27,39],[27,42],[36,41],[42,47],[31,48],[35,54],[39,31],[42,35],[40,31],[47,35]],
};

const PALETTE = {
    cyan:    { h: '#00f0ff', m: '#0090a0', g: 'rgba(0,240,255,', f: 'rgba(0,240,255,0.06)' },
    magenta: { h: '#ff00e5', m: '#a000a0', g: 'rgba(255,0,229,', f: 'rgba(255,0,229,0.06)' },
    lime:    { h: '#39ff14', m: '#20a010', g: 'rgba(57,255,20,',  f: 'rgba(57,255,20,0.06)' },
    gold:    { h: '#ffd700', m: '#b09000', g: 'rgba(255,215,0,',  f: 'rgba(255,215,0,0.06)' },
    rainbow: { h: null,      m: null,      g: null,                f: 'rgba(255,255,255,0.04)' },
};


// ─────────────────────────────────────────────────
// HINDI GREETING & VOICE SYNTHESIS ENGINE
// ─────────────────────────────────────────────────
class HindiGreetingEngine {
    constructor() {
        this.personGreetingIndex = {}; // name -> index for sequential variety
        this.timeGreetings = {
            morning: [
                { hi: 'सुप्रभात {name} जी! आपका दिन मंगलमय हो।', hinglish: 'Suprabhat {name} ji! Aapka din mangalmay ho.' },
                { hi: 'नमस्ते {name} जी, शुभ प्रभात! आपका स्वागत है।', hinglish: 'Namaste {name} ji, shubh prabhat! Aapka swagat hai.' },
                { hi: 'राम राम {name} जी! एक नई और सुनहरी सुबह में आपका स्वागत है।', hinglish: 'Ram Ram {name} ji! Ek nayi aur sunahari subah mein aapka swagat hai.' }
            ],
            afternoon: [
                { hi: 'नमस्ते {name} जी! शुभ दोपहर, आपको देखकर बहुत खुशी हुई।', hinglish: 'Namaste {name} ji! Shubh dopahar, aapko dekhkar bahut khushi hui.' },
                { hi: 'प्रणाम {name} जी! आशा है आपका दिन बहुत अच्छा बीत रहा है।', hinglish: 'Pranaam {name} ji! Aasha hai aapka din bahut accha beet raha hai.' },
                { hi: 'नमस्ते {name} जी! दोपहर के सत्र में आपका हार्दिक स्वागत है।', hinglish: 'Namaste {name} ji! Dopahar ke satra mein aapka hardik swagat hai.' }
            ],
            evening: [
                { hi: 'शुभ संध्या {name} जी! FaceVault में आपका हार्दिक स्वागत है।', hinglish: 'Shubh sandhya {name} ji! FaceVault mein aapka hardik swagat hai.' },
                { hi: 'नमस्ते {name} जी! शाम की आपको बहुत-बहुत शुभकामनाएं।', hinglish: 'Namaste {name} ji! Shaam ki aapko bahut bahut shubhkaamnayein.' },
                { hi: 'प्रणाम {name} जी! आपकी शाम शानदार और खुशहाल रहे।', hinglish: 'Pranaam {name} ji! Aapki shaam shaandar aur khush-haal rahe.' }
            ],
            night: [
                { hi: 'नमस्ते {name} जी! इतनी देर रात को भी आप सक्रिय हैं, बहुत खूब।', hinglish: 'Namaste {name} ji! Itni der raat ko bhi aap active hain, bahut khoob.' },
                { hi: 'शुभ रात्रि {name} जी! FaceVault AI में आपका स्वागत है।', hinglish: 'Shubh raatri {name} ji! FaceVault AI mein aapka swagat hai.' }
            ],
            general: [
                { hi: 'नमस्ते {name} जी! आपका बहुत-बहुत स्वागत है।', hinglish: 'Namaste {name} ji! Aapka bahut bahut swagat hai.' },
                { hi: 'प्रणाम {name} जी! आपको पहचान लिया गया है, स्वागत है।', hinglish: 'Pranaam {name} ji! Aapko pehchan liya gaya hai, swagat hai.' },
                { hi: 'अरे {name} जी! कैसे हैं आप? स्वागत है आपका।', hinglish: 'Are {name} ji! Kaise hain aap? Swagat hai aapka.' },
                { hi: 'नमस्ते {name} जी! FaceVault सुरक्षा प्रणाली में आपका स्वागत है।', hinglish: 'Namaste {name} ji! FaceVault suraksha pranali mein aapka swagat hai.' },
                { hi: 'जय श्री राम {name} जी! आपका हार्दिक अभिनंदन है।', hinglish: 'Jai Shree Ram {name} ji! Aapka hardik abhinandan hai.' }
            ],
            english: [
                { hi: 'Welcome, {name}! Good to see you.', hinglish: 'Welcome, {name}! Good to see you.' },
                { hi: 'Face recognized: {name}. Welcome back!', hinglish: 'Face recognized: {name}. Welcome back!' },
                { hi: 'Hello {name}! Identity verified successfully.', hinglish: 'Hello {name}! Identity verified successfully.' }
            ]
        };
    }

    getTimePeriod() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    normalizeMode(mode) {
        if (!mode) return 'hindi';
        const m = mode.toLowerCase();
        if (m === 'en' || m === 'english') return 'english';
        if (m === 'hinglish') return 'hinglish';
        if (m === 'bilingual') return 'bilingual';
        return 'hindi';
    }

    getGreeting(name, rawMode = 'hindi') {
        const mode = this.normalizeMode(rawMode);
        const safeName = (name || 'मित्र').trim();

        if (mode === 'english') {
            const list = this.timeGreetings.english;
            const item = list[Math.floor(Math.random() * list.length)];
            const text = item.hi.replace('{name}', safeName);
            return {
                displayText: text,
                speechText: text,
                hinglishFallback: text,
                lang: 'en'
            };
        }

        const period = this.getTimePeriod();
        const periodList = this.timeGreetings[period] || [];
        const generalList = this.timeGreetings.general;
        const candidatePool = [...periodList, ...generalList];

        const curIdx = (this.personGreetingIndex[safeName] || 0) % candidatePool.length;
        this.personGreetingIndex[safeName] = curIdx + 1;
        const chosen = candidatePool[curIdx] || candidatePool[0];

        let hindiText = chosen.hi.replace('{name}', safeName);
        let hinglishText = chosen.hinglish.replace('{name}', safeName);

        if (mode === 'bilingual') {
            hindiText = `${hindiText} (Welcome, ${safeName}!)`;
            hinglishText = `${hinglishText}. Welcome, ${safeName}!`;
        }

        return {
            displayText: hindiText,
            speechText: mode === 'hinglish' ? hinglishText : (mode === 'bilingual' ? hinglishText : hindiText),
            hinglishFallback: hinglishText,
            lang: 'hi'
        };
    }
}

class VoiceEngine {
    constructor() {
        this.enabled = true;
        this.synth = window.speechSynthesis;
        this.lastSpoken = {};       // name -> timestamp
        this.cooldownMs = 12000;    // Don't repeat greeting for same person for 12 seconds
        this.hindiEngine = new HindiGreetingEngine();
        this.languageMode = 'hindi'; // 'hindi' | 'hinglish' | 'bilingual' | 'english'
        this.hindiVoice = null;
        this.englishVoice = null;
        this._pickVoices();
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._pickVoices();
        }
    }

    setLanguageMode(mode) {
        this.languageMode = this.hindiEngine.normalizeMode(mode);
    }

    _pickVoices() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        // Look for native Hindi voice (e.g. hi-IN, Google हिन्दी, Microsoft Hemant/Kalpana)
        this.hindiVoice = voices.find(v => v.lang && (v.lang.startsWith('hi') || (v.lang.includes('IN') && v.name.toLowerCase().includes('hindi')))) || null;
        // Clean Indian English / English voice for Hinglish fallback
        this.englishVoice = voices.find(v => v.lang && (v.lang === 'en-IN' || v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Kalpana') || v.name.includes('Heera') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
                            voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0] || null;
    }

    greetPerson(name) {
        const greeting = this.hindiEngine.getGreeting(name, this.languageMode);
        if (!this.enabled || !this.synth) return greeting.displayText;

        const now = Date.now();
        if (this.lastSpoken[name] && (now - this.lastSpoken[name] < this.cooldownMs)) {
            return greeting.displayText; // Cooldown prevents audio repeat, but banner shows greeting
        }
        this.lastSpoken[name] = now;

        try {
            this.synth.cancel();

            let textToSpeak = greeting.speechText;
            let voiceToUse = this.hindiVoice;
            let langCode = 'hi-IN';

            if (this.languageMode === 'english') {
                voiceToUse = this.englishVoice;
                langCode = 'en-US';
            } else if (!this.hindiVoice || this.languageMode === 'hinglish' || this.languageMode === 'bilingual') {
                // When Hindi TTS is not natively installed in OS, speak phonetic Hinglish
                // with an Indian/English voice for perfectly natural pronunciation!
                textToSpeak = greeting.hinglishFallback || greeting.speechText;
                voiceToUse = this.englishVoice;
                langCode = this.englishVoice?.lang || 'en-IN';
            }

            const utt = new SpeechSynthesisUtterance(textToSpeak);
            if (voiceToUse) utt.voice = voiceToUse;
            utt.lang = langCode;
            utt.rate = 0.98;
            utt.pitch = 1.02;
            utt.volume = 1.0;
            this.synth.speak(utt);
        } catch (e) {
            console.warn('Voice greeting error:', e);
        }

        return greeting.displayText;
    }

    speak(text, nameKey = null) {
        if (!this.enabled || !this.synth) return;
        const now = Date.now();
        if (nameKey) {
            if (this.lastSpoken[nameKey] && (now - this.lastSpoken[nameKey] < this.cooldownMs)) {
                return;
            }
            this.lastSpoken[nameKey] = now;
        }

        try {
            this.synth.cancel();
            const utt = new SpeechSynthesisUtterance(text);
            const voice = this.englishVoice || this.hindiVoice;
            if (voice) utt.voice = voice;
            utt.rate = 1.0;
            utt.pitch = 1.0;
            utt.volume = 0.95;
            this.synth.speak(utt);
        } catch (e) {
            console.warn('Speech error:', e);
        }
    }

    toggle(force) {
        this.enabled = force !== undefined ? force : !this.enabled;
        return this.enabled;
    }
}


// ─────────────────────────────────────────────────
// DATABASE (IndexedDB)
// ─────────────────────────────────────────────────
class FaceDB {
    constructor() { this.db = null; }

    async init() {
        return new Promise((resolve, reject) => {
            const r = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            r.onerror = () => reject(r.error);
            r.onsuccess = () => { this.db = r.result; resolve(); };
            r.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
                    const s = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    s.createIndex('name', 'name', { unique: false });
                }
                if (!db.objectStoreNames.contains(CONFIG.META_STORE)) {
                    db.createObjectStore(CONFIG.META_STORE, { keyPath: 'key' });
                }
            };
        });
    }

    _s(name, mode = 'readonly') { return this.db.transaction(name, mode).objectStore(name); }

    add(name, descriptors, thumbnail) {
        return new Promise((res, rej) => {
            const s = this._s(CONFIG.STORE_NAME, 'readwrite');
            const f = {
                name,
                descriptors: descriptors.map(d => Array.from(d)),
                thumbnail,
                sampleCount: descriptors.length,
                createdAt: Date.now(),
                lastSeen: Date.now(),
                timesRecognized: 1
            };
            const r = s.add(f);
            r.onsuccess = () => { f.id = r.result; res(f); };
            r.onerror = () => rej(r.error);
        });
    }

    update(id, upd) {
        return new Promise((res, rej) => {
            const s = this._s(CONFIG.STORE_NAME, 'readwrite');
            const g = s.get(id);
            g.onsuccess = () => {
                if (!g.result) return rej('not found');
                const f = { ...g.result, ...upd };
                const p = s.put(f);
                p.onsuccess = () => res(f);
                p.onerror = () => rej(p.error);
            };
            g.onerror = () => rej(g.error);
        });
    }

    addSample(id, desc) {
        return new Promise((res, rej) => {
            const s = this._s(CONFIG.STORE_NAME, 'readwrite');
            const g = s.get(id);
            g.onsuccess = () => {
                const f = g.result;
                if (!f) return rej('not found');
                const arr = Array.from(desc);
                if (f.descriptors.length < CONFIG.MAX_SAMPLES_PER_FACE) {
                    f.descriptors.push(arr);
                } else {
                    f.descriptors.shift();
                    f.descriptors.push(arr);
                }
                f.sampleCount = f.descriptors.length;
                f.lastSeen = Date.now();
                const p = s.put(f);
                p.onsuccess = () => res(f);
                p.onerror = () => rej(p.error);
            };
            g.onerror = () => rej(g.error);
        });
    }

    getAll() {
        return new Promise((res, rej) => {
            const r = this._s(CONFIG.STORE_NAME).getAll();
            r.onsuccess = () => res(r.result || []);
            r.onerror = () => rej(r.error);
        });
    }

    del(id) {
        return new Promise((res, rej) => {
            const r = this._s(CONFIG.STORE_NAME, 'readwrite').delete(id);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
        });
    }

    clear() {
        return new Promise((res, rej) => {
            const r = this._s(CONFIG.STORE_NAME, 'readwrite').clear();
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
        });
    }

    getMeta(k) {
        return new Promise(res => {
            const r = this._s(CONFIG.META_STORE).get(k);
            r.onsuccess = () => res(r.result ? r.result.value : null);
            r.onerror = () => res(null);
        });
    }

    setMeta(k, v) {
        return new Promise((res, rej) => {
            const r = this._s(CONFIG.META_STORE, 'readwrite').put({ key: k, value: v });
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
        });
    }

    async findMatch(desc, threshold) {
        const faces = await this.getAll();
        let best = null, bestD = Infinity;
        for (const f of faces) {
            for (const s of f.descriptors) {
                const d = eDist(desc, s);
                if (d < bestD) { bestD = d; best = f; }
            }
        }
        return best && bestD < threshold
            ? { face: best, distance: bestD, confidence: Math.max(0, 1 - bestD / threshold) }
            : null;
    }
}

function eDist(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        s += d * d;
    }
    return Math.sqrt(s);
}


// ─────────────────────────────────────────────────
// MESH RENDERER & CYBER HUD
// ─────────────────────────────────────────────────
class MeshRenderer {
    constructor(canvas) {
        this.c = canvas;
        this.x = canvas.getContext('2d');
        this.t = 0; // animation timer
        this.activeHudCards = []; // bounding boxes for click interaction
    }

    clear() {
        this.x.clearRect(0, 0, this.c.width, this.c.height);
        this.activeHudCards = [];
    }

    /** Convert face-api raw landmarks into mirrored screen coordinates + synthesize forehead arch */
    _projectPoints(rawPositions, width) {
        const pts = [];
        for (let i = 0; i < rawPositions.length; i++) {
            const p = rawPositions[i];
            const rx = p.x ?? p._x;
            const ry = p.y ?? p._y;
            // Mirror horizontally to match mirrored webcam video:
            pts.push({ x: width - rx, y: ry });
        }

        // Synthesize forehead arch (points 68..75) above eyebrows
        if (pts.length >= 68) {
            const chin = pts[8];
            const noseBridge = pts[27];
            const faceH = Math.max(80, chin.y - noseBridge.y);
            const lift = faceH * 0.42;

            const browIndices = [17, 18, 19, 21, 22, 24, 25, 26];
            for (let i = 0; i < browIndices.length; i++) {
                const bi = browIndices[i];
                const bp = pts[bi];
                const dx = bp.x - noseBridge.x;
                const dy = bp.y - noseBridge.y;
                const len = Math.hypot(dx, dy) || 1;
                // Arch upward and slightly outward
                pts.push({
                    x: bp.x + (dx / len) * 8,
                    y: bp.y - lift * (1 - Math.abs(dx) / (faceH * 1.8))
                });
            }
        }

        return pts;
    }

    drawFace(landmarks, style, colorKey, matchInfo, smoothPoints) {
        this.t += 0.016; // ~60fps
        const pts = smoothPoints;
        if (!pts || pts.length < 68) return;
        const pal = PALETTE[colorKey] || PALETTE.cyan;

        // Render face mesh style
        switch (style) {
            case 'filled': this._drawFilled(pts, pal); break;
            case 'dots':   this._drawDots(pts, pal); break;
            case 'cyber':  this._drawCyber(pts, pal); break;
            default:       this._drawNeon(pts, pal); break;
        }

        // Draw animated eye reticles
        this._drawEyeReticles(pts, pal);

        // Draw the Side HUD Parameter Card
        this._drawSideHUD(pts, matchInfo, pal);
    }

    _col(pal, i) {
        if (pal.h) return pal.h;
        return `hsl(${(i * 28 + this.t * 70) % 360},100%,60%)`;
    }
    _colM(pal, i) {
        if (pal.m) return pal.m;
        return `hsl(${(i * 28 + this.t * 70) % 360},80%,38%)`;
    }
    _glow(pal, a, i) {
        if (pal.g) return pal.g + a + ')';
        const h = (i * 28 + this.t * 70) % 360;
        return `hsla(${h},100%,60%,${a})`;
    }

    /* ═══ NEON WIREFRAME MESH (Batched High-FPS) ══ */
    _drawNeon(pts, pal) {
        const x = this.x;
        const pulse = 0.88 + Math.sin(this.t * 2.8) * 0.12;
        const mainCol = pal.h || '#00f0ff';
        const midCol = pal.m || '#0090a0';

        // 1. Batched translucent triangles fill
        x.globalAlpha = 0.04 * pulse;
        x.fillStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < TRI.length; i++) {
            const [a, b, c] = TRI[i];
            if (!pts[a] || !pts[b] || !pts[c]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
            x.lineTo(pts[c].x, pts[c].y);
            x.closePath();
        }
        x.fill();

        // 2. Batched fine wireframe lines (Single stroke!)
        x.globalAlpha = 0.18 * pulse;
        x.lineWidth = 0.6;
        x.strokeStyle = midCol;
        x.beginPath();
        for (let i = 0; i < TRI.length; i++) {
            const [a, b, c] = TRI[i];
            if (!pts[a] || !pts[b] || !pts[c]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
            x.lineTo(pts[c].x, pts[c].y);
            x.closePath();
        }
        x.stroke();

        // 3. Batched prominent facial contours
        const keyConns = [
            ...CONN.jaw, ...CONN.rBrow, ...CONN.lBrow, ...CONN.forehead,
            ...CONN.noseBridge, ...CONN.noseBot, ...CONN.rEye, ...CONN.lEye,
            ...CONN.outerLip, ...CONN.innerLip
        ];

        // Soft outer laser aura (GPU alpha-blend instead of CPU gaussian shadowBlur)
        x.lineCap = 'round';
        x.lineJoin = 'round';
        x.lineWidth = 4.2;
        x.globalAlpha = 0.18 * pulse;
        x.strokeStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < keyConns.length; i++) {
            const [a, b] = keyConns[i];
            if (!pts[a] || !pts[b]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
        }
        x.stroke();

        // Medium bright laser contour
        x.lineWidth = 2.0;
        x.globalAlpha = 0.5 * pulse;
        x.stroke();

        // Crisp neon laser core
        x.lineWidth = 1.0;
        x.globalAlpha = 0.95;
        x.strokeStyle = '#ffffff';
        x.stroke();

        // 4. Batched glowing landmark vertices (Single fill call!)
        x.globalAlpha = 0.88;
        x.fillStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const isEye = (i >= 36 && i <= 47);
            const sz = (isEye ? 2.4 : 1.5) * pulse;
            x.moveTo(pts[i].x + sz, pts[i].y);
            x.arc(pts[i].x, pts[i].y, sz, 0, Math.PI * 2);
        }
        x.fill();
        x.globalAlpha = 1;
    }

    /* ═══ FILLED MESH (Batched High-FPS) ═══════════ */
    _drawFilled(pts, pal) {
        const x = this.x;
        const pulse = 0.85 + Math.sin(this.t * 2) * 0.15;
        const mainCol = pal.h || '#00f0ff';
        const midCol = pal.m || '#0090a0';

        // Batched fill
        x.globalAlpha = 0.08 * pulse;
        x.fillStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < TRI.length; i++) {
            const [a, b, c] = TRI[i];
            if (!pts[a] || !pts[b] || !pts[c]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
            x.lineTo(pts[c].x, pts[c].y);
            x.closePath();
        }
        x.fill();

        // Batched stroke
        x.globalAlpha = 0.35;
        x.strokeStyle = midCol;
        x.lineWidth = 0.6;
        x.stroke();

        // Prominent contours
        const conns = [...CONN.rEye, ...CONN.lEye, ...CONN.outerLip, ...CONN.jaw, ...CONN.forehead];
        x.lineWidth = 3.5;
        x.globalAlpha = 0.25 * pulse;
        x.strokeStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < conns.length; i++) {
            const [a, b] = conns[i];
            if (!pts[a] || !pts[b]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
        }
        x.stroke();
        x.lineWidth = 1.4;
        x.globalAlpha = 0.95;
        x.stroke();
        x.globalAlpha = 1;
    }

    /* ═══ DOTS ONLY (Batched High-FPS) ════════════ */
    _drawDots(pts, pal) {
        const x = this.x;
        const mainCol = pal.h || '#00f0ff';
        const midCol = pal.m || '#0090a0';

        // Batched cross connections
        x.globalAlpha = 0.12;
        x.lineWidth = 0.5;
        x.strokeStyle = midCol;
        x.beginPath();
        for (const [a, b] of CONN.cross) {
            if (!pts[a] || !pts[b]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
        }
        x.stroke();

        // Batched dots
        x.globalAlpha = 0.95;
        x.fillStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const wave = Math.sin(this.t * 3.2 + i * 0.3) * 0.5 + 0.5;
            const sz = 1.6 + wave * 2.2;
            x.moveTo(pts[i].x + sz, pts[i].y);
            x.arc(pts[i].x, pts[i].y, sz, 0, Math.PI * 2);
        }
        x.fill();
        x.globalAlpha = 1;
    }

    /* ═══ CYBER GRID (Batched High-FPS) ═══════════ */
    _drawCyber(pts, pal) {
        const x = this.x;
        const mainCol = pal.h || '#00f0ff';
        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
        for (const p of pts) {
            mnX = Math.min(mnX, p.x); mnY = Math.min(mnY, p.y);
            mxX = Math.max(mxX, p.x); mxY = Math.max(mxY, p.y);
        }
        const px = (mxX - mnX) * 0.15, py = (mxY - mnY) * 0.15;
        mnX -= px; mnY -= py; mxX += px; mxY += py;

        // Background Cyber Grid (batched in 1 stroke!)
        const gs = 18;
        x.globalAlpha = 0.08;
        x.strokeStyle = mainCol;
        x.lineWidth = 0.5;
        x.beginPath();
        for (let gx = mnX; gx <= mxX; gx += gs) { x.moveTo(gx, mnY); x.lineTo(gx, mxY); }
        for (let gy = mnY; gy <= mxY; gy += gs) { x.moveTo(mnX, gy); x.lineTo(mxX, gy); }
        x.stroke();

        // Batched Contour lines
        const all = Object.values(CONN).flat();
        x.globalAlpha = 0.75;
        x.lineWidth = 1.1;
        x.lineCap = 'round';
        x.strokeStyle = mainCol;
        x.beginPath();
        for (let i = 0; i < all.length; i++) {
            const [a, b] = all[i];
            if (!pts[a] || !pts[b]) continue;
            x.moveTo(pts[a].x, pts[a].y);
            x.lineTo(pts[b].x, pts[b].y);
        }
        x.stroke();

        // Cyber corner brackets
        x.globalAlpha = 0.9;
        x.lineWidth = 2.0;
        const cl = 18;
        x.beginPath();
        [[mnX,mnY,1,1],[mxX,mnY,-1,1],[mnX,mxY,1,-1],[mxX,mxY,-1,-1]].forEach(([cx,cy,dx,dy]) => {
            x.moveTo(cx, cy + dy * cl); x.lineTo(cx, cy); x.lineTo(cx + dx * cl, cy);
        });
        x.stroke();

        // Scan line across bounding box
        const scanY = mnY + ((this.t * 55) % (mxY - mnY));
        x.globalAlpha = 0.35;
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(mnX, scanY);
        x.lineTo(mxX, scanY);
        x.stroke();
        x.globalAlpha = 1;
    }

    /* ═══ EYE RETICLES (holographic iris tracking) ══ */
    _drawEyeReticles(pts, pal) {
        const x = this.x;
        const rCenter = {
            x: (pts[36].x + pts[39].x) / 2,
            y: (pts[37].y + pts[38].y + pts[40].y + pts[41].y) / 4
        };
        const lCenter = {
            x: (pts[42].x + pts[45].x) / 2,
            y: (pts[43].y + pts[44].y + pts[46].y + pts[47].y) / 4
        };

        const eyes = [rCenter, lCenter];
        const rot = this.t * 2;

        for (let i = 0; i < eyes.length; i++) {
            const ec = eyes[i];
            const r = 9;

            x.save();
            x.translate(ec.x, ec.y);
            x.rotate(i === 0 ? rot : -rot);

            x.strokeStyle = this._glow(pal, 0.7, i);
            x.lineWidth = 1;
            x.beginPath();
            x.arc(0, 0, r, 0, Math.PI * 1.5);
            x.stroke();

            x.beginPath();
            x.moveTo(-r - 3, 0); x.lineTo(-r + 2, 0);
            x.moveTo(r - 2, 0); x.lineTo(r + 3, 0);
            x.moveTo(0, -r - 3); x.lineTo(0, -r + 2);
            x.moveTo(0, r - 2); x.lineTo(0, r + 3);
            x.stroke();

            x.fillStyle = this._col(pal, i);
            x.beginPath();
            x.arc(0, 0, 1.8, 0, Math.PI * 2);
            x.fill();

            x.restore();
        }
    }

    /* ═══ SIDE HUD PARAMETER CARD ═════════════════ */
    _drawSideHUD(pts, info, pal) {
        if (!info) return;
        const x = this.x;

        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
        for (const p of pts) {
            mnX = Math.min(mnX, p.x); mnY = Math.min(mnY, p.y);
            mxX = Math.max(mxX, p.x); mxY = Math.max(mxY, p.y);
        }

        const faceW = mxX - mnX;
        const faceH = mxY - mnY;
        const faceMidY = (mnY + mxY) / 2;

        const name = info.name || 'Unknown';
        const isRecognized = (name !== 'Unknown' && name !== 'Pending');
        const confPct = info.confidence != null ? Math.round(info.confidence * 100) : null;
        const expr = info.expression || 'neutral';

        const exprIcons = {
            happy: '😊 Happy',
            neutral: '😐 Neutral',
            surprised: '😮 Surprised',
            sad: '😢 Sad',
            angry: '😠 Alert',
            disgusted: '😒 Focused',
            fearful: '😳 Scanning'
        };
        const moodText = exprIcons[expr] || `● ${expr}`;

        // Card dimensions
        const cardW = 224;
        const cardH = 132;
        const margin = 36;
        const onRight = (mxX + cardW + margin < this.c.width);

        const anchorX = onRight ? mxX - 6 : mnX + 6;
        const anchorY = faceMidY - 14;

        const elbowDx = onRight ? 26 : -26;
        const elbowDy = -18;
        const elbowX = anchorX + elbowDx;
        const elbowY = anchorY + elbowDy;

        const cardX = onRight ? elbowX + 16 : elbowX - 16 - cardW;
        const cardY = elbowY - 22;

        x.save();
        const mainColor = isRecognized ? (pal.h || '#00f0ff') : '#f59e0b';
        const glowColor = isRecognized ? (pal.g ? pal.g + '0.6)' : 'rgba(0,240,255,0.6)') : 'rgba(245,158,11,0.6)';

        // Anchor node dot
        x.fillStyle = mainColor;
        x.shadowColor = glowColor;
        x.shadowBlur = 8;
        x.beginPath();
        x.arc(anchorX, anchorY, 3.5, 0, Math.PI * 2);
        x.fill();

        // Pulsing outer ring around anchor
        const anchorPulse = 4.5 + Math.sin(this.t * 4) * 2;
        x.strokeStyle = glowColor;
        x.lineWidth = 1;
        x.beginPath();
        x.arc(anchorX, anchorY, anchorPulse, 0, Math.PI * 2);
        x.stroke();

        // Angled cyber line to card
        x.strokeStyle = mainColor;
        x.lineWidth = 1.4;
        x.shadowBlur = 6;
        x.beginPath();
        x.moveTo(anchorX, anchorY);
        x.lineTo(elbowX, elbowY);
        x.lineTo(onRight ? cardX : cardX + cardW, elbowY);
        x.stroke();
        x.shadowBlur = 0;

        // Card background
        x.fillStyle = 'rgba(8, 10, 24, 0.86)';
        x.strokeStyle = isRecognized ? 'rgba(0, 240, 255, 0.45)' : 'rgba(245, 158, 11, 0.45)';
        x.lineWidth = 1;
        this._roundRect(cardX, cardY, cardW, cardH, 8);
        x.fill();
        x.stroke();

        // Corner tick accents
        x.strokeStyle = mainColor;
        x.lineWidth = 2;
        const cl = 8;
        x.beginPath(); x.moveTo(cardX, cardY + cl); x.lineTo(cardX, cardY); x.lineTo(cardX + cl, cardY); x.stroke();
        x.beginPath(); x.moveTo(cardX + cardW - cl, cardY); x.lineTo(cardX + cardW, cardY); x.lineTo(cardX + cardW, cardY + cl); x.stroke();
        x.beginPath(); x.moveTo(cardX, cardY + cardH - cl); x.lineTo(cardX, cardY + cardH); x.lineTo(cardX + cl, cardY + cardH); x.stroke();
        x.beginPath(); x.moveTo(cardX + cardW - cl, cardY + cardH); x.lineTo(cardX + cardW, cardY + cardH); x.lineTo(cardX + cardW, cardY + cardH - cl); x.stroke();

        // Header bar
        const headerH = 24;
        x.fillStyle = isRecognized ? 'rgba(0, 240, 255, 0.12)' : 'rgba(245, 158, 11, 0.12)';
        x.beginPath();
        x.rect(cardX + 1, cardY + 1, cardW - 2, headerH);
        x.fill();

        // Status badge
        x.font = '700 9px "JetBrains Mono", monospace';
        x.fillStyle = isRecognized ? '#22c55e' : '#f59e0b';
        x.textAlign = 'left';
        x.fillText(isRecognized ? '● RECOGNIZED SUBJECT' : '▲ UNREGISTERED FACE', cardX + 10, cardY + 16);

        if (isRecognized && info.faceId) {
            x.font = '500 8.5px "JetBrains Mono", monospace';
            x.fillStyle = 'rgba(255,255,255,0.45)';
            x.textAlign = 'right';
            x.fillText(`#ID-${info.faceId}`, cardX + cardW - 10, cardY + 16);
        }

        // Parameter: NAME
        x.textAlign = 'left';
        x.font = '600 9px "JetBrains Mono", monospace';
        x.fillStyle = 'rgba(255,255,255,0.45)';
        x.fillText('NAME PARAMETER', cardX + 10, cardY + 41);

        x.font = '700 15px "Outfit", sans-serif';
        x.fillStyle = isRecognized ? '#ffffff' : '#fbbf24';
        x.shadowColor = isRecognized ? 'rgba(0,240,255,0.5)' : 'rgba(245,158,11,0.5)';
        x.shadowBlur = 5;
        const displayName = name.length > 18 ? name.substring(0, 16) + '..' : name;
        x.fillText(displayName, cardX + 10, cardY + 59);
        x.shadowBlur = 0;

        // Parameter: MATCH ACCURACY + Mini Meter
        x.font = '500 9px "JetBrains Mono", monospace';
        x.fillStyle = 'rgba(255,255,255,0.5)';
        x.fillText('MATCH', cardX + 10, cardY + 77);

        x.textAlign = 'right';
        x.fillStyle = isRecognized ? mainColor : '#f59e0b';
        x.fillText(confPct != null ? `${confPct}%` : 'Scanning...', cardX + cardW - 10, cardY + 77);

        // Mini bar
        const barX = cardX + 10;
        const barY = cardY + 83;
        const barW = cardW - 20;
        const barH = 3.5;
        x.fillStyle = 'rgba(255,255,255,0.08)';
        this._roundRect(barX, barY, barW, barH, 2);
        x.fill();

        const pctWidth = confPct != null ? (barW * Math.min(100, confPct) / 100) : (barW * 0.45);
        x.fillStyle = isRecognized ? 'linear-gradient(90deg, #00f0ff, #22c55e)' : '#f59e0b';
        this._roundRect(barX, barY, pctWidth, barH, 2);
        x.fill();

        // Parameter: EXPRESSION & MOOD
        x.textAlign = 'left';
        x.font = '500 9px "JetBrains Mono", monospace';
        x.fillStyle = 'rgba(255,255,255,0.45)';
        x.fillText('MOOD', cardX + 10, cardY + 103);

        x.textAlign = 'right';
        x.font = '600 10px "Inter", sans-serif';
        x.fillStyle = '#f0f0f8';
        x.fillText(moodText, cardX + cardW - 10, cardY + 103);

        // Interactive Footer Hint
        x.textAlign = 'center';
        x.font = '500 8.5px "JetBrains Mono", monospace';
        x.fillStyle = isRecognized ? 'rgba(0, 240, 255, 0.7)' : 'rgba(245, 158, 11, 0.85)';
        x.fillText(isRecognized ? '[ Click face to rename ]' : '[ Click to name face ]', cardX + cardW / 2, cardY + 122);

        x.restore();

        // Save card bounding box for click interaction
        this.activeHudCards.push({
            x: cardX, y: cardY, w: cardW, h: cardH,
            faceX: mnX, faceY: mnY, faceW, faceH,
            name, info
        });
    }

    _roundRect(x, y, w, h, r) {
        const c = this.x;
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }
}


// ─────────────────────────────────────────────────
// UNKNOWN SUBJECT TRACKER
// ─────────────────────────────────────────────────
class UnknownTracker {
    constructor() {
        this.map = new Map();
        this.nextId = 1;
        this.lastPrompt = 0;
    }

    track(desc, box) {
        const now = Date.now();
        const key = this._find(desc);
        if (key) {
            const e = this.map.get(key);
            e.count++;
            e.lastSeen = now;
            e.box = box;
            if (e.descriptors.length < 8) e.descriptors.push(Array.from(desc));
            return e;
        }
        const id = `u${this.nextId++}`;
        const e = { id, count: 1, descriptors: [Array.from(desc)], lastSeen: now, box };
        this.map.set(id, e);
        return e;
    }

    _find(desc) {
        for (const [k, e] of this.map) {
            for (const s of e.descriptors) {
                if (eDist(desc, s) < 0.52) return k;
            }
        }
        return null;
    }

    shouldPrompt(entry) {
        if (Date.now() - this.lastPrompt < CONFIG.AUTO_LEARN_COOLDOWN) return false;
        return entry.count >= CONFIG.AUTO_LEARN_FRAMES;
    }

    markDone(entry) {
        this.lastPrompt = Date.now();
        this.map.delete(entry.id);
    }

    cleanup() {
        const now = Date.now();
        for (const [k, e] of this.map) {
            if (now - e.lastSeen > 5000) this.map.delete(k);
        }
    }
}


// ─────────────────────────────────────────────────
// MAIN APPLICATION
// ─────────────────────────────────────────────────
class App {
    constructor() {
        this.db = new FaceDB();
        this.voice = new VoiceEngine();
        this.mesh = null;
        this.unk = new UnknownTracker();

        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.facing = 'user';

        // Settings
        this.style = 'neon';
        this.color = 'cyan';
        this.autoLearn = true;
        this.threshold = CONFIG.DEFAULT_THRESHOLD;

        // Two-loop architecture:
        // 1. Detection Loop (runs async every ~100ms via TinyFaceDetector)
        // 2. Render Loop (runs at 60fps via requestAnimationFrame with LERP)
        this.lastDetections = [];
        this.lastMatchInfos = [];
        this.smoothedFaces = [];     // Array of smoothed landmark points per face
        this.isRunning = false;
        this.detecting = false;
        this.pendingModal = null;

        // Stats
        this.stats = { detected: 0, learned: 0, recognized: 0, sessions: 0, totalSamples: 0 };
        this.fps = { count: 0, last: performance.now(), val: 0 };
    }

    /* ═══ BOOTSTRAP ══════════════════════════════ */
    async init() {
        try {
            await this.db.init();
            const s = await this.db.getMeta('sessions');
            this.stats.sessions = (s || 0) + 1;
            await this.db.setMeta('sessions', this.stats.sessions);

            const faces = await this.db.getAll();
            this.stats.learned = faces.length;
            this.stats.totalSamples = faces.reduce((a, f) => a + f.sampleCount, 0);

            await this._loadModels();
            this._show('permission-screen');
            this._bind();
        } catch (e) {
            console.error('Init error:', e);
            this._loadStatus('Initialization Error: ' + e.message, 0);
        }
    }

    async _loadModels() {
        const steps = [
            ['Tiny Face Detector', 25, () => faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL)],
            ['Facial Landmarks (68-point)', 55, () => faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL)],
            ['Face Recognition Encoder', 80, () => faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL)],
            ['Expression Analysis', 100, () => faceapi.nets.faceExpressionNet.loadFromUri(CONFIG.MODEL_URL)],
        ];

        for (const [label, pct, fn] of steps) {
            this._loadStatus(`Loading ${label}...`, pct);
            await fn();
        }
        this._loadStatus('All neural networks loaded ✓', 100);
        await this._sleep(400);
    }

    _loadStatus(text, pct) {
        const el = document.getElementById('loading-status');
        const fill = document.getElementById('progress-fill');
        const glow = document.getElementById('progress-glow');
        const det = document.getElementById('loading-details');
        if (el) el.textContent = text;
        if (fill) fill.style.width = pct + '%';
        if (glow) glow.style.width = pct + '%';
        if (det) det.innerHTML = `<span class="detail-item"><span class="detail-dot"></span>${text}</span>`;
    }

    _show(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
    }

    /* ═══ EVENT LISTENERS ═════════════════════════ */
    _bind() {
        const $ = (id) => document.getElementById(id);

        $('btn-connect')?.addEventListener('click', () => this.connectCamera());
        $('btn-open-sidebar')?.addEventListener('click', () => this._sidebar(true));
        $('btn-close-sidebar')?.addEventListener('click', () => this._sidebar(false));
        $('sidebar-overlay')?.addEventListener('click', () => this._sidebar(false));
        $('btn-switch-camera')?.addEventListener('click', () => this.switchCamera());

        // Voice Announcement Toggle (HUD)
        $('btn-toggle-voice')?.addEventListener('click', () => this.toggleVoice());

        // Voice Toggle (Sidebar)
        $('toggle-voice-sidebar')?.addEventListener('change', (e) => {
            this.setVoice(e.target.checked);
        });

        // Greeting Language Mode (Hindi / Hinglish / English)
        $('greeting-lang')?.addEventListener('change', (e) => {
            this.voice.setLanguageMode(e.target.value);
            const modeLabels = { hi: 'हिन्दी (Hindi)', hinglish: 'Hinglish (रोमन हिन्दी)', en: 'English' };
            this.toast(`Greeting Mode: ${modeLabels[e.target.value] || e.target.value}`, 'info');
        });

        // Mesh Controls
        $('mesh-style')?.addEventListener('change', e => { this.style = e.target.value; });
        $('mesh-color')?.addEventListener('change', e => { this.color = e.target.value; });
        $('auto-learn')?.addEventListener('change', e => { this.autoLearn = e.target.checked; });
        $('sensitivity')?.addEventListener('input', e => {
            this.threshold = parseFloat(e.target.value);
            $('sensitivity-value').textContent = this.threshold.toFixed(2);
        });

        // Quick Name Parameter Assign
        $('btn-assign-name')?.addEventListener('click', () => this.assignCurrentNameParam());
        $('param-name-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.assignCurrentNameParam();
        });

        // Actions
        $('btn-quick-name')?.addEventListener('click', () => this.quickNameFace());
        $('btn-capture')?.addEventListener('click', () => this.manualCapture());
        $('btn-export')?.addEventListener('click', () => this.exportDB());
        $('btn-clear-db')?.addEventListener('click', () => this.clearDB());

        // Modal
        $('modal-save')?.addEventListener('click', () => this._modalSave());
        $('modal-cancel')?.addEventListener('click', () => this._modalClose());
        $('modal-close')?.addEventListener('click', () => this._modalClose());
        $('modal-face-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._modalSave(); });

        // Click on Canvas to Rename / Identify
        $('overlay-canvas')?.addEventListener('click', (e) => this._onCanvasClick(e));
    }

    /* ═══ VOICE CONTROLS ═════════════════════════ */
    toggleVoice() {
        const enabled = this.voice.toggle();
        this._updateVoiceUI(enabled);
        this.toast(enabled ? 'Voice Announcements: ON' : 'Voice Announcements: MUTED', 'info');
        if (enabled) {
            this.voice.speak('Voice announcements active');
        }
    }

    setVoice(enabled) {
        this.voice.toggle(enabled);
        this._updateVoiceUI(enabled);
    }

    _updateVoiceUI(enabled) {
        const btn = document.getElementById('btn-toggle-voice');
        const iconOn = document.getElementById('voice-icon-on');
        const iconOff = document.getElementById('voice-icon-off');
        const sideCb = document.getElementById('toggle-voice-sidebar');

        if (btn) btn.classList.toggle('active', enabled);
        if (iconOn) iconOn.classList.toggle('hidden', !enabled);
        if (iconOff) iconOff.classList.toggle('hidden', enabled);
        if (sideCb) sideCb.checked = enabled;
    }

    /* ═══ CAMERA INITIALIZATION ══════════════════ */
    async connectCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.facing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false,
            });

            this.video = document.getElementById('video');
            this.canvas = document.getElementById('overlay-canvas');
            this.mesh = new MeshRenderer(this.canvas);
            this.video.srcObject = this.stream;

            await new Promise(r => {
                this.video.onloadedmetadata = () => { this.video.play(); r(); };
            });

            await this._sleep(150);
            this._resize();
            window.addEventListener('resize', () => this._resize());

            this._show('app-screen');
            document.getElementById('scan-line')?.classList.add('active');

            this.isRunning = true;
            this._startRenderLoop();
            this._startDetectLoop();

            this.refreshGallery();
            this._updateStats();

            // Speech greeting
            this.voice.speak('FaceVault online. Camera connected.');
            this.toast('Camera connected — live mesh active', 'success');
        } catch (e) {
            console.error('Camera connect failed:', e);
            this.toast('Camera access denied. Please grant camera permission.', 'error');
        }
    }

    async switchCamera() {
        this.facing = this.facing === 'user' ? 'environment' : 'user';
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.isRunning = false;
        await this._sleep(150);
        await this.connectCamera();
    }

    _resize() {
        if (!this.video || !this.canvas) return;
        this.canvas.width = this.video.videoWidth || 1280;
        this.canvas.height = this.video.videoHeight || 720;
    }

    /* ═══ 60 FPS RENDER LOOP (with Landmark LERP) ═ */
    _startRenderLoop() {
        const loop = () => {
            if (!this.isRunning) return;
            this._renderFrame();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _renderFrame() {
        if (!this.mesh) return;
        this.mesh.clear();

        const numDets = this.lastDetections.length;

        // Ensure smoothed landmark slots match detection count
        while (this.smoothedFaces.length < numDets) {
            this.smoothedFaces.push(null);
        }
        if (this.smoothedFaces.length > numDets) {
            this.smoothedFaces.length = numDets;
        }

        for (let i = 0; i < numDets; i++) {
            const det = this.lastDetections[i];
            const rawPositions = det.landmarks.positions || det.landmarks._positions || det.landmarks;
            const targetPts = det._projectedPts || (det._projectedPts = this.mesh._projectPoints(rawPositions, this.canvas.width));

            // Ultra-snappy 60fps tracking without lag
            if (!this.smoothedFaces[i] || this.smoothedFaces[i].length !== targetPts.length) {
                this.smoothedFaces[i] = targetPts.map(p => ({ x: p.x, y: p.y }));
            } else {
                const cur = this.smoothedFaces[i];
                const lerpFactor = 0.65;
                for (let k = 0; k < targetPts.length; k++) {
                    cur[k].x += (targetPts[k].x - cur[k].x) * lerpFactor;
                    cur[k].y += (targetPts[k].y - cur[k].y) * lerpFactor;
                }
            }

            const info = this.lastMatchInfos[i] || null;
            this.mesh.drawFace(det.landmarks, this.style, this.color, info, this.smoothedFaces[i]);
        }

        // FPS measurement
        this.fps.count++;
        const now = performance.now();
        if (now - this.fps.last >= 1000) {
            this.fps.val = Math.round(this.fps.count * 1000 / (now - this.fps.last));
            this.fps.count = 0;
            this.fps.last = now;
            const el = document.getElementById('fps-display');
            if (el) el.textContent = this.fps.val + ' FPS';
        }
    }

    /* ═══ DETECTION LOOP (High-Frequency Decoupled Loop) ═══ */
    _startDetectLoop() {
        const loop = async () => {
            if (!this.isRunning) return;
            if (!this.detecting) {
                this.detecting = true;
                await this._detect();
                this.detecting = false;
            }
            setTimeout(loop, CONFIG.DETECT_INTERVAL_MS);
        };
        loop();
    }

    async _detect() {
        try {
            // Ultra-fast 224x224 tensor resolution (over 2x faster than 320x320)
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.35
            });

            this.detectCycle = (this.detectCycle || 0) + 1;
            // Throttle heavy ResNet descriptor computation: run every 3rd cycle or when needed
            const needsDeep = (
                this.detectCycle % 3 === 0 ||
                this.lastMatchInfos.length === 0 ||
                this.lastMatchInfos.some(info => !info || info.name === 'Unknown')
            );

            let dets;
            if (needsDeep) {
                dets = await faceapi
                    .detectAllFaces(this.video, options)
                    .withFaceLandmarks()
                    .withFaceDescriptors()
                    .withFaceExpressions();
            } else {
                dets = await faceapi
                    .detectAllFaces(this.video, options)
                    .withFaceLandmarks();
            }

            if (!dets || dets.length === 0) {
                this.stats.detected = 0;
                this.lastDetections = [];
                this.lastMatchInfos = [];
                const indicator = document.getElementById('detection-indicator');
                indicator?.querySelector('.indicator-dot')?.classList.remove('active');
                if (indicator) indicator.querySelector('.indicator-text').textContent = 'Scanning...';
                const strip = document.getElementById('face-info-strip');
                if (strip) strip.innerHTML = '';
                return;
            }

            // Cache mirrored screen projection once per detection
            for (let i = 0; i < dets.length; i++) {
                const det = dets[i];
                const rawPositions = det.landmarks.positions || det.landmarks._positions || det.landmarks;
                det._projectedPts = this.mesh._projectPoints(rawPositions, this.canvas.width);
                if (!det.descriptor && this.lastDetections[i]?.descriptor) {
                    det.descriptor = this.lastDetections[i].descriptor;
                }
                if (!det.expressions && this.lastDetections[i]?.expressions) {
                    det.expressions = this.lastDetections[i].expressions;
                }
            }

            this.lastDetections = dets;
            this.stats.detected = dets.length;

            const indicator = document.getElementById('detection-indicator');
            indicator?.querySelector('.indicator-dot')?.classList.add('active');
            if (indicator) {
                indicator.querySelector('.indicator-text').textContent =
                    `${dets.length} face${dets.length > 1 ? 's' : ''} locked`;
            }

            const strip = document.getElementById('face-info-strip');
            let chipHtml = '';
            const infos = [];

            for (let i = 0; i < dets.length; i++) {
                const det = dets[i];
                const desc = det.descriptor;
                const box = det.detection.box;

                // Top expression
                let topExpr = 'neutral';
                if (det.expressions) {
                    let maxV = 0, maxK = '';
                    for (const [k, v] of Object.entries(det.expressions)) {
                        if (v > maxV && v > 0.35) { maxV = v; maxK = k; }
                    }
                    if (maxK) topExpr = maxK;
                }

                // If non-deep cycle and face was already recognized, preserve info
                if (!needsDeep && this.lastMatchInfos[i] && this.lastMatchInfos[i].name !== 'Unknown') {
                    const prev = this.lastMatchInfos[i];
                    prev.expression = topExpr;
                    infos.push(prev);
                    const pct = Math.round((prev.confidence || 0.95) * 100);
                    chipHtml += `<div class="face-info-chip">
                        <span class="chip-name">${this._esc(prev.name)}</span>
                        <span class="chip-confidence">${pct}% match</span>
                    </div>`;
                    continue;
                }

                if (!desc) {
                    const info = { name: 'Scanning...', confidence: null, expression: topExpr, descriptor: null };
                    infos.push(info);
                    continue;
                }

                const match = await this.db.findMatch(desc, this.threshold);

                if (match) {
                    const info = {
                        name: match.face.name,
                        confidence: match.confidence,
                        expression: topExpr,
                        faceId: match.face.id,
                        sampleCount: match.face.sampleCount,
                        descriptor: desc
                    };
                    infos.push(info);
                    this.stats.recognized++;

                    // POP UP RECOGNITION BANNER & HINDI GREETING:
                    this.notifyRecognition(match.face, match.confidence);

                    // Continuous learning: reinforce descriptor embedding
                    if (Math.random() < 0.05) {
                        this.db.addSample(match.face.id, desc).catch(() => {});
                    }
                    this.db.update(match.face.id, {
                        lastSeen: Date.now(),
                        timesRecognized: (match.face.timesRecognized || 0) + 1
                    }).catch(() => {});

                    const pct = Math.round(match.confidence * 100);
                    chipHtml += `<div class="face-info-chip">
                        <span class="chip-name">${this._esc(match.face.name)}</span>
                        <span class="chip-confidence">${pct}% match</span>
                    </div>`;
                } else {
                    const info = {
                        name: 'Unknown',
                        confidence: null,
                        expression: topExpr,
                        descriptor: desc
                    };
                    infos.push(info);

                    if (this.autoLearn && !this.pendingModal) {
                        const tracked = this.unk.track(desc, box);
                        if (this.unk.shouldPrompt(tracked)) {
                            this._promptLearn(tracked, det);
                        }
                    }

                    chipHtml += `<div class="face-info-chip unknown">
                        <span class="chip-name">Unknown</span>
                        <span class="chip-confidence">Scanning...</span>
                    </div>`;
                }
            }

            this.lastMatchInfos = infos;
            if (strip) strip.innerHTML = chipHtml;

            if (Math.random() < 0.1) {
                this._updateStats();
                this.unk.cleanup();
            }
        } catch (e) {
            console.warn('Detection cycle error:', e);
        }
    }

    /* ═══ AUTO-LEARNING PROMPT ════════════════════ */
    _promptLearn(tracked, detection) {
        const thumbnail = this._cropFace(detection.detection.box);
        this.pendingModal = {
            descriptors: tracked.descriptors.map(d => new Float32Array(d)),
            thumbnail,
            tracked,
            mode: 'auto',
        };

        const li = document.getElementById('learning-indicator');
        li?.classList.remove('hidden');
        setTimeout(() => li?.classList.add('hidden'), 2800);

        // Voice cue
        this.voice.speak('New face detected. Please enter a name.');

        this._openModal(thumbnail);
    }

    /* ═══ ASSIGN CURRENT NAME PARAMETER ═══════════ */
    async assignCurrentNameParam() {
        const input = document.getElementById('param-name-input');
        const name = input?.value?.trim();

        if (!name) {
            input.classList.add('shake');
            input.placeholder = 'Enter name first!';
            setTimeout(() => input.classList.remove('shake'), 400);
            return;
        }

        if (!this.isRunning || this.lastDetections.length === 0) {
            return this.toast('No face in view to assign to "' + name + '"', 'error');
        }

        try {
            const det = this.lastDetections[0];
            const thumbnail = this._cropFace(det.detection.box);
            const faces = await this.db.getAll();
            const existing = faces.find(f => f.name.toLowerCase() === name.toLowerCase());

            if (existing) {
                await this.db.addSample(existing.id, det.descriptor);
                this.toast(`Added sample to existing: ${name}`, 'success');
            } else {
                await this.db.add(name, [det.descriptor], thumbnail);
                this.stats.learned++;
                this.toast(`Assigned Name: ${name} ✓`, 'success');
            }

            this.stats.totalSamples++;
            this.voice.speak(`Face learned for ${name}`);
            input.value = '';
            this._updateStats();
            this.refreshGallery();
        } catch (e) {
            this.toast('Assign failed: ' + e.message, 'error');
        }
    }

    /* ═══ QUICK NAME FACE ═════════════════════════ */
    quickNameFace() {
        if (!this.isRunning) return this.toast('Camera not active', 'error');
        if (!this.lastDetections || this.lastDetections.length === 0) {
            return this.toast('No face in camera view — position face towards camera', 'error');
        }

        const det = this.lastDetections[0];
        const thumbnail = this._cropFace(det.detection.box);
        this.pendingModal = {
            descriptors: [det.descriptor],
            thumbnail,
            tracked: null,
            mode: 'quick',
        };
        this._openModal(thumbnail, '');
    }

    /* ═══ RECOGNITION POPUP BANNER ════════════════ */
    notifyRecognition(face, confidence) {
        const now = Date.now();
        if (this._lastBannerName === face.name && now - (this._lastBannerTime || 0) < 9000) {
            return;
        }
        this._lastBannerName = face.name;
        this._lastBannerTime = now;

        const banner = document.getElementById('recognition-banner');
        const nameEl = document.getElementById('recognition-name');
        const confEl = document.getElementById('recognition-conf');
        const avatarEl = document.getElementById('recognition-avatar-img');
        const greetingEl = document.getElementById('recognition-greeting');

        if (!banner || !nameEl) return;

        nameEl.textContent = face.name;
        const pct = Math.round(confidence * 100);
        if (confEl) confEl.textContent = `${pct}% Match`;
        if (avatarEl && face.thumbnail) {
            avatarEl.src = face.thumbnail;
        }

        // Voice Engine Hindi greeting announcement & banner text:
        const greetingText = this.voice.greetPerson(face.name);
        if (greetingEl) {
            greetingEl.textContent = greetingText;
        }

        banner.classList.remove('hidden');
        banner.classList.remove('fade-out');

        clearTimeout(this._bannerTimer);
        this._bannerTimer = setTimeout(() => {
            banner.classList.add('fade-out');
            setTimeout(() => banner.classList.add('hidden'), 350);
        }, 5500);
    }

    /* ═══ MANUAL CAPTURE & NAME ══════════════════ */
    async manualCapture() {
        if (!this.isRunning) return this.toast('Camera not active', 'error');
        try {
            const dets = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (dets.length === 0) {
                return this.toast('No face detected — position yourself in camera', 'error');
            }

            const det = dets[0];
            const thumbnail = this._cropFace(det.detection.box);
            this.pendingModal = {
                descriptors: [det.descriptor],
                thumbnail,
                tracked: null,
                mode: 'manual',
            };
            this._openModal(thumbnail, '');
        } catch (e) {
            this.toast('Capture failed: ' + e.message, 'error');
        }
    }

    _cropFace(box) {
        const cv = document.createElement('canvas');
        const sz = CONFIG.FACE_CROP_SIZE;
        cv.width = sz; cv.height = sz;
        const ctx = cv.getContext('2d');
        const pad = box.width * 0.3;
        const sx = Math.max(0, box.x - pad);
        const sy = Math.max(0, box.y - pad);
        ctx.translate(sz, 0); ctx.scale(-1, 1); // mirror thumbnail
        ctx.drawImage(this.video, sx, sy, box.width + pad * 2, box.height + pad * 2, 0, 0, sz, sz);
        return cv.toDataURL('image/jpeg', 0.88);
    }

    /* ═══ INTERACTIVE CANVAS CLICK (Rename / Identify) ══ */
    _onCanvasClick(e) {
        if (!this.mesh || this.mesh.activeHudCards.length === 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        for (const card of this.mesh.activeHudCards) {
            const inCard = (clickX >= card.x && clickX <= card.x + card.w && clickY >= card.y && clickY <= card.y + card.h);
            const inFace = (clickX >= card.faceX && clickX <= card.faceX + card.faceW && clickY >= card.faceY && clickY <= card.faceY + card.faceH);

            if (inCard || inFace) {
                const det = this.lastDetections[0];
                const thumb = det ? this._cropFace(det.detection.box) : '';

                if (card.info && card.info.faceId) {
                    // Rename modal
                    this.pendingModal = {
                        mode: 'rename',
                        faceId: card.info.faceId,
                        thumbnail: thumb,
                        descriptors: []
                    };
                    this._openModal(thumb, card.name);
                } else if (card.info && card.info.descriptor) {
                    // Name modal
                    this.pendingModal = {
                        mode: 'new',
                        descriptors: [card.info.descriptor],
                        thumbnail: thumb,
                        tracked: null
                    };
                    this._openModal(thumb, '');
                }
                break;
            }
        }
    }

    /* ═══ MODAL WORKFLOW ══════════════════════════ */
    _openModal(thumb, defaultName = '') {
        const modal = document.getElementById('name-modal');
        const preview = document.getElementById('modal-face-preview');
        const input = document.getElementById('modal-face-name');

        const titleEl = modal?.querySelector('.modal-header h3');
        if (titleEl) {
            titleEl.textContent = this.pendingModal?.mode === 'rename' ? 'Rename Subject' : 'Identify This Face';
        }

        const img = new Image();
        img.onload = () => {
            const ctx = preview.getContext('2d');
            ctx.clearRect(0, 0, 160, 160);
            ctx.beginPath();
            ctx.arc(80, 80, 78, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, 0, 0, 160, 160);
        };
        img.src = thumb;

        input.value = defaultName;
        modal.classList.remove('hidden');
        setTimeout(() => {
            input.focus();
            input.select();
        }, 120);
    }

    _modalClose() {
        document.getElementById('name-modal')?.classList.add('hidden');
        if (this.pendingModal?.tracked) {
            this.unk.markDone(this.pendingModal.tracked);
        }
        this.pendingModal = null;
    }

    async _modalSave() {
        if (!this.pendingModal) return;
        const input = document.getElementById('modal-face-name');
        const name = input.value.trim();

        if (!name) {
            input.classList.add('shake');
            input.placeholder = 'Please enter a name!';
            setTimeout(() => input.classList.remove('shake'), 400);
            return;
        }

        try {
            if (this.pendingModal.mode === 'rename' && this.pendingModal.faceId) {
                await this.db.update(this.pendingModal.faceId, { name });
                this.toast(`Renamed face to "${name}"`, 'success');
            } else {
                const faces = await this.db.getAll();
                const existing = faces.find(f => f.name.toLowerCase() === name.toLowerCase());

                if (existing) {
                    for (const d of this.pendingModal.descriptors) {
                        await this.db.addSample(existing.id, d);
                    }
                    this.toast(`Added sample(s) to "${name}"`, 'success');
                } else {
                    await this.db.add(name, this.pendingModal.descriptors, this.pendingModal.thumbnail);
                    this.stats.learned++;
                    this.toast(`✅ Learned: ${name}`, 'success');
                }

                this.stats.totalSamples += (this.pendingModal.descriptors || []).length;
                this.voice.speak(`Face saved for ${name}`);
            }

            if (this.pendingModal.tracked) this.unk.markDone(this.pendingModal.tracked);
            this.pendingModal = null;
            document.getElementById('name-modal')?.classList.add('hidden');
            this._updateStats();
            this.refreshGallery();
        } catch (e) {
            this.toast('Save failed: ' + e.message, 'error');
        }
    }

    /* ═══ GALLERY ════════════════════════════════ */
    async refreshGallery() {
        const grid = document.getElementById('gallery-grid');
        const badge = document.getElementById('gallery-count');
        if (!grid) return;

        const faces = await this.db.getAll();
        badge.textContent = faces.length;
        this.stats.learned = faces.length;

        if (faces.length === 0) {
            grid.innerHTML = `<div class="gallery-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" opacity="0.4">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <p>No faces learned yet.<br>Show your face or enter a name parameter!</p>
            </div>`;
            return;
        }

        grid.innerHTML = faces.map(f => `
            <div class="gallery-card" data-id="${f.id}" title="${this._esc(f.name)}">
                <img class="gallery-card-img" src="${f.thumbnail}" alt="${this._esc(f.name)}">
                <span class="gallery-card-samples">${f.sampleCount} samples</span>
                <button class="gallery-card-delete" data-del="${f.id}" title="Delete">✕</button>
                <div class="gallery-card-info">
                    <div class="gallery-card-name">${this._esc(f.name)}</div>
                    <div class="gallery-card-meta">${this._ago(f.createdAt)}</div>
                </div>
            </div>`).join('');

        grid.querySelectorAll('.gallery-card-delete').forEach(b => {
            b.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.db.del(parseInt(b.dataset.del));
                this.toast('Face removed', 'info');
                this.refreshGallery();
                this._updateStats();
            });
        });

        grid.querySelectorAll('.gallery-card').forEach(c => {
            c.addEventListener('click', async () => {
                const id = parseInt(c.dataset.id);
                const face = (await this.db.getAll()).find(f => f.id === id);
                if (!face) return;
                const n = prompt('Rename this face:', face.name);
                if (n?.trim()) {
                    await this.db.update(id, { name: n.trim() });
                    this.refreshGallery();
                    this.toast(`Renamed → "${n.trim()}"`, 'success');
                }
            });
        });
    }

    /* ═══ STATS & TRAINING PROGRESS ══════════════ */
    _updateStats() {
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setTxt('stat-detected', this.stats.detected);
        setTxt('stat-learned', this.stats.learned);
        setTxt('stat-recognized', this.stats.recognized);
        setTxt('stat-sessions', this.stats.sessions);

        const fill = document.getElementById('training-fill');
        const status = document.getElementById('training-status');
        const samples = document.getElementById('training-samples');
        const max = Math.max(1, this.stats.learned * CONFIG.MAX_SAMPLES_PER_FACE);
        const pct = Math.min(100, (this.stats.totalSamples / max) * 100);

        if (fill) fill.style.width = pct + '%';
        if (status) {
            if (!this.stats.learned) status.textContent = 'Waiting for faces...';
            else if (pct < 35) status.textContent = 'Collecting vectors...';
            else if (pct < 95) status.textContent = 'Improving accuracy...';
            else status.textContent = 'Optimal training ✓';
        }
        if (samples) samples.textContent = `${this.stats.totalSamples} samples`;
    }

    /* ═══ SIDEBAR MOBILE ═════════════════════════ */
    _sidebar(open) {
        document.getElementById('sidebar')?.classList.toggle('open', open);
        document.getElementById('sidebar-overlay')?.classList.toggle('active', open);
    }

    /* ═══ EXPORT / CLEAR ═════════════════════════ */
    async exportDB() {
        try {
            const d = JSON.stringify(await this.db.getAll(), null, 2);
            const b = new Blob([d], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `facevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            this.toast('Database exported ✓', 'success');
        } catch (e) {
            this.toast('Export failed', 'error');
        }
    }

    async clearDB() {
        if (!confirm('⚠️ Permanently delete ALL learned faces and training vectors?')) return;
        await this.db.clear();
        this.stats.learned = 0;
        this.stats.totalSamples = 0;
        this.stats.recognized = 0;
        this.unk = new UnknownTracker();
        this._updateStats();
        this.refreshGallery();
        this.toast('All faces cleared', 'info');
    }

    /* ═══ UTILITIES ══════════════════════════════ */
    toast(msg, type = 'info') {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    _ago(ts) {
        const d = Date.now() - ts, s = d / 1000 | 0;
        if (s < 60) return 'just now';
        const m = s / 60 | 0; if (m < 60) return m + 'm ago';
        const h = m / 60 | 0; if (h < 24) return h + 'h ago';
        return (h / 24 | 0) + 'd ago';
    }
}


// ─────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.faceVaultApp = new App();
    window.faceVaultApp.init();
});

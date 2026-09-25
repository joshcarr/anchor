/* Anchor: a guided pelvic floor (Kegel) trainer.
 * Plain JS, no build step. State lives in localStorage; when the page runs as a
 * claude.ai artifact it also syncs to the artifact's private per-user store. */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Program
  // ---------------------------------------------------------------------------

  const CUES = {
    squeeze: [
      "Lift and draw in, as if stopping the flow of urine.",
      "Squeeze as if holding in gas. Keep your glutes soft.",
      "Keep breathing. Don't hold your breath.",
      "Feel the base of the penis draw in and the testicles lift slightly.",
      "Thighs, glutes and belly stay relaxed. Only the floor works.",
      "Steady squeeze. If it fades, ease off and reset next rep.",
    ],
    relax: [
      "Let go completely. The release matters as much as the squeeze.",
      "Soften everything. Breathe into your belly.",
      "Full release. Feel the floor drop back to rest.",
      "Relax your jaw and shoulders too.",
    ],
    flick: [
      "Fast and strong, then let go completely.",
      "Quick lift, full release. Quality over speed.",
      "Snap it up, drop it down.",
    ],
    elevator: [
      "Go up one floor at a time. Each floor a little tighter.",
      "Come down slowly. Control the descent.",
    ],
    pulse: [
      "Hold a gentle half squeeze, then pulse to full.",
      "Don't drop below half between pulses.",
    ],
    knack: [
      "Squeeze first, then cough while holding. This is how you stop leaks.",
      "Lock it before the cough, lift or sneeze.",
    ],
    drop: [
      "Breathe in and let the pelvic floor gently lengthen and drop.",
      "Imagine the space between your sit bones widening.",
      "No pushing or straining. Just soften and let go.",
    ],
    breath: [
      "Breathe into your belly. The pelvic floor moves down as you inhale.",
      "Slow exhale. Let the floor rise back on its own.",
    ],
  };

  const S_SQUEEZE = 0.6; // orb scale at full contraction
  const S_HALF = 0.8;
  const S_OPEN = 1.12;

  function ph(kind, label, dur, scale, ease, cue, extra) {
    return Object.assign({ kind, label, dur, scale, ease, cue }, extra || {});
  }
  function pick(list, i) { return list[i % list.length]; }

  const BLOCKS = {
    breathe(reps) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("breath", "Breathe in", 4, S_OPEN, 4, CUES.breath[0], { rep: i + 1 }));
        phases.push(ph("breath", "Breathe out", 6, 1, 6, CUES.breath[1], { rep: i + 1 }));
      }
      return {
        key: "breathe", name: "Belly breathing", color: "breath",
        detail: `${reps} slow breaths`, reps,
        intro: ["Get comfortable and rest a hand on your belly.", "Breathe in for 4, out for 6. Nothing to squeeze yet."],
        phases,
      };
    },
    hold(reps, hold, rest) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("squeeze", "Squeeze", hold, S_SQUEEZE, 0.9, pick(CUES.squeeze, i), { rep: i + 1 }));
        phases.push(ph("relax", "Relax", rest, 1, 1.2, pick(CUES.relax, i), { rep: i + 1 }));
      }
      return {
        key: "hold", name: "Slow holds", color: "squeeze",
        detail: `${reps} × ${hold}s hold, ${rest}s rest`, reps,
        intro: ["Builds endurance: the slow-twitch fibers that keep you continent and support erections.", `Squeeze and hold for ${hold} seconds, then fully relax for ${rest}.`],
        phases,
      };
    },
    flick(reps) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("squeeze", "Squeeze", 1, S_SQUEEZE, 0.2, pick(CUES.flick, i), { rep: i + 1 }));
        phases.push(ph("relax", "Let go", 2, 1, 0.35, pick(CUES.flick, i), { rep: i + 1 }));
      }
      return {
        key: "flick", name: "Quick flicks", color: "squeeze",
        detail: `${reps} fast squeezes`, reps,
        intro: ["Builds fast-twitch power: the reflex squeeze that stops leaks when you cough or stand up.", "Squeeze hard and fast for 1 second, then let go fully for 2."],
        phases,
      };
    },
    elevator(rounds, floors, per) {
      const phases = [];
      for (let r = 0; r < rounds; r++) {
        for (let f = 1; f <= floors; f++) {
          const scale = 1 - (1 - S_SQUEEZE) * (f / floors);
          phases.push(ph("squeeze", `Floor ${f}`, per, scale, 0.8, CUES.elevator[0], { rep: r + 1, level: f / floors }));
        }
        for (let f = floors - 1; f >= 1; f--) {
          const scale = 1 - (1 - S_SQUEEZE) * (f / floors);
          phases.push(ph("squeeze", `Down to ${f}`, per, scale, 0.8, CUES.elevator[1], { rep: r + 1, level: f / floors }));
        }
        phases.push(ph("relax", "Ground floor", Math.max(6, per * floors), 1, 1.2, pick(CUES.relax, r), { rep: r + 1 }));
      }
      return {
        key: "elevator", name: "Elevator", color: "squeeze",
        detail: `${rounds} rounds, ${floors} floors`, reps: rounds,
        intro: ["Builds fine control. Squeeze in stages like an elevator rising, then lower it floor by floor.", `${floors} floors, ${per} seconds at each.`],
        phases,
      };
    },
    pyramid(holds) {
      const phases = [];
      holds.forEach((h, i) => {
        phases.push(ph("squeeze", "Squeeze", h, S_SQUEEZE, 0.9, pick(CUES.squeeze, i + 2), { rep: i + 1 }));
        phases.push(ph("relax", "Relax", Math.max(4, h), 1, 1.2, pick(CUES.relax, i), { rep: i + 1 }));
      });
      return {
        key: "pyramid", name: "Pyramid", color: "squeeze",
        detail: holds.join("-") + "s holds", reps: holds.length,
        intro: ["Holds that climb and then come back down. Rest as long as you held.", `Holds: ${holds.join(", ")} seconds.`],
        phases,
      };
    },
    pulseHold(reps, pulses) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("squeeze", "Half squeeze", 3, S_HALF, 0.8, CUES.pulse[0], { rep: i + 1, level: 0.5 }));
        for (let p = 0; p < pulses; p++) {
          phases.push(ph("squeeze", "Pulse", 1, S_SQUEEZE, 0.2, CUES.pulse[1], { rep: i + 1, level: 1 }));
          phases.push(ph("squeeze", "Back to half", 1, S_HALF, 0.25, CUES.pulse[1], { rep: i + 1, level: 0.5 }));
        }
        phases.push(ph("relax", "Relax", 8, 1, 1.2, pick(CUES.relax, i), { rep: i + 1 }));
      }
      return {
        key: "pulse", name: "Pulse holds", color: "squeeze",
        detail: `${reps} × ${pulses} pulses`, reps,
        intro: ["Combines endurance and power. Hold at half strength, then pulse to full and back without letting go.", `${pulses} pulses per rep, then a full release.`],
        phases,
      };
    },
    knack(reps) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("squeeze", "Squeeze", 1, S_SQUEEZE, 0.25, CUES.knack[0], { rep: i + 1 }));
        phases.push(ph("squeeze", "Cough now", 2, S_SQUEEZE, 0.1, CUES.knack[1], { rep: i + 1 }));
        phases.push(ph("relax", "Relax", 5, 1, 1, pick(CUES.relax, i), { rep: i + 1 }));
      }
      return {
        key: "knack", name: "The Knack", color: "squeeze",
        detail: `${reps} squeeze-then-cough`, reps,
        intro: ["Trains the squeeze to fire before pressure hits: coughing, sneezing, lifting, standing up.", "Squeeze, then give a real cough while holding. Relax after."],
        phases,
      };
    },
    drop(reps) {
      const phases = [];
      for (let i = 0; i < reps; i++) {
        phases.push(ph("relax", "Drop & widen", 5, S_OPEN, 5, pick(CUES.drop, i), { rep: i + 1 }));
        phases.push(ph("breath", "Breathe out", 5, 1, 5, CUES.breath[1], { rep: i + 1 }));
      }
      return {
        key: "drop", name: "Reverse Kegel", color: "relax",
        detail: `${reps} relaxation breaths`, reps,
        intro: ["Cool down by lengthening the muscle. A strong floor also has to relax fully.", "Breathe in and let the floor soften and drop. Breathe out and let it settle."],
        phases,
      };
    },
  };

  const LEVELS = [
    { n: 1, name: "Foundation", pos: "Lying down", focus: "Find the right muscle and learn a clean squeeze and full release.",
      build: () => [BLOCKS.breathe(3), BLOCKS.hold(8, 3, 6), BLOCKS.flick(8), BLOCKS.drop(4)] },
    { n: 2, name: "Groundwork", pos: "Lying down", focus: "More reps with a slightly longer hold.",
      build: () => [BLOCKS.breathe(3), BLOCKS.hold(10, 4, 6), BLOCKS.flick(10), BLOCKS.drop(4)] },
    { n: 3, name: "Steady", pos: "Lying down", focus: "Five-second holds with even rest.",
      build: () => [BLOCKS.breathe(3), BLOCKS.hold(10, 5, 6), BLOCKS.flick(12), BLOCKS.drop(5)] },
    { n: 4, name: "Upright", pos: "Sitting", focus: "Sitting adds gravity. Adds the elevator for control.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 5, 5), BLOCKS.flick(12), BLOCKS.elevator(2, 3, 2), BLOCKS.drop(5)] },
    { n: 5, name: "Control", pos: "Sitting", focus: "Six-second holds and more elevator rounds.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 6, 6), BLOCKS.flick(15), BLOCKS.elevator(3, 3, 2), BLOCKS.drop(5)] },
    { n: 6, name: "Endurance", pos: "Sitting", focus: "Seven-second holds and a pyramid up to eight.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 7, 7), BLOCKS.flick(15), BLOCKS.pyramid([2, 4, 6, 8, 6, 4, 2]), BLOCKS.drop(5)] },
    { n: 7, name: "Standing", pos: "Standing", focus: "Standing is the hardest position. Adds pulse holds.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 7, 7), BLOCKS.flick(15), BLOCKS.pulseHold(4, 4), BLOCKS.drop(5)] },
    { n: 8, name: "Strength", pos: "Standing", focus: "Eight-second holds, a four-floor elevator, twenty flicks.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 8, 8), BLOCKS.flick(20), BLOCKS.elevator(3, 4, 2), BLOCKS.pulseHold(4, 5), BLOCKS.drop(5)] },
    { n: 9, name: "Power", pos: "Standing", focus: "Full ten-second holds, the long pyramid.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(10, 10, 10), BLOCKS.flick(20), BLOCKS.pyramid([3, 5, 7, 10, 7, 5, 3]), BLOCKS.pulseHold(5, 5), BLOCKS.drop(5)] },
    { n: 10, name: "Mastery", pos: "Standing", focus: "Everything, plus the Knack for real-world control. Your maintenance routine.",
      build: () => [BLOCKS.breathe(2), BLOCKS.hold(12, 10, 10), BLOCKS.flick(20), BLOCKS.elevator(3, 4, 3), BLOCKS.pulseHold(5, 6), BLOCKS.knack(6), BLOCKS.drop(6)] },
  ];
  const MAX_LEVEL = LEVELS.length;
  const SESSIONS_TO_ADVANCE = 5;
  const PREP_SECS = 5;

  function buildSession(levelN, short) {
    let blocks = LEVELS[levelN - 1].build();
    if (short) {
      // Short-on-time mode: keep every exercise type, halve the reps.
      blocks = blocks.map((b) => {
        const perRep = b.phases.length / b.reps;
        const keep = Math.max(1, Math.ceil(b.reps / 2));
        return Object.assign({}, b, {
          reps: keep,
          detail: b.detail + " (half)",
          phases: b.phases.slice(0, Math.round(perRep * keep)),
        });
      });
    }
    blocks.forEach((b) => { b.secs = b.phases.reduce((s, p) => s + p.dur, 0); });
    const total = blocks.reduce((s, b) => s + b.secs + PREP_SECS, 0);
    return { blocks, total };
  }

  function sessionStats(blocks) {
    let hold = 0, longest = 0, reps = 0;
    blocks.forEach((b) => {
      if (b.color === "squeeze") reps += b.reps;
      b.phases.forEach((p) => {
        if (p.kind === "squeeze") { hold += p.dur; longest = Math.max(longest, p.dur); }
      });
    });
    return { hold, longest, reps };
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  const LS_KEY = "anchor.v1";
  const LS_UI = "anchor.ui";

  function defaultState() {
    return {
      level: 1,
      levelSince: new Date().toISOString(),
      levelHistory: [{ level: 1, at: new Date().toISOString() }],
      settings: { goal: 1, cues: "tones", vibrate: true, short: false, reminder: "08:00", onboarded: false, dismissedAt: -1 },
      sessions: [],
      updatedAt: 0,
    };
  }

  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ } }

  function loadLocal() {
    const raw = lsGet(LS_KEY);
    const base = defaultState();
    if (!raw) return base;
    try {
      const s = JSON.parse(raw);
      return Object.assign(base, s, { settings: Object.assign(base.settings, s.settings || {}) });
    } catch (e) { return base; }
  }

  let state = loadLocal();

  // Optional sync to the claude.ai artifact store (private per viewer).
  const remote = { ready: false, profile: null, sessions: null, queue: Promise.resolve() };

  function profileBody() {
    return { level: state.level, levelSince: state.levelSince, levelHistory: state.levelHistory, settings: state.settings, updatedAt: state.updatedAt };
  }

  function enqueue(fn) {
    remote.queue = remote.queue.then(fn).catch(() => { /* keep local copy; next write retries */ });
    return remote.queue;
  }

  async function initRemote() {
    const claude = window.claude;
    if (!claude || typeof claude.use !== "function") return;
    try {
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const profile = db.doc("data/users/" + uid + "/profile");
      const sessions = profile.collection("sessions");
      const [pSnap, sSnap] = await Promise.all([profile.get(), sessions.get()]);
      remote.profile = profile;
      remote.sessions = sessions;
      remote.ready = true;

      const remoteSessions = sSnap.docs.map((d) => d.data());
      const known = new Set(state.sessions.map((s) => s.id));
      const remoteIds = new Set(remoteSessions.map((s) => s.id));
      const localOnly = state.sessions.filter((s) => !remoteIds.has(s.id));
      remoteSessions.forEach((s) => { if (!known.has(s.id)) state.sessions.push(Object.assign({}, s)); });
      state.sessions.sort((a, b) => a.at.localeCompare(b.at));

      const rp = pSnap.exists ? pSnap.data() : null;
      if (rp && (rp.updatedAt || 0) > (state.updatedAt || 0)) {
        state.level = rp.level;
        state.levelSince = rp.levelSince;
        state.levelHistory = (rp.levelHistory || []).slice();
        state.settings = Object.assign(defaultState().settings, rp.settings || {});
        state.updatedAt = rp.updatedAt;
      } else if (!rp || (state.updatedAt || 0) > (rp.updatedAt || 0)) {
        enqueue(() => profile.set(profileBody()));
      }
      localOnly.forEach((s) => enqueue(() => sessions.doc(s.id).set(s)));
      lsSet(LS_KEY, JSON.stringify(state));
      render();
    } catch (e) { /* stay local-only */ }
  }

  function saveProfile() {
    state.updatedAt = Date.now();
    lsSet(LS_KEY, JSON.stringify(state));
    if (remote.ready) { const body = profileBody(); enqueue(() => remote.profile.set(body)); }
  }

  function saveSession(s) {
    lsSet(LS_KEY, JSON.stringify(state));
    if (remote.ready) { const body = Object.assign({}, s); enqueue(() => remote.sessions.doc(s.id).set(body)); }
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  function dayKey(d) {
    const x = new Date(d);
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function countsByDay() {
    const m = new Map();
    state.sessions.forEach((s) => m.set(s.day, (m.get(s.day) || 0) + 1));
    return m;
  }

  function streaks() {
    const m = countsByDay();
    const today = new Date();
    let cur = 0;
    let d = m.has(dayKey(today)) ? today : addDays(today, -1);
    while (m.has(dayKey(d))) { cur++; d = addDays(d, -1); }
    const days = [...m.keys()].sort();
    let best = 0, run = 0, prev = null;
    days.forEach((k) => {
      run = prev && dayKey(addDays(new Date(prev + "T12:00:00"), 1)) === k ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    });
    return { cur, best: Math.max(best, cur) };
  }

  function levelSessions() {
    return state.sessions.filter((s) => s.level === state.level && s.at >= state.levelSince && !s.partial);
  }

  function suggestion() {
    const ls = levelSessions();
    if (state.settings.dismissedAt >= 0 && state.sessions.length < state.settings.dismissedAt + 2) return null;
    const last = ls.slice(-3).map((s) => s.rating);
    const last2 = ls.slice(-2).map((s) => s.rating);
    if (state.level > 1 && last2.length === 2 && last2.every((r) => r === "hard")) return { type: "down" };
    if (state.level >= MAX_LEVEL) return null;
    if (ls.length >= 3 && last.length === 3 && last.every((r) => r === "easy")) return { type: "up" };
    if (ls.length >= SESSIONS_TO_ADVANCE && !last.includes("hard")) return { type: "up" };
    return null;
  }

  function setLevel(n) {
    n = Math.min(MAX_LEVEL, Math.max(1, n));
    if (n === state.level) return;
    state.level = n;
    state.levelSince = new Date().toISOString();
    state.levelHistory.push({ level: n, at: state.levelSince });
    state.settings.dismissedAt = -1;
    saveProfile();
  }

  // ---------------------------------------------------------------------------
  // Formatting & icons
  // ---------------------------------------------------------------------------

  function fmtMin(secs) {
    const m = Math.round(secs / 60);
    return m < 1 ? "<1 min" : m + " min";
  }
  function fmtClock(secs) {
    secs = Math.max(0, Math.round(secs));
    return Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
  }
  function relDay(iso) {
    const k = dayKey(iso);
    if (k === dayKey(new Date())) return "Today";
    if (k === dayKey(addDays(new Date(), -1))) return "Yesterday";
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function timeOf(iso) { return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }

  const ICON = {
    mark: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="16" cy="7" r="3"/><path d="M16 10v17"/><path d="M6 17c0 6 4.5 10 10 10s10-4 10-10"/><path d="M11 14h10"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    check: '<svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="36" cy="36" r="32"/><path d="M22 37l9 9 19-20"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  const ui = { tab: "today", confirmReset: false, toast: null };
  try { const t = JSON.parse(lsGet(LS_UI) || "{}"); if (t.tab) ui.tab = t.tab; } catch (e) { /* ignore */ }

  const root = document.getElementById("app");

  function header() {
    const st = streaks();
    return `<header class="top">
      <div class="brand">${ICON.mark}<span class="brand-name">Anchor</span></div>
      <span class="streak-chip" title="Days in a row"><b>${st.cur}</b> day streak</span>
    </header>`;
  }

  function goalRing(done, goal) {
    const r = 26, c = 2 * Math.PI * r, frac = Math.min(1, done / goal);
    return `<div class="goal-ring" aria-label="${done} of ${goal} sessions today">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--relax)" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/></svg>
      <span class="goal-text">${done}/${goal}</span></div>`;
  }

  function weekStrip() {
    const m = countsByDay();
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = addDays(today, -mondayOffset);
    const names = ["M", "T", "W", "T", "F", "S", "S"];
    let html = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i), k = dayKey(d), n = m.get(k) || 0;
      const cls = [n >= state.settings.goal ? "done" : n > 0 ? "part" : "", k === dayKey(today) ? "today" : ""].join(" ");
      html += `<div class="week-day ${cls}"><span>${names[i]}</span><span class="pip">${n > 0 ? n : ""}</span></div>`;
    }
    return `<div class="week-strip" aria-label="This week">${html}</div>`;
  }

  function blockList(blocks) {
    return `<ul class="blocks">${blocks.map((b) => `<li>
      <span class="dot ${b.color}"></span>
      <div><div class="b-name">${b.name}</div><div class="b-detail">${b.detail}</div></div>
      <span class="b-time">${fmtClock(b.secs)}</span></li>`).join("")}</ul>`;
  }

  function viewToday() {
    const lvl = LEVELS[state.level - 1];
    const plan = buildSession(state.level, state.settings.short);
    const todayCount = countsByDay().get(dayKey(new Date())) || 0;
    const goal = state.settings.goal;
    const ls = levelSessions().length;
    const sug = suggestion();
    let out = header();

    if (!state.settings.onboarded && state.sessions.length === 0) {
      out += `<section class="banner" aria-label="Welcome">
        <strong>Start at Level 1, even if it looks easy.</strong>
        <p>Most men squeeze their glutes or hold their breath at first. The early levels are lying down so you can learn a clean squeeze and a full release. Read <b>Learn</b> first if you're not sure which muscle to use.</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="onboard" data-level="1">Start at Level 1</button>
          <button class="btn btn-quiet" data-action="onboard" data-level="4">Skip to Level 4</button>
        </div></section>`;
    }

    if (sug && sug.type === "up") {
      const next = LEVELS[state.level];
      out += `<section class="banner" aria-label="Level up">
        <strong>Ready for Level ${next.n}: ${next.name}</strong>
        <p>${next.focus}</p>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="level" data-level="${next.n}">Move up</button>
          <button class="btn btn-quiet" data-action="dismiss">Stay here a bit</button>
        </div></section>`;
    } else if (sug && sug.type === "down") {
      out += `<section class="banner caution" aria-label="Step back">
        <strong>Rated too hard twice in a row</strong>
        <p>Dropping back a level for a week builds better form than grinding through. Quality squeezes beat long ones.</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="level" data-level="${state.level - 1}">Back to Level ${state.level - 1}</button>
          <button class="btn btn-quiet" data-action="dismiss">Keep going</button>
        </div></section>`;
    }

    const remaining = Math.max(0, goal - todayCount);
    const status = todayCount === 0 ? "Not done yet today"
      : remaining > 0 ? `${remaining} more to hit today's goal`
      : "Today's goal done. Nice work.";

    out += `<section class="card hero-card" aria-label="Today's session">
      <div class="hero-head">
        <div>
          <div class="eyebrow">Level ${lvl.n} of ${MAX_LEVEL} · ${lvl.pos}</div>
          <h1>${lvl.name}</h1>
          <p class="hero-meta">${fmtMin(plan.total)} · ${status}</p>
        </div>
        ${goalRing(todayCount, goal)}
      </div>
      <p class="tip">${lvl.focus}</p>
      ${blockList(plan.blocks)}
      <button class="btn btn-primary btn-block" data-action="start">${todayCount >= goal ? "Do another session" : "Start session"}</button>
      <div class="toggle-row"><span>Short on time? Half the reps</span>
        <label class="switch"><input type="checkbox" id="short-toggle" data-action="short" ${state.settings.short ? "checked" : ""} aria-label="Short session"><span></span></label>
      </div>
    </section>`;

    const needed = state.level >= MAX_LEVEL ? null : Math.max(0, SESSIONS_TO_ADVANCE - ls);
    out += `<section class="card" aria-label="This week">
      <div class="eyebrow">This week</div>
      ${weekStrip()}
      <p class="tip">${needed === null
        ? "You're on the maintenance level. Keep a daily session to hold on to your gains."
        : needed > 0
          ? `<b>${needed} more session${needed === 1 ? "" : "s"}</b> at this level before moving up, as long as they don't feel too hard.`
          : "You've put in the sessions for this level. Rate how the next one feels to unlock the next level."}</p>
    </section>`;

    out += `<section class="card flat" aria-label="Tip">
      <div class="eyebrow">Make it stick</div>
      <p class="tip">Tie the session to something you already do daily: after brushing your teeth, before your first coffee, lying down at night. Same time, same place. Most men notice a difference after 6 to 12 weeks of daily practice.</p>
    </section>`;
    return out;
  }

  function heatmap() {
    const m = countsByDay();
    const weeks = 16;
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
    let cells = "";
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i), k = dayKey(d), n = m.get(k) || 0;
      const future = d > today && k !== dayKey(today);
      const cls = future ? "future" : n >= 3 ? "l3" : n === 2 ? "l2" : n === 1 ? "l1" : "";
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ": " + n + " session" + (n === 1 ? "" : "s");
      cells += `<i class="heat ${cls} ${k === dayKey(today) ? "today" : ""}" title="${label}"></i>`;
    }
    return `<div class="heatmap" style="--weeks:${weeks}" role="img" aria-label="Sessions per day, last 16 weeks">${cells}</div>
      <div class="heat-legend">Less <i class="heat"></i><i class="heat l1"></i><i class="heat l2"></i><i class="heat l3"></i> More</div>`;
  }

  function viewProgress() {
    const st = streaks();
    const done = state.sessions.filter((s) => !s.partial);
    const holdSecs = state.sessions.reduce((a, s) => a + (s.holdSecs || 0), 0);
    const longest = state.sessions.reduce((a, s) => Math.max(a, s.longestHold || 0), 0);
    const ls = levelSessions().length;
    const frac = state.level >= MAX_LEVEL ? 1 : Math.min(1, ls / SESSIONS_TO_ADVANCE);
    let out = header();

    out += `<div class="stats">
      <div class="stat"><span class="v">${st.cur}<small>${st.cur === 1 ? "day" : "days"}</small></span><span class="l">Current streak · best ${st.best}</span></div>
      <div class="stat"><span class="v">${done.length}</span><span class="l">Sessions completed</span></div>
      <div class="stat"><span class="v">${Math.round(holdSecs / 60)}<small>min</small></span><span class="l">Total time squeezing</span></div>
      <div class="stat"><span class="v">${longest}<small>s</small></span><span class="l">Longest hold</span></div>
    </div>`;

    out += `<section class="card"><div class="eyebrow">Consistency</div>${heatmap()}</section>`;

    out += `<section class="card" aria-label="Levels">
      <div class="eyebrow">Your path</div>
      <div class="level-bar" aria-label="Progress in this level"><i style="width:${Math.round(frac * 100)}%"></i></div>
      <p class="tip">${state.level >= MAX_LEVEL ? "Top level reached. This is your maintenance routine." : `${Math.min(ls, SESSIONS_TO_ADVANCE)} of ${SESSIONS_TO_ADVANCE} sessions at Level ${state.level}.`}</p>
      <ul class="ladder">${LEVELS.map((l) => {
        const cls = l.n < state.level ? "done" : l.n === state.level ? "current" : "locked";
        const plan = buildSession(l.n, false);
        const s = sessionStats(plan.blocks);
        return `<li class="${cls}"><span class="num">${l.n}</span>
          <div><div class="l-name">${l.name}</div><div class="l-sub">${l.pos} · holds to ${s.longest}s · ${fmtMin(plan.total)}</div></div>
          <span class="l-tag">${cls === "current" ? "Now" : cls === "done" ? "Done" : ""}</span></li>`;
      }).join("")}</ul>
    </section>`;

    const recent = state.sessions.slice(-12).reverse();
    const rateLabel = { easy: "Easy", ok: "Right", hard: "Hard" };
    out += `<section class="card" aria-label="Recent sessions"><div class="eyebrow">Recent sessions</div>
      ${recent.length ? `<ul class="history">${recent.map((s) => `<li>
        <div><div class="h-when">${relDay(s.at)} · ${timeOf(s.at)}</div>
        <div class="h-what">Level ${s.level} · ${fmtMin(s.secs)} · ${s.reps} reps${s.short ? " · short" : ""}${s.partial ? " · ended early" : ""}</div></div>
        ${s.rating ? `<span class="h-rate ${s.rating}">${rateLabel[s.rating]}</span>` : "<span></span>"}
      </li>`).join("")}</ul>` : `<p class="empty">No sessions yet. Your first one takes about 3 minutes.</p>`}
    </section>`;
    return out;
  }

  function viewLearn() {
    return header() + `<div class="learn" style="display:flex;flex-direction:column;gap:18px">
    <section class="card">
      <h2>Finding the right muscle</h2>
      <p>Your pelvic floor is the sling of muscle between your tailbone and pubic bone. It supports the bladder and bowel and helps with erections and ejaculation.</p>
      <ul>
        <li>Imagine stopping yourself from passing gas, and at the same time stopping the flow of urine. That lift-and-squeeze is the movement.</li>
        <li>You should feel the base of the penis draw in toward your body and the testicles lift slightly.</li>
        <li>Stopping urine mid-flow once is fine to check you've found it. Don't train that way: it can stop the bladder emptying properly.</li>
      </ul>
    </section>
    <section class="card">
      <h2>Good form</h2>
      <ul>
        <li><b>Keep breathing.</b> Holding your breath pushes down on the floor you're trying to lift.</li>
        <li><b>Only the floor works.</b> Glutes, thighs and belly stay soft. Nobody should be able to tell you're doing it.</li>
        <li><b>Let go fully</b> between every rep. A muscle that can't relax can't contract well either.</li>
        <li><b>Quality over length.</b> If a hold fades, stop that rep and rest. A shorter, clean squeeze beats a long weak one.</li>
      </ul>
    </section>
    <section class="card">
      <h2>How often</h2>
      <p>Train every day. The NHS and Mayo Clinic suggest about three sets a day, building toward 10-second holds. Each session here covers roughly one set of slow holds plus quick flicks, so one a day is the minimum and two or three is better while you're building. Set your daily goal in Settings.</p>
      <p>Expect changes in 6 to 12 weeks. Once you reach Level 10, keep going with a daily session: the gains fade if you stop.</p>
    </section>
    <section class="card">
      <h2>The exercises</h2>
      <dl class="glossary">
        <dt><span class="dot squeeze"></span></dt><dd><b>Slow holds</b>Endurance. Squeeze and hold, then rest at least as long as you held.</dd>
        <dt><span class="dot squeeze"></span></dt><dd><b>Quick flicks</b>Power and reflex speed. One-second squeezes with a full release.</dd>
        <dt><span class="dot squeeze"></span></dt><dd><b>Elevator</b>Control. Squeeze in stages, then lower in stages.</dd>
        <dt><span class="dot squeeze"></span></dt><dd><b>Pyramid</b>Endurance with variety. Holds climb and descend.</dd>
        <dt><span class="dot squeeze"></span></dt><dd><b>Pulse holds</b>Hold at half, pulse to full on top of it.</dd>
        <dt><span class="dot squeeze"></span></dt><dd><b>The Knack</b>Squeeze before a cough, sneeze or lift. The habit that stops leaks in daily life.</dd>
        <dt><span class="dot relax"></span></dt><dd><b>Reverse Kegel</b>Relaxation. Breathe in and let the floor lengthen. Keeps the muscle from getting tight.</dd>
        <dt><span class="dot breath"></span></dt><dd><b>Belly breathing</b>Warm-up. Connects your breath to the floor's natural movement.</dd>
      </dl>
    </section>
    <section class="card">
      <h2>Why the positions change</h2>
      <p>Lying down takes gravity off the pelvic floor, so it's the easiest place to learn. Sitting adds load. Standing is hardest, and it's where leaks and weakness actually show up, so the later levels train there.</p>
    </section>
    <section class="card flat">
      <h2>Check with a doctor if</h2>
      <ul>
        <li>You feel pain during or after the exercises, or pelvic, testicular or perineal pain in general.</li>
        <li>You're recovering from prostate surgery. Kegels help a lot, but your urologist or a pelvic health physiotherapist should set the timing.</li>
        <li>You have trouble starting urination, constipation or pain with sex. These can mean the floor is too tight, and relaxation work matters more than squeezing.</li>
        <li>Nothing changes after 3 months of regular practice.</li>
      </ul>
      <p class="sources">This app guides practice and isn't medical advice. Sources: <a href="https://www.nhs.uk/conditions/pelvic-floor-exercises/" target="_blank" rel="noopener">NHS</a>, <a href="https://www.mayoclinic.org/healthy-lifestyle/mens-health/in-depth/kegel-exercises-for-men/art-20045074" target="_blank" rel="noopener">Mayo Clinic</a>, <a href="https://my.clevelandclinic.org/health/articles/14611-kegel-exercises" target="_blank" rel="noopener">Cleveland Clinic</a>.</p>
    </section></div>`;
  }

  function segBtns(name, value, options) {
    return `<div class="seg" role="group">${options.map(([v, label]) =>
      `<button type="button" data-action="set" data-key="${name}" data-value="${v}" aria-pressed="${String(value) === String(v)}">${label}</button>`).join("")}</div>`;
  }

  function viewSettings() {
    const s = state.settings;
    return header() + `<section class="card" aria-label="Settings">
      <div class="field"><span class="label">Daily goal</span>
        ${segBtns("goal", s.goal, [[1, "1 session"], [2, "2"], [3, "3"]])}
        <span class="hint">Train every day. Two or three spread out over the day is ideal while building strength.</span></div>
      <div class="divider"></div>
      <div class="field"><span class="label">Session cues</span>
        ${segBtns("cues", s.cues, [["tones", "Tones"], ["voice", "Voice"], ["off", "Silent"]])}
        <span class="hint">Tones play a high note to squeeze and a low note to relax, so you can close your eyes.</span></div>
      <div class="toggle-row"><span>Vibrate on each change (phones that support it)</span>
        <label class="switch"><input type="checkbox" id="vibrate-toggle" data-action="toggle" data-key="vibrate" ${s.vibrate ? "checked" : ""} aria-label="Vibrate"><span></span></label></div>
      <div class="divider"></div>
      <div class="field"><label for="level-select">Current level</label>
        <select id="level-select" data-action="pick-level">${LEVELS.map((l) =>
          `<option value="${l.n}" ${l.n === state.level ? "selected" : ""}>Level ${l.n}: ${l.name} (${l.pos})</option>`).join("")}</select>
        <span class="hint">The app suggests when to move. Change it here if you want to jump ahead or step back.</span></div>
      <div class="divider"></div>
      <div class="field"><label for="reminder-time">Daily reminder</label>
        <input type="time" id="reminder-time" value="${s.reminder}" data-action="reminder-time">
        <button class="btn btn-ghost" data-action="ics">Add daily reminder to calendar</button>
        <span class="hint">Downloads a repeating calendar event with an alert. Open it to add it to your phone's calendar.</span></div>
    </section>
    <section class="card" aria-label="Data">
      <div class="field"><span class="label">Your data</span>
        <span class="hint">${remote.ready ? "Saved to your account and on this device." : "Saved on this device only."}</span></div>
      ${ui.confirmReset ? `<div class="confirm-box"><strong>Erase all sessions and go back to Level 1?</strong>
        <div class="btn-row"><button class="btn btn-danger" data-action="reset-yes">Erase everything</button>
        <button class="btn btn-ghost" data-action="reset-no">Cancel</button></div></div>`
        : `<button class="btn btn-quiet" data-action="reset">Reset progress</button>`}
    </section>`;
  }

  function tabbar() {
    const tabs = [["today", "Today"], ["progress", "Progress"], ["learn", "Learn"], ["settings", "Settings"]];
    return `<nav class="tabbar" aria-label="Sections"><div class="tabbar-inner">${tabs.map(([k, label]) =>
      `<button class="tab" data-action="tab" data-tab="${k}" ${ui.tab === k ? 'aria-current="page"' : ""}>${ICON[k]}<span>${label}</span></button>`).join("")}</div></nav>`;
  }

  function render() {
    if (player.active) return;
    const views = { today: viewToday, progress: viewProgress, learn: viewLearn, settings: viewSettings };
    root.innerHTML = `<main class="app">${(views[ui.tab] || viewToday)()}</main>${tabbar()}${ui.toast ? `<div class="toast" role="status">${ui.toast}</div>` : ""}`;
  }

  function toast(msg) {
    ui.toast = msg;
    render();
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { ui.toast = null; render(); }, 2600);
  }

  // ---------------------------------------------------------------------------
  // Audio / haptics / wake lock
  // ---------------------------------------------------------------------------

  let audioCtx = null;
  function unlockAudio() {
    if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
  function tone(freq, dur, when) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime + (when || 0);
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { /* no speech */ }
  }
  function buzz(pattern) {
    if (!state.settings.vibrate) return;
    try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }
  function cueFor(p) {
    const mode = state.settings.cues;
    if (mode === "tones") {
      if (p.kind === "squeeze") tone(p.level && p.level < 1 ? 520 + 300 * p.level : 784, 0.14);
      else if (p.kind === "relax") tone(440, 0.22);
      else if (p.kind === "breath") tone(587, 0.18);
      else if (p.kind === "prep") { tone(523, 0.12); tone(659, 0.12, 0.14); }
    } else if (mode === "voice") {
      speak(p.kind === "prep" ? p.blockName : p.label);
    }
    buzz(p.kind === "squeeze" ? 60 : p.kind === "prep" ? [40, 60, 40] : 25);
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { wakeLock = null; }
  }
  function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  document.addEventListener("visibilitychange", () => { if (player.active && !player.paused && document.visibilityState === "visible") keepAwake(); });

  // ---------------------------------------------------------------------------
  // Session player
  // ---------------------------------------------------------------------------

  const player = { active: false };

  function startSession() {
    unlockAudio();
    const plan = buildSession(state.level, state.settings.short);
    const phases = [];
    plan.blocks.forEach((b, bi) => {
      phases.push({ kind: "prep", label: "Get ready", dur: PREP_SECS, scale: 1, ease: 0.8, block: bi, blockName: b.name, cue: "" });
      b.phases.forEach((p) => phases.push(Object.assign({ block: bi }, p)));
    });
    Object.assign(player, {
      active: true, plan, phases, idx: -1, paused: false, confirmEnd: false, finished: false,
      phaseStart: 0, pausedAt: 0, startedAt: Date.now(), elapsed: 0, lastTick: 0, rating: null, record: null,
    });
    renderPlayer();
    keepAwake();
    nextPhase();
    loop();
  }

  function now() { return performance.now(); }

  function nextPhase(jumpTo) {
    player.idx = jumpTo != null ? jumpTo : player.idx + 1;
    if (player.idx >= player.phases.length) { finishSession(false); return; }
    player.phaseStart = now();
    const p = player.phases[player.idx];
    applyPhase(p);
    cueFor(p);
  }

  function applyPhase(p) {
    const b = player.plan.blocks[p.block];
    const orb = document.getElementById("orb");
    if (!orb) return;
    orb.className = "orb " + (p.kind === "squeeze" ? "squeeze" : p.kind === "breath" ? "breath" : "");
    orb.style.transitionDuration = p.ease + "s";
    orb.style.transform = `scale(${p.scale})`;
    const word = document.getElementById("phase-word");
    word.textContent = p.label;
    word.className = "phase-word " + (p.kind === "squeeze" ? "squeeze" : p.kind === "breath" ? "breath" : p.kind === "relax" ? "relax" : "");
    document.getElementById("block-name").textContent = b.name;
    document.getElementById("block-sub").textContent = b.detail;
    document.getElementById("rep-line").textContent = p.kind === "prep" ? `Up next · ${fmtClock(b.secs)}` : `Rep ${p.rep} of ${b.reps}`;
    const cue = document.getElementById("cue");
    if (p.kind === "prep") {
      cue.innerHTML = `<ul class="intro-list">${b.intro.map((t) => `<li>${t}</li>`).join("")}</ul>`;
    } else {
      cue.textContent = p.cue || "";
    }
    const segs = document.querySelectorAll(".seg-progress i");
    segs.forEach((el, i) => el.classList.toggle("done", i < p.block));
  }

  function loop() {
    if (!player.active || player.finished) return;
    tick();
    requestAnimationFrame(loop);
  }
  // rAF stops in background tabs; the interval keeps the timer honest there.
  setInterval(() => { if (player.active && !player.finished) tick(); }, 250);

  function tick() {
    if (player.paused || player.idx < 0) return;
    const p = player.phases[player.idx];
    const t = (now() - player.phaseStart) / 1000;
    if (t >= p.dur) { nextPhase(); return; }
    const remain = p.dur - t;
    const count = document.getElementById("phase-count");
    if (count) count.textContent = Math.ceil(remain);
    const arc = document.getElementById("arc");
    if (arc) arc.style.strokeDashoffset = String(arc.dataset.c * (t / p.dur));
    const seg = document.querySelectorAll(".seg-progress i")[p.block];
    if (seg) {
      const b = player.plan.blocks[p.block];
      let before = 0;
      for (let i = player.idx - 1; i >= 0 && player.phases[i].block === p.block; i--) before += player.phases[i].kind === "prep" ? 0 : player.phases[i].dur;
      const inBlock = p.kind === "prep" ? 0 : before + t;
      seg.firstChild.style.width = Math.min(100, (inBlock / b.secs) * 100) + "%";
    }
    const clock = document.getElementById("clock");
    if (clock) {
      let left = remain;
      for (let i = player.idx + 1; i < player.phases.length; i++) left += player.phases[i].dur;
      clock.textContent = fmtClock(left) + " left";
    }
  }

  function togglePause() {
    if (player.paused) {
      player.phaseStart += now() - player.pausedAt;
      player.paused = false;
      keepAwake();
      const p = player.phases[player.idx];
      const orb = document.getElementById("orb");
      if (orb) { orb.style.transitionDuration = "0.4s"; orb.style.transform = `scale(${p.scale})`; }
    } else {
      player.paused = true;
      player.pausedAt = now();
      releaseWake();
      const orb = document.getElementById("orb");
      if (orb) { orb.style.transitionDuration = "0.6s"; orb.style.transform = "scale(1)"; }
    }
    const btn = document.getElementById("pause-btn");
    if (btn) btn.textContent = player.paused ? "Resume" : "Pause";
    const word = document.getElementById("phase-word");
    if (word && player.paused) { word.textContent = "Paused"; word.className = "phase-word"; }
    else if (word) applyPhase(player.phases[player.idx]);
  }

  function skipBlock(dir) {
    const cur = player.phases[player.idx].block;
    const target = dir > 0 ? cur + 1 : (player.phases[player.idx].kind === "prep" && cur > 0 ? cur - 1 : cur);
    if (target >= player.plan.blocks.length) { finishSession(false); return; }
    const idx = player.phases.findIndex((p) => p.block === target);
    if (player.paused) { player.paused = false; const btn = document.getElementById("pause-btn"); if (btn) btn.textContent = "Pause"; }
    nextPhase(idx);
  }

  function doneSecs() {
    let s = 0;
    for (let i = 0; i < player.idx && i < player.phases.length; i++) s += player.phases[i].dur;
    return s;
  }

  function finishSession(early) {
    player.finished = true;
    releaseWake();
    const secs = early ? doneSecs() : player.plan.total;
    const counted = !early || secs >= player.plan.total * 0.5;
    if (counted) {
      const doneBlocks = early ? player.plan.blocks.filter((b, i) => i < player.phases[player.idx].block) : player.plan.blocks;
      const st = sessionStats(doneBlocks);
      const at = new Date().toISOString();
      const rec = {
        id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        at, day: dayKey(at), level: state.level, secs: Math.round(secs),
        holdSecs: st.hold, longestHold: st.longest, reps: st.reps,
        short: !!state.settings.short, partial: !!early, rating: null,
      };
      state.sessions.push(rec);
      player.record = rec;
      if (!state.settings.onboarded) { state.settings.onboarded = true; saveProfile(); }
      saveSession(rec);
    }
    if (!early && state.settings.cues === "tones") { tone(523, 0.18); tone(659, 0.18, 0.18); tone(784, 0.3, 0.36); }
    if (!early && state.settings.cues === "voice") speak("Session complete");
    buzz([80, 60, 80]);
    renderDone(early, counted);
  }

  function closePlayer() {
    player.active = false;
    player.finished = true;
    releaseWake();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    render();
  }

  function renderPlayer() {
    const r = 47, c = 2 * Math.PI * r;
    root.innerHTML = `<div class="player" role="dialog" aria-label="Session"><div class="player-inner">
      <div class="player-top">
        <button class="btn btn-quiet" data-action="end" aria-label="End session">${ICON.close}</button>
        <span class="title">Level ${state.level} · ${LEVELS[state.level - 1].name}</span>
        <span class="clock" id="clock"></span>
      </div>
      <div class="seg-progress" aria-hidden="true">${player.plan.blocks.map(() => "<i><b></b></i>").join("")}</div>
      <div id="end-confirm"></div>
      <div class="block-head"><h2 id="block-name"></h2><span class="sub" id="block-sub"></span></div>
      <div class="stage">
        <div class="orb-wrap">
          <svg class="track" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="2.5"/>
            <circle id="arc" data-c="${c}" cx="50" cy="50" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="0"/>
          </svg>
          <div class="orb" id="orb"></div>
          <div class="orb-center" aria-live="polite"><span class="phase-word" id="phase-word"></span><span class="phase-count" id="phase-count"></span></div>
        </div>
      </div>
      <div class="rep-line" id="rep-line"></div>
      <div class="cue" id="cue"></div>
      <div class="player-controls">
        <button class="btn btn-ghost" data-action="prev">Back</button>
        <button class="btn btn-primary" id="pause-btn" data-action="pause">Pause</button>
        <button class="btn btn-ghost" data-action="skip">Skip</button>
      </div>
    </div></div>`;
  }

  function renderEndConfirm() {
    const box = document.getElementById("end-confirm");
    if (!box) return;
    if (!player.confirmEnd) { box.innerHTML = ""; return; }
    const half = doneSecs() >= player.plan.total * 0.5;
    box.innerHTML = `<div class="confirm-box"><strong>End this session?</strong>
      <span>${half ? "You're past halfway, so it will count toward today." : "You're less than halfway through, so it won't be saved."}</span>
      <div class="btn-row"><button class="btn btn-danger" data-action="end-yes">End session</button>
      <button class="btn btn-ghost" data-action="end-no">Keep going</button></div></div>`;
  }

  function renderDone(early, counted) {
    const rec = player.record;
    const todayCount = countsByDay().get(dayKey(new Date())) || 0;
    const goal = state.settings.goal;
    const st = streaks();
    let body;
    if (!counted) {
      body = `<div class="done-hero"><h2>Session ended</h2><p class="tip">Nothing saved. Short on time? Turn on half reps from the Today screen.</p></div>`;
    } else {
      body = `<div class="done-hero">${ICON.check}<h2>${early ? "Good effort" : "Session complete"}</h2>
        <p class="tip">${todayCount >= goal ? `Today's goal done. ${st.cur} day streak.` : `${todayCount} of ${goal} today. ${st.cur} day streak.`}</p></div>
        <div class="stats">
          <div class="stat"><span class="v">${fmtClock(rec.secs)}</span><span class="l">Session time</span></div>
          <div class="stat"><span class="v">${rec.reps}</span><span class="l">Squeezes</span></div>
        </div>
        <section class="card"><div class="section-title">How did that feel?</div>
          <p class="tip">Your answer decides when you move up a level.</p>
          <div class="rate">
            <button data-action="rate" data-value="easy" aria-pressed="${rec.rating === "easy"}">Easy<small>Held every rep</small></button>
            <button data-action="rate" data-value="ok" aria-pressed="${rec.rating === "ok"}">Just right<small>Last reps hard</small></button>
            <button data-action="rate" data-value="hard" aria-pressed="${rec.rating === "hard"}">Too hard<small>Couldn't hold</small></button>
          </div></section>`;
    }
    root.innerHTML = `<div class="player"><div class="player-inner">${body}
      <button class="btn btn-primary btn-block" data-action="close">Done</button></div></div>`;
  }

  // ---------------------------------------------------------------------------
  // Calendar reminder (.ics)
  // ---------------------------------------------------------------------------

  function buildIcs(time) {
    const [hh, mm] = (time || "08:00").split(":");
    const d = new Date();
    const date = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Anchor//Pelvic floor trainer//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:anchor-daily-" + stamp + "@anchor.app",
      "DTSTAMP:" + stamp,
      "DTSTART:" + date + "T" + hh + mm + "00",
      "DURATION:PT10M",
      "RRULE:FREQ=DAILY",
      "SUMMARY:Anchor session",
      "DESCRIPTION:Daily pelvic floor session. Open Anchor and press Start.",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Anchor session", "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR", "",
    ].join("\r\n");
  }

  async function downloadIcs() {
    const data = buildIcs(state.settings.reminder);
    const filename = "anchor-daily-reminder.ics";
    const claude = window.claude;
    if (claude && typeof claude.use === "function") {
      try {
        const downloads = await claude.use("downloads");
        if (downloads) {
          const res = await downloads.save({ filename, data: new Blob([data], { type: "text/calendar" }) });
          if (res && res.status === "saved") toast("Reminder saved. Open it to add to your calendar.");
          return;
        }
      } catch (e) { return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "text/calendar" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function resetAll() {
    const ids = state.sessions.map((s) => s.id);
    state = defaultState();
    state.settings.onboarded = true;
    saveProfile();
    if (remote.ready) ids.forEach((id) => enqueue(() => remote.sessions.doc(id).delete()));
    ui.confirmReset = false;
    toast("Progress reset");
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    switch (a) {
      case "tab":
        ui.tab = el.dataset.tab; ui.confirmReset = false;
        lsSet(LS_UI, JSON.stringify({ tab: ui.tab }));
        render(); window.scrollTo(0, 0); break;
      case "start": startSession(); break;
      case "onboard":
        state.settings.onboarded = true;
        if (+el.dataset.level !== state.level) setLevel(+el.dataset.level); else saveProfile();
        render(); break;
      case "level":
        setLevel(+el.dataset.level);
        toast(`Level ${state.level}: ${LEVELS[state.level - 1].name}`); break;
      case "dismiss":
        state.settings.dismissedAt = state.sessions.length; saveProfile(); render(); break;
      case "set": {
        const k = el.dataset.key, v = el.dataset.value;
        state.settings[k] = k === "goal" ? +v : v;
        saveProfile(); render();
        if (k === "cues" && v === "tones") { unlockAudio(); tone(784, 0.14); tone(440, 0.22, 0.25); }
        if (k === "cues" && v === "voice") speak("Squeeze. Relax.");
        break;
      }
      case "ics": downloadIcs(); break;
      case "reset": ui.confirmReset = true; render(); break;
      case "reset-no": ui.confirmReset = false; render(); break;
      case "reset-yes": resetAll(); break;
      case "pause": togglePause(); break;
      case "skip": skipBlock(1); break;
      case "prev": skipBlock(-1); break;
      case "end":
        if (!player.paused) togglePause();
        player.confirmEnd = true; renderEndConfirm(); break;
      case "end-no": player.confirmEnd = false; renderEndConfirm(); togglePause(); break;
      case "end-yes": finishSession(true); break;
      case "rate":
        if (player.record) {
          player.record.rating = el.dataset.value;
          saveSession(player.record);
          el.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
        }
        break;
      case "close": closePlayer(); break;
    }
  });

  root.addEventListener("change", (e) => {
    const el = e.target;
    const a = el.dataset.action;
    if (a === "short") { state.settings.short = el.checked; saveProfile(); render(); }
    else if (a === "toggle") { state.settings[el.dataset.key] = el.checked; saveProfile(); }
    else if (a === "pick-level") { setLevel(+el.value); toast(`Level ${state.level}: ${LEVELS[state.level - 1].name}`); }
    else if (a === "reminder-time") { state.settings.reminder = el.value || "08:00"; saveProfile(); }
  });

  document.addEventListener("keydown", (e) => {
    if (!player.active || player.finished) return;
    if (e.code === "Space" && e.target === document.body) { e.preventDefault(); togglePause(); }
  });

  render();
  initRemote();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is optional */ });
  }
})();

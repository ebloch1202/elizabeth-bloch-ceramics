// =========================================================
// TRY THE WHEEL — interactive pottery-wheel mini-game
// ---------------------------------------------------------
// A thrown pot is radially symmetric, so the whole shape can
// be described by a single side profile: a radius value at
// each height from base to rim. Dragging the mouse/touch sets
// a target radius at the height under the pointer; that
// profile is drawn mirrored left/right to fill a silhouette.
// Moving too fast builds up a "wobble" meter that collapses
// the piece — the game's only real difficulty knob.
// Only runs on pages that include the .wheel-game markup.
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector(".wheel-game");
  if (!stage) return;

  const canvas = stage.querySelector(".wheel-canvas");
  const ctx = canvas.getContext("2d");

  const startOverlay = stage.querySelector(".wheel-overlay--start");
  const collapsedOverlay = stage.querySelector(".wheel-overlay--collapsed");
  const finishedOverlay = stage.querySelector(".wheel-overlay--finished");
  const startBtn = stage.querySelector(".wheel-start");
  const finishBtn = stage.querySelector(".wheel-finish");
  const resetBtn = stage.querySelector(".wheel-reset");
  const retryBtns = stage.querySelectorAll(".wheel-retry");
  const wobbleFill = stage.querySelector(".wheel-wobble-fill");
  const formNameEl = stage.querySelector(".wheel-form-name");
  const glazeWrap = stage.querySelector(".wheel-glazes");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- geometry / simulation constants ----
  const N = 34; // profile resolution, base -> rim
  const WIDTH = 600; // logical canvas units
  const HEIGHT = 900; // taller than wide, so a finished piece can be lifted
  // clear of the caption/glaze/button panel anchored to the bottom
  const CENTER_X = WIDTH / 2;
  const BASE_Y = HEIGHT * 0.78;
  const TOP_Y = HEIGHT * 0.1;
  const MAX_R = WIDTH * 0.33;
  const MIN_R = 0;
  const BRUSH = 4; // how many neighboring points a drag influences
  const PULL_SPEED = 7; // how fast points chase the drag target
  const SPIN_SPEED = 2.1; // rad/sec at full speed
  const CLAY_COLOR = "#b5734a";
  const PRESENT_SCALE = 0.6; // finished piece shrinks toward its base...
  const PRESENT_LIFT = HEIGHT * 0.18; // ...and rises by this much, so its
  // final base position is fixed regardless of the piece's own height —
  // no need to special-case tall vs. short shapes

  const GLAZES = [
    { name: "Sage", color: "#5f7161" },
    { name: "Amber", color: "#b5793a" },
    { name: "Midnight", color: "#2f4858" },
    { name: "Cream", color: "#e4d9c4" },
  ];

  let points = [];
  let activeTop = 0;
  let state = "idle"; // idle | throwing | finished | collapsed
  let wheelAngle = 0;
  let spin = 0;
  let wobble = 0;
  let isDragging = false;
  let pointerId = null;
  let px = CENTER_X, py = BASE_Y;
  let lastPx = px, lastPy = py;
  let lastFrameTime = null;
  let glazeColor = null;
  let liftShift = 0; // eases up when finished, so the piece clears the bottom panel
  let presentScale = 1; // eases down alongside liftShift while finished

  function yFromIndex(i) {
    return BASE_Y - (BASE_Y - TOP_Y) * (i / (N - 1));
  }

  function indexFromY(y) {
    const t = (BASE_Y - y) / (BASE_Y - TOP_Y);
    return Math.round(t * (N - 1));
  }

  function shade(hex, amt) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + Math.round(255 * amt);
    let g = ((num >> 8) & 0xff) + Math.round(255 * amt);
    let b = (num & 0xff) + Math.round(255 * amt);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function freshLump() {
    const pts = new Array(N).fill(0);
    const lumpTop = Math.floor(N * 0.28);
    for (let i = 0; i <= lumpTop; i++) {
      const t = i / lumpTop;
      pts[i] = Math.sin(t * Math.PI) * WIDTH * 0.16;
    }
    return { pts, top: lumpTop };
  }

  function resetPiece() {
    const lump = freshLump();
    points = lump.pts;
    activeTop = lump.top;
    wobble = 0;
    glazeColor = null;
    isDragging = false;
    glazeWrap.querySelectorAll(".wheel-glaze-swatch").forEach((el) => el.classList.remove("is-selected"));
  }

  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- pointer handling ----
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "throwing") return;
    isDragging = true;
    pointerId = e.pointerId;
    canvas.setPointerCapture(pointerId);
    const p = canvasPoint(e);
    px = lastPx = p.x;
    py = lastPy = p.y;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isDragging || e.pointerId !== pointerId) return;
    const p = canvasPoint(e);
    px = p.x;
    py = p.y;
  });

  function endDrag(e) {
    if (e && e.pointerId !== pointerId) return;
    isDragging = false;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", endDrag);

  // ---- shaping ----
  function shape(dt) {
    if (!isDragging) return;

    const targetIdx = Math.max(0, Math.min(N - 1, indexFromY(py)));
    const targetR = Math.max(MIN_R, Math.min(MAX_R, Math.abs(px - CENTER_X)));

    // pulling the wall up: extend the active height toward the drag point
    if (targetIdx > activeTop) {
      const prevTop = activeTop;
      const prevR = points[prevTop];
      for (let i = prevTop + 1; i <= targetIdx; i++) {
        const t = (i - prevTop) / (targetIdx - prevTop);
        points[i] = prevR + (targetR - prevR) * t;
      }
      activeTop = targetIdx;
    }

    // brush influence around the contact point
    const lo = Math.max(0, targetIdx - BRUSH);
    const hi = Math.min(activeTop, targetIdx + BRUSH);
    for (let j = lo; j <= hi; j++) {
      const falloff = Math.exp(-Math.pow((j - targetIdx) / (BRUSH * 0.6), 2));
      points[j] += (targetR - points[j]) * falloff * Math.min(1, PULL_SPEED * dt);
      points[j] = Math.max(MIN_R, Math.min(MAX_R, points[j]));
    }

    // fast, jerky drags are harder to control
    const dx = px - lastPx, dy = py - lastPy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;
    wobble += Math.max(0, speed - 900) * dt * 0.00035;
    lastPx = px;
    lastPy = py;
  }

  function smoothProfile(passes) {
    for (let p = 0; p < passes; p++) {
      const copy = points.slice();
      for (let i = 1; i < activeTop; i++) {
        points[i] = (copy[i - 1] + copy[i] * 2 + copy[i + 1]) / 4;
      }
    }
  }

  function detectForm() {
    const rimR = points[activeTop];
    let bellyR = 0, bellyIdx = 0;
    for (let i = 0; i <= activeTop; i++) {
      if (points[i] > bellyR) {
        bellyR = points[i];
        bellyIdx = i;
      }
    }
    const heightRatio = activeTop / (N - 1);
    const openness = bellyR > 0 ? rimR / bellyR : 0;

    if (heightRatio < 0.35) return "pinch bowl";
    if (openness > 0.75 && heightRatio < 0.6) return "bowl";
    if (openness < 0.55 && bellyIdx > activeTop * 0.3) return "vase";
    if (Math.abs(rimR - bellyR) < WIDTH * 0.03) return "cup";
    return "vessel";
  }

  // ---- state transitions ----
  function goIdle() {
    state = "idle";
    resetPiece();
    startOverlay.hidden = false;
    collapsedOverlay.hidden = true;
    finishedOverlay.hidden = true;
    finishBtn.hidden = true;
    resetBtn.hidden = true;
  }

  function startThrowing() {
    state = "throwing";
    resetPiece();
    startOverlay.hidden = true;
    collapsedOverlay.hidden = true;
    finishedOverlay.hidden = true;
    finishBtn.hidden = false;
    resetBtn.hidden = false;
  }

  function collapse() {
    if (state !== "throwing") return;
    state = "collapsed";
    isDragging = false;
    collapsedOverlay.hidden = false;
    finishBtn.hidden = true;
    resetBtn.hidden = true;
  }

  function finish() {
    if (state !== "throwing") return;
    state = "finished";
    isDragging = false;
    smoothProfile(2);
    formNameEl.textContent = detectForm();
    finishedOverlay.hidden = false;
    finishBtn.hidden = true;
    resetBtn.hidden = true;
  }

  startBtn.addEventListener("click", startThrowing);
  finishBtn.addEventListener("click", finish);
  resetBtn.addEventListener("click", goIdle);
  retryBtns.forEach((btn) => btn.addEventListener("click", startThrowing));

  // ---- glaze swatches ----
  GLAZES.forEach((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "wheel-glaze-swatch";
    b.style.background = g.color;
    b.setAttribute("aria-label", g.name + " glaze");
    b.addEventListener("click", () => {
      glazeColor = g.color;
      glazeWrap.querySelectorAll(".wheel-glaze-swatch").forEach((el) => el.classList.remove("is-selected"));
      b.classList.add("is-selected");
    });
    glazeWrap.appendChild(b);
  });

  // ---- rendering ----
  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.translate(0, -liftShift);
    ctx.translate(CENTER_X, BASE_Y);
    ctx.scale(presentScale, presentScale);
    ctx.translate(-CENTER_X, -BASE_Y);

    // wheel head
    const wheelR = WIDTH * 0.34;
    ctx.save();
    ctx.translate(CENTER_X, BASE_Y + HEIGHT * 0.045);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.fillStyle = "#c9c2b4";
    ctx.fill();
    ctx.strokeStyle = "rgba(43,39,35,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(wheelAngle);
    ctx.strokeStyle = "rgba(43,39,35,0.22)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * wheelR, Math.sin(a) * wheelR);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // pot silhouette
    if (activeTop > 0) {
      ctx.beginPath();
      ctx.moveTo(CENTER_X - points[0], yFromIndex(0));
      for (let i = 1; i <= activeTop; i++) ctx.lineTo(CENTER_X - points[i], yFromIndex(i));
      for (let i = activeTop; i >= 0; i--) ctx.lineTo(CENTER_X + points[i], yFromIndex(i));
      ctx.closePath();

      const baseColor = glazeColor || CLAY_COLOR;
      const dark = shade(baseColor, -0.35);
      const light = shade(baseColor, 0.28);
      const highlightPos = reducedMotion ? 0.5 : 0.5 + Math.sin(wheelAngle) * 0.28;
      const hp = Math.max(0.05, Math.min(0.95, highlightPos));

      const grad = ctx.createLinearGradient(CENTER_X - MAX_R, 0, CENTER_X + MAX_R, 0);
      grad.addColorStop(0, dark);
      grad.addColorStop(Math.max(0, hp - 0.2), dark);
      grad.addColorStop(hp, light);
      grad.addColorStop(Math.min(1, hp + 0.2), dark);
      grad.addColorStop(1, dark);

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(43,39,35,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // rim opening
      if (points[activeTop] > 10) {
        const rimY = yFromIndex(activeTop);
        const rimRx = points[activeTop] * 0.94;
        const rimRy = rimRx * 0.3;
        ctx.beginPath();
        ctx.ellipse(CENTER_X, rimY, rimRx, rimRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = shade(baseColor, -0.5);
        ctx.fill();
        ctx.strokeStyle = "rgba(43,39,35,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ---- game loop ----
  function frame(ts) {
    if (lastFrameTime == null) lastFrameTime = ts;
    const dt = Math.min(0.05, (ts - lastFrameTime) / 1000);
    lastFrameTime = ts;

    const spinTarget = state === "throwing" ? SPIN_SPEED : 0;
    if (reducedMotion) {
      spin = spinTarget;
    } else {
      spin += (spinTarget - spin) * Math.min(1, dt * 3);
    }
    wheelAngle += spin * dt;

    wobble = Math.max(0, wobble - dt * 0.2);

    if (state === "throwing") {
      shape(dt);
      if (wobble >= 1) collapse();
    }

    if (state === "collapsed") {
      for (let i = 0; i < N; i++) points[i] *= Math.max(0, 1 - dt * 1.8);
    }

    // shrink + lift the finished piece clear of the bottom caption/glaze
    // panel. Both transforms are anchored at the piece's base (BASE_Y), so
    // the base always lands at the same fixed spot on screen regardless of
    // how tall or wide the piece is — no per-shape clearance math needed.
    const liftTarget = state === "finished" ? PRESENT_LIFT : 0;
    const scaleTarget = state === "finished" ? PRESENT_SCALE : 1;
    if (reducedMotion) {
      liftShift = liftTarget;
      presentScale = scaleTarget;
    } else {
      liftShift += (liftTarget - liftShift) * Math.min(1, dt * 4);
      presentScale += (scaleTarget - presentScale) * Math.min(1, dt * 4);
    }

    wobbleFill.style.width = Math.round(Math.min(1, wobble) * 100) + "%";
    wobbleFill.classList.toggle("is-high", wobble > 0.7);

    render();
    requestAnimationFrame(frame);
  }

  sizeCanvas();
  resetPiece();
  requestAnimationFrame(frame);
});

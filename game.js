/* ==========================================================================
   THE GAME — Phase D: core loop, placeholders only
   ==========================================================================

   Everything on screen right now is a coloured rectangle on purpose. This
   phase is about how walking FEELS — speed, scroll, where the camera sits —
   while it is still cheap to change. Real artwork arrives in Phase H.

   Contents:
     1. FEEL      — the numbers worth tuning
     2. LOOK      — placeholder colours and sizes (Phase H replaces this)
     3. LEVEL     — where things sit along the walk
     4. INPUT     — keyboard + on-screen buttons
     5. GAME      — the actual scene
   ========================================================================== */

import kaplay from "https://cdn.jsdelivr.net/npm/kaplay@3001.0.19/dist/kaplay.mjs";


/* 1. FEEL ------------------------------------------------------------------
   These are the dials. Change a number, reload, see how it feels.
   -------------------------------------------------------------------------- */

const FEEL = {
  walkSpeed:    210,   // pixels per second Uno moves
  cameraEase:   0.12,  // 0-1. Lower = camera lags more softly behind Uno
  bobHeight:    3,     // how far Uno bounces while walking (pixels)
  bobSpeed:     9,     // how fast that bounce cycles
  parallaxFar:  0.25,  // how much the far skyline moves vs the camera
  parallaxMid:  0.55,

  // Jump. Higher gravity = snappier, less floaty. These two together decide
  // how high he goes and how long he hangs there.
  jumpSpeed:    430,   // upward push at the moment of take-off
  gravity:      1250,  // pulls him back down, pixels per second per second
};


/* 2. LOOK — PLACEHOLDER ART LAYER ------------------------------------------
   >>> PHASE H: everything in this block gets swapped for real sprites.
   >>> No game logic reads anything below except through these names, so
   >>> replacing them should not require touching sections 3-5.
   -------------------------------------------------------------------------- */

const LOOK = {
  sky:        [ 22,  42,  64],
  skylineFar: [ 30,  54,  78],
  skylineMid: [ 38,  70,  96],
  ground:     [ 46,  40,  38],
  groundLine: [ 92,  78,  66],
  uno:        [235, 230, 220],
  unoAccent:  [ 40,  44,  50],
  landmark:   [201, 162,  39],
};

const SIZE = {
  viewW:      960,   // the game's virtual resolution; it scales to fit
  viewH:      540,
  groundY:    430,   // top edge of the ground
  unoW:       38,
  unoH:       44,
};


/* 3. LEVEL -----------------------------------------------------------------
   A short, flat walk. Landmarks are placeholders for the three stops that
   Phase E turns into real interactions.
   -------------------------------------------------------------------------- */

const LEVEL_END = 4200;

/* The three stops. Copy is taken verbatim from Section 5 of PLAN.md.
   Uno halts at each one; the first arrival opens the modal by itself. */
const STOPS = [
  {
    x: 900,
    label: "1",
    heading: "PRODUCT LAUNCHES",
    copy: "I turn product releases into stories people actually want to engage with.",
    linkText: "View Ask Galileo launch →",
    url: "https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b_today-im-excited-to-announce-ask-galileo-activity-7435346977799770113-F3EY",
  },
  {
    x: 2200,
    label: "2",
    heading: "CUSTOMER STORYTELLING",
    copy: "I turn real customer experiences into credible proof of product value.",
    linkText: "View customer story →",
    url: "https://www.youtube.com/watch?v=RrlLZU-h32s",
  },
  {
    x: 3500,
    label: "3",
    heading: "THOUGHT LEADERSHIP",
    copy: "I work with technical leaders to turn complex ideas into clear, compelling narratives.",
    linkText: "View self-improving software article →",
    url: "https://blog.logrocket.com/introducing-self-improving-software/",
  },
];

// How close Uno has to get before a stop triggers
const STOP_RADIUS = 55;

// Scenery blocks, purely so movement is readable. Not interactive.
const SCENERY = [
  { x:  380, w: 120, h: 150 }, { x:  620, w:  90, h: 210 },
  { x: 1180, w: 140, h: 180 }, { x: 1450, w: 100, h: 130 },
  { x: 1760, w: 120, h: 240 }, { x: 2500, w: 110, h: 160 },
  { x: 2780, w: 150, h: 200 }, { x: 3050, w:  90, h: 140 },
  { x: 3800, w: 130, h: 190 }, { x: 4050, w: 100, h: 150 },
];


/* 4. INPUT -----------------------------------------------------------------
   Both the keyboard and the on-screen buttons write into this one object,
   so the game never needs to care which one the player used.
   -------------------------------------------------------------------------- */

const input = { left: false, right: false, jump: false, interact: false };

// Keyboard state is tracked here rather than read from Kaplay, so that it can
// be force-cleared. Without that, a key held down at the moment the modal
// opens never receives its "released" event and stays stuck on forever.
const keys = { left: false, right: false };

function clearHeldInput() {
  keys.left = keys.right = false;
  input.left = input.right = false;
  input.jump = input.interact = false;
}

function wireKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (modal.isOpen || e.repeat) return;   // the modal has its own keys
    switch (e.key) {
      case "ArrowLeft":  case "a": case "A": keys.left = true;  break;
      case "ArrowRight": case "d": case "D": keys.right = true; break;
      case "ArrowUp":    case "w": case "W": case " ":
        input.jump = true;
        e.preventDefault();   // stop the spacebar scrolling the page
        break;
      case "e": case "E": case "Enter": input.interact = true; break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":  case "a": case "A": keys.left = false;  break;
      case "ArrowRight": case "d": case "D": keys.right = false; break;
    }
  });

  // Switching windows mid-press also swallows the "released" event
  window.addEventListener("blur", clearHeldInput);
}

function wireOnScreenButtons() {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const on  = (e) => { e.preventDefault(); input[key] = true;  };
    const off = (e) => { e.preventDefault(); input[key] = false; };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
  };
  bind("btn-left", "left");
  bind("btn-right", "right");

  // Jump is a one-shot rather than a hold, so it gets its own handler.
  // The game clears the flag once it has acted on it.
  const jump = document.getElementById("btn-jump");
  if (jump) {
    jump.addEventListener("pointerdown", (e) => { e.preventDefault(); input.jump = true; });
  }

  // Re-opens the stop Uno is standing at. One-shot, like jump.
  const interact = document.getElementById("btn-interact");
  if (interact) {
    interact.addEventListener("click", () => { input.interact = true; });
  }
}


/* 4b. THE STOP MODAL -------------------------------------------------------
   Plain HTML rather than drawn into the canvas, so the link is a real link,
   the text can be selected, and screen readers can read it.
   -------------------------------------------------------------------------- */

const modal = {
  root:    null,
  heading: null,
  copy:    null,
  link:    null,
  isOpen:  false,
  lastFocus: null,
};

function initModal() {
  modal.root    = document.getElementById("stop-modal");
  modal.heading = document.getElementById("stop-heading");
  modal.copy    = document.getElementById("stop-copy");
  modal.link    = document.getElementById("stop-link");

  document.getElementById("stop-close").addEventListener("click", closeModal);

  // Clicking the dimmed background closes it, but clicking the card doesn't
  modal.root.addEventListener("click", (e) => {
    if (e.target === modal.root) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.isOpen) closeModal();
  });
}

function openModal(stop) {
  // Whatever was being held when this opened will never report being let go,
  // because the card now covers the buttons and takes keyboard focus.
  clearHeldInput();
  modal.lastFocus = document.activeElement;
  modal.heading.textContent = stop.heading;
  modal.copy.textContent    = stop.copy;
  modal.link.textContent    = stop.linkText;
  modal.link.href           = stop.url;
  modal.root.hidden = false;
  modal.isOpen = true;
  // Send focus into the dialog so keyboard and screen-reader users land here
  document.getElementById("stop-close").focus();
}

function closeModal() {
  modal.root.hidden = true;
  modal.isOpen = false;
  clearHeldInput();   // start walking again from a clean slate
  if (modal.lastFocus) modal.lastFocus.focus();
}

function updateStopCounter(visited, total) {
  const el = document.getElementById("stop-counter");
  if (el) el.textContent = `Stops visited ${visited}/${total}`;
}


/* 5. GAME ------------------------------------------------------------------ */

export function startGame() {
  const canvas = document.getElementById("game-canvas");

  const k = kaplay({
    canvas,
    width: SIZE.viewW,
    height: SIZE.viewH,
    letterbox: true,      // keeps the aspect ratio, adds bars instead of stretching
    background: LOOK.sky,
    global: false,        // keep Kaplay's functions off the global scope
    debug: false,
    crisp: true,          // no smoothing — right look for pixel art later
  });

  // KAPLAY renamed some camera helpers between versions; support both.
  const setCam = k.setCamPos ? (p) => k.setCamPos(p) : (p) => k.camPos(p);

  // --- Parallax bands (drawn behind everything, moved manually) ---
  const far = k.add([
    k.rect(LEVEL_END + SIZE.viewW * 2, 120),
    k.pos(0, SIZE.groundY - 190),
    k.color(...LOOK.skylineFar),
    k.z(0),
  ]);

  const mid = k.add([
    k.rect(LEVEL_END + SIZE.viewW * 2, 90),
    k.pos(0, SIZE.groundY - 120),
    k.color(...LOOK.skylineMid),
    k.z(1),
  ]);

  // --- Ground ---
  k.add([
    k.rect(LEVEL_END + SIZE.viewW * 2, SIZE.viewH - SIZE.groundY),
    k.pos(-SIZE.viewW, SIZE.groundY),
    k.color(...LOOK.ground),
    k.z(2),
  ]);

  k.add([
    k.rect(LEVEL_END + SIZE.viewW * 2, 3),
    k.pos(-SIZE.viewW, SIZE.groundY),
    k.color(...LOOK.groundLine),
    k.z(3),
  ]);

  // --- Scenery blocks ---
  for (const s of SCENERY) {
    k.add([
      k.rect(s.w, s.h),
      k.pos(s.x, SIZE.groundY - s.h),
      k.color(...LOOK.skylineMid),
      k.z(2),
    ]);
  }

  // --- The three stops (placeholder pillars until Phase H) ---
  for (const stop of STOPS) {
    k.add([
      k.rect(14, 110),
      k.pos(stop.x, SIZE.groundY - 110),
      k.color(...LOOK.landmark),
      k.z(4),
    ]);
    k.add([
      k.text(stop.label, { size: 18 }),
      k.pos(stop.x + 7, SIZE.groundY - 132),
      k.anchor("center"),
      k.color(...LOOK.landmark),
      k.z(4),
    ]);
  }

  // Floating "press to look" prompt. Follows Uno, shown only at a stop
  // he has already opened once.
  const prompt = k.add([
    k.text("● to look again", { size: 12 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(...LOOK.uno),
    k.opacity(0),
    k.z(7),
  ]);

  // --- Uno ---
  const uno = k.add([
    k.rect(SIZE.unoW, SIZE.unoH),
    k.pos(120, SIZE.groundY - SIZE.unoH),
    k.color(...LOOK.uno),
    k.anchor("topleft"),
    k.z(5),
  ]);

  // A small dark block so you can tell which way he's facing
  const nose = k.add([
    k.rect(10, 10),
    k.pos(0, 0),
    k.color(...LOOK.unoAccent),
    k.z(6),
  ]);

  let facing = 1;      // 1 = right, -1 = left
  let walkTime = 0;
  let camX = SIZE.viewW / 2;

  // Vertical state. groundLevel is where his feet rest when not jumping.
  const groundLevel = SIZE.groundY - SIZE.unoH;
  let unoY = groundLevel;
  let velY = 0;
  let onGround = true;

  // Stop tracking
  const visited = new Set();
  let currentStop = null;      // the stop Uno is standing at, if any
  const interactBtn = document.getElementById("btn-interact");

  updateStopCounter(0, STOPS.length);

  k.onUpdate(() => {
    const dt = k.dt();

    // --- Which stop, if any, is Uno standing at? ---
    const unoCentre = uno.pos.x + SIZE.unoW / 2;
    currentStop = STOPS.find(s => Math.abs(unoCentre - s.x) < STOP_RADIUS) || null;

    // First arrival opens the modal on its own. This is the whole point:
    // a visitor should never have to know to press anything to see the work.
    if (currentStop && !visited.has(currentStop) && !modal.isOpen) {
      visited.add(currentStop);
      updateStopCounter(visited.size, STOPS.length);
      openModal(currentStop);
    }

    // The interact button only works where there's something to interact with
    if (interactBtn) interactBtn.disabled = !currentStop;

    // Re-opening a stop already seen
    const wantsInteract = input.interact;
    input.interact = false;
    if (wantsInteract && currentStop && !modal.isOpen) openModal(currentStop);

    // The prompt hints at the button, but only once it has a job to do
    prompt.pos.x = uno.pos.x + SIZE.unoW / 2;
    prompt.pos.y = uno.pos.y - 18;
    prompt.opacity = (currentStop && !modal.isOpen) ? 0.85 : 0;

    // While the modal is up, Uno stands still — otherwise he wanders off
    // behind it while the visitor is reading.
    if (modal.isOpen) {
      walkTime = 0;
      return;
    }

    const goLeft  = input.left  || keys.left;
    const goRight = input.right || keys.right;
    const dir = (goRight ? 1 : 0) - (goLeft ? 1 : 0);

    // Move, then clamp to the level so you can't walk off either end
    if (dir !== 0) {
      facing = dir;
      uno.pos.x += dir * FEEL.walkSpeed * dt;
      uno.pos.x = Math.max(40, Math.min(uno.pos.x, LEVEL_END));
      walkTime += dt;
    } else {
      walkTime = 0;
    }

    // --- Jump ---
    // Only launches from the ground, so holding the key can't fly.
    const wantsJump = input.jump;
    input.jump = false;   // one-shot: consumed whether or not it was used

    if (wantsJump && onGround) {
      velY = -FEEL.jumpSpeed;
      onGround = false;
    }

    if (!onGround) {
      velY += FEEL.gravity * dt;
      unoY += velY * dt;

      if (unoY >= groundLevel) {   // landed
        unoY = groundLevel;
        velY = 0;
        onGround = true;
      }
    }

    // Gentle bob while walking so movement reads as walking, not sliding.
    // Suppressed mid-air, where it would look like a twitch.
    const bob = (onGround && dir !== 0)
      ? Math.abs(Math.sin(walkTime * FEEL.bobSpeed)) * FEEL.bobHeight
      : 0;
    uno.pos.y = unoY - bob;

    nose.pos.x = uno.pos.x + (facing === 1 ? SIZE.unoW - 12 : 2);
    nose.pos.y = uno.pos.y + 10;

    // Camera eases toward Uno and stops at the level edges, so he sits
    // centred through the middle of the walk but you still see both ends.
    const half = SIZE.viewW / 2;
    const targetX = Math.max(half, Math.min(uno.pos.x + SIZE.unoW / 2, LEVEL_END - half + 200));
    camX += (targetX - camX) * FEEL.cameraEase;
    setCam(k.vec2(camX, SIZE.viewH / 2));

    // Parallax: the further away a band is, the less it shifts
    far.pos.x = (camX - half) * (1 - FEEL.parallaxFar) - SIZE.viewW;
    mid.pos.x = (camX - half) * (1 - FEEL.parallaxMid) - SIZE.viewW;
  });

  initModal();
  wireKeyboard();
  wireOnScreenButtons();

  // Add ?debug to the URL to read the walk position from the browser console.
  // Handy for tuning the numbers in FEEL. Off for normal visitors.
  if (new URLSearchParams(location.search).has("debug")) {
    window.unoX = () => Math.round(uno.pos.x);
    window.camX = () => Math.round(camX);
    window.unoY = () => Math.round(unoY);
    window.onGround = () => onGround;
  }
}

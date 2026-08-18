/* ==========================================================================
   THE GAME
   ==========================================================================

   Uno walks a short stretch of Boston. Three stops along the way each open a
   card with one piece of Matt's work; bones are scattered about for charm.

   Artwork lives in assets/sprites. Uno and the bone were drawn separately;
   the cobblestone and sky were cut out of the In-Game-Experience painting and
   mirrored so they repeat seamlessly. The buildings are still plain shapes —
   the painting has no clean way to cut individual ones out.

   Contents:
     1. FEEL      — the numbers worth tuning
     2. LOOK      — colours for the shapes that are still drawn in code
     3. LEVEL     — where things sit along the walk
     4. INPUT     — keyboard + on-screen buttons
     4b/4c        — the stop card and the ending screen
     5. GAME      — loading the art, then the scene and the frame loop
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
  parallaxSky:  0.10,  // the sky barely moves — it is furthest away
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
  // Sampled from the painting so the drawn shapes sit with the artwork
  sky:        [103, 164, 198],   // matches the bottom of the sky image
  skylineFar: [ 75, 111, 133],
  skylineMid: [ 52,  82, 104],
  ground:     [ 38,  34,  32],
  uno:        [235, 230, 220],
  landmark:   [201, 162,  39],
};

const SIZE = {
  viewW:      960,   // the game's virtual resolution; it scales to fit
  viewH:      540,
  groundY:    430,   // top edge of the ground

  // Uno's drawn size comes from the sprite files. unoHitW is deliberately
  // narrower than the picture — the running pose is long and mostly tail,
  // and collecting a bone should mean touching him, not passing near him.
  unoH:       84,    // running sprite height
  unoHitW:    72,
};

// Sizes of the artwork files, so the tiling maths stays honest
const GROUND_TILE_W = 380;
const GROUND_TILE_H = 42;
const SKY_TILE_W    = 712;

const START_X = 120;   // where Uno begins the walk


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

// Walk past this and the ending screen appears. Sits just short of the wall
// so Uno comes to rest rather than jamming against the edge.
const ENDING_X = LEVEL_END - 60;

/* Bones. Purely cosmetic — nothing in the game depends on how many you get,
   and there is no way to lose. `high: true` puts one above head height so
   the jump has something to do; the rest sit at walking height.
   Kept clear of the three stops so nothing overlaps a pillar. */
const BONES = [
  { x:  200 }, { x:  340 }, { x:  430, high: true }, { x:  560 },
  { x:  760, high: true }, { x: 1080 }, { x: 1240 }, { x: 1420, high: true },
  { x: 1620 }, { x: 1880, high: true }, { x: 2440 }, { x: 2620 },
  { x: 2780, high: true }, { x: 2960 }, { x: 3120, high: true }, { x: 3620 },
  { x: 3720 }, { x: 3880 }, { x: 4000, high: true }, { x: 4040 },
];

const BONE_Y_GROUND = 28;   // pixels above the ground
const BONE_Y_HIGH   = 96;   // needs a jump; peak clearance is ~116

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
    // While a card is up it owns the keyboard — otherwise space would both
    // jump and press whatever button has focus.
    if (modal.isOpen || ending.isOpen || e.repeat) return;
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
  if (el) el.textContent = `Stops ${visited}/${total}`;
}

function updateBoneCounter(collected, total) {
  const el = document.getElementById("bone-counter");
  if (!el) return;
  el.textContent = `🦴 ${collected}/${total}`;
  // Brief pulse so a pickup is felt as well as counted
  el.classList.remove("hud__item--pop");
  void el.offsetWidth;            // forces the browser to restart the animation
  el.classList.add("hud__item--pop");
}


/* 4c. THE ENDING SCREEN ----------------------------------------------------
   Shown when Uno reaches the end of the walk. Repeats all three pieces of
   work, so nobody can finish the game without the work having been put in
   front of them, then hands off to the full portfolio.
   -------------------------------------------------------------------------- */

const ending = { root: null, isOpen: false, lastFocus: null };

function initEnding() {
  ending.root = document.getElementById("ending");

  // Build the three work links from the same STOPS data the stops use,
  // so the copy and URLs can never drift apart.
  const list = document.getElementById("ending-list");
  for (const stop of STOPS) {
    const li = document.createElement("li");
    li.className = "ending__item";

    const label = document.createElement("span");
    label.className = "ending__label";
    label.textContent = stop.heading;

    const link = document.createElement("a");
    link.className = "ending__link";
    link.href = stop.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = stop.linkText;

    li.append(label, link);
    list.append(li);
  }

  document.getElementById("ending-dismiss").addEventListener("click", closeEnding);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ending.isOpen) closeEnding();
  });
}

function openEnding(bonesCollected, bonesTotal) {
  clearHeldInput();

  // Bones are charm only, so this is a remark, never a score to beat.
  const bonesLine = document.getElementById("ending-bones");
  if (bonesLine && typeof bonesCollected === "number") {
    bonesLine.textContent = bonesCollected === bonesTotal
      ? `🦴 Every single bone — all ${bonesTotal} of them. Uno is thrilled.`
      : `🦴 ${bonesCollected} of ${bonesTotal} bones collected`;
    bonesLine.hidden = false;
  }

  ending.lastFocus = document.activeElement;
  ending.root.hidden = false;
  ending.isOpen = true;
  document.getElementById("ending-portfolio").focus();
}

function closeEnding() {
  ending.root.hidden = true;
  ending.isOpen = false;
  clearHeldInput();
  if (ending.lastFocus) ending.lastFocus.focus();
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
    crisp: true,          // no smoothing between pixels
  });

  // KAPLAY renamed some camera helpers between versions; support both.
  const setCam = k.setCamPos ? (p) => k.setCamPos(p) : (p) => k.camPos(p);

  // Artwork. Nothing can be drawn until these have downloaded, so the scene
  // is built inside onLoad rather than straight away.
  k.loadSprite("uno-run", "assets/sprites/uno-run.png");
  k.loadSprite("uno-sit", "assets/sprites/uno-sit.png");
  k.loadSprite("bone",    "assets/sprites/bone.png");
  k.loadSprite("ground",  "assets/sprites/ground.png");
  k.loadSprite("sky",     "assets/sprites/sky.png");

  k.onLoad(() => buildScene(k, setCam));
}


function buildScene(k, setCam) {

  /* --- Backdrop ------------------------------------------------------- */

  // Sky band, repeated across the level and drifting slowly for depth.
  // Enough tiles to cover the screen twice over, then wrapped each frame.
  const skyCount = Math.ceil(SIZE.viewW / SKY_TILE_W) + 2;
  const skyTiles = [];
  for (let i = 0; i < skyCount; i++) {
    skyTiles.push(k.add([
      k.sprite("sky"),
      k.pos(i * SKY_TILE_W, 0),
      k.z(0),
    ]));
  }

  // Distant and mid building silhouettes, still simple shapes — the painting
  // has no clean way to cut individual buildings out.
  const far = k.add([
    k.rect(LEVEL_END + SIZE.viewW * 3, 120),
    k.pos(0, SIZE.groundY - 190),
    k.color(...LOOK.skylineFar),
    k.z(1),
  ]);

  const mid = k.add([
    k.rect(LEVEL_END + SIZE.viewW * 3, 90),
    k.pos(0, SIZE.groundY - 120),
    k.color(...LOOK.skylineMid),
    k.z(2),
  ]);

  for (const s of SCENERY) {
    k.add([
      k.rect(s.w, s.h),
      k.pos(s.x, SIZE.groundY - s.h),
      k.color(...LOOK.skylineMid),
      k.z(2),
    ]);
  }

  /* --- Ground --------------------------------------------------------- */

  // Fill below the cobblestone so the bottom of the screen is never empty
  k.add([
    k.rect(LEVEL_END + SIZE.viewW * 3, SIZE.viewH),
    k.pos(-SIZE.viewW, SIZE.groundY + GROUND_TILE_H - 2),
    k.color(...LOOK.ground),
    k.z(2),
  ]);

  // The cobblestone strip, laid end to end along the whole walk
  const firstTile = -SIZE.viewW;
  const tilesNeeded = Math.ceil((LEVEL_END + SIZE.viewW * 3) / GROUND_TILE_W);
  for (let i = 0; i < tilesNeeded; i++) {
    k.add([
      k.sprite("ground"),
      k.pos(firstTile + i * GROUND_TILE_W, SIZE.groundY),
      k.z(3),
    ]);
  }

  /* --- Stops ---------------------------------------------------------- */

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

  /* --- Bones ---------------------------------------------------------- */

  const bones = BONES.map(b => {
    const y = SIZE.groundY - (b.high ? BONE_Y_HIGH : BONE_Y_GROUND);
    return {
      x: b.x,
      y,
      collected: false,
      obj: k.add([
        k.sprite("bone"),
        k.pos(b.x, y),
        k.anchor("center"),
        k.z(5),
      ]),
    };
  });

  let bonesCollected = 0;

  /* --- Uno ------------------------------------------------------------ */

  // Two sprites, one shown at a time. Both anchored at the bottom centre so
  // his feet land on the same line whichever pose is showing.
  const unoRun = k.add([
    k.sprite("uno-run"),
    k.pos(START_X, SIZE.groundY),
    k.anchor("bot"),
    k.z(6),
  ]);

  const unoSit = k.add([
    k.sprite("uno-sit"),
    k.pos(START_X, SIZE.groundY),
    k.anchor("bot"),
    k.opacity(0),
    k.z(6),
  ]);

  const prompt = k.add([
    k.text("● to look again", { size: 12 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(...LOOK.uno),
    k.opacity(0),
    k.z(7),
  ]);

  /* --- State ---------------------------------------------------------- */

  let posX = START_X;              // Uno's centre
  let feetY = SIZE.groundY;        // where his paws are
  let velY = 0;
  let onGround = true;
  let facing = 1;
  let walkTime = 0;
  let camX = SIZE.viewW / 2;

  const visited = new Set();
  let currentStop = null;
  let endingShown = false;
  let atEnd = false;
  const interactBtn = document.getElementById("btn-interact");

  updateStopCounter(0, STOPS.length);
  updateBoneCounter(0, bones.length);

  /* --- Frame ---------------------------------------------------------- */

  k.onUpdate(() => {
    const dt = k.dt();

    // Bone pickups. Measured against a box narrower than the drawing, so
    // collecting feels fair rather than magnetic.
    const bodyMidY = feetY - SIZE.unoH / 2;
    for (const bone of bones) {
      if (bone.collected) continue;
      const closeX = Math.abs(bone.x - posX) < SIZE.unoHitW / 2 + 12;
      const closeY = Math.abs(bone.y - bodyMidY) < SIZE.unoH / 2 + 14;
      if (closeX && closeY) {
        bone.collected = true;
        k.destroy(bone.obj);
        bonesCollected += 1;
        updateBoneCounter(bonesCollected, bones.length);
      }
    }

    currentStop = STOPS.find(s => Math.abs(posX - s.x) < STOP_RADIUS) || null;
    atEnd = posX >= ENDING_X;

    if (atEnd && !endingShown && !modal.isOpen && !ending.isOpen) {
      endingShown = true;
      openEnding(bonesCollected, bones.length);
    }

    // First arrival opens the modal on its own. This is the whole point:
    // a visitor should never have to know to press anything to see the work.
    if (currentStop && !visited.has(currentStop) && !modal.isOpen) {
      visited.add(currentStop);
      updateStopCounter(visited.size, STOPS.length);
      openModal(currentStop);
    }

    // Interact works at a stop, and at the end to see the wrap-up again
    if (interactBtn) interactBtn.disabled = !(currentStop || atEnd);

    const wantsInteract = input.interact;
    input.interact = false;
    if (wantsInteract && !modal.isOpen && !ending.isOpen) {
      if (currentStop) openModal(currentStop);
      else if (atEnd) openEnding(bonesCollected, bones.length);
    }

    prompt.pos.x = posX;
    prompt.pos.y = feetY - SIZE.unoH - 16;
    prompt.opacity = ((currentStop || atEnd) && !modal.isOpen && !ending.isOpen) ? 0.85 : 0;

    // While a card is up, Uno stands still — otherwise he wanders off
    // behind it while the visitor is reading.
    if (modal.isOpen || ending.isOpen) {
      walkTime = 0;
      unoRun.opacity = atEnd && onGround ? 0 : 1;
      unoSit.opacity = atEnd && onGround ? 1 : 0;
      return;
    }

    const goLeft  = input.left  || keys.left;
    const goRight = input.right || keys.right;
    const dir = (goRight ? 1 : 0) - (goLeft ? 1 : 0);

    if (dir !== 0) {
      facing = dir;
      posX += dir * FEEL.walkSpeed * dt;
      posX = Math.max(SIZE.unoHitW / 2 + 20, Math.min(posX, LEVEL_END));
      walkTime += dt;
    } else {
      walkTime = 0;
    }

    // --- Jump: only launches from the ground, so holding a key can't fly ---
    const wantsJump = input.jump;
    input.jump = false;

    if (wantsJump && onGround) {
      velY = -FEEL.jumpSpeed;
      onGround = false;
    }

    if (!onGround) {
      velY += FEEL.gravity * dt;
      feetY += velY * dt;
      if (feetY >= SIZE.groundY) {
        feetY = SIZE.groundY;
        velY = 0;
        onGround = true;
      }
    }

    const bob = (onGround && dir !== 0)
      ? Math.abs(Math.sin(walkTime * FEEL.bobSpeed)) * FEEL.bobHeight
      : 0;

    // He sits once he has arrived and stopped moving
    const sitting = atEnd && onGround && dir === 0;
    unoRun.opacity = sitting ? 0 : 1;
    unoSit.opacity = sitting ? 1 : 0;

    unoRun.pos.x = posX;
    unoRun.pos.y = feetY - bob;
    unoRun.flipX = facing === -1;

    unoSit.pos.x = posX;
    unoSit.pos.y = feetY;
    unoSit.flipX = facing === -1;

    // Camera eases toward Uno and stops at the level edges
    const half = SIZE.viewW / 2;
    const targetX = Math.max(half, Math.min(posX, LEVEL_END - half + 200));
    camX += (targetX - camX) * FEEL.cameraEase;
    setCam(k.vec2(camX, SIZE.viewH / 2));

    // Parallax: the further away a layer is, the less it shifts
    const drift = (camX - half);
    far.pos.x = drift * (1 - FEEL.parallaxFar) - SIZE.viewW;
    mid.pos.x = drift * (1 - FEEL.parallaxMid) - SIZE.viewW;

    // The sky drifts slowest of all, and wraps so it never runs out
    const skyShift = drift * (1 - FEEL.parallaxSky);
    for (let i = 0; i < skyTiles.length; i++) {
      const base = skyShift + i * SKY_TILE_W;
      const span = SKY_TILE_W * skyTiles.length;
      // keep each tile within one span of the camera
      let x = base - Math.floor((base - (camX - half - SKY_TILE_W)) / span) * span;
      skyTiles[i].pos.x = x;
    }
  });

  initModal();
  initEnding();
  wireKeyboard();
  wireOnScreenButtons();

  // Add ?debug to the URL to read the walk position from the browser console.
  if (new URLSearchParams(location.search).has("debug")) {
    window.unoX = () => Math.round(posX);
    window.camX = () => Math.round(camX);
    window.unoY = () => Math.round(feetY);
    window.onGround = () => onGround;
  }
}

/* ==========================================================================
   THE GAME
   ==========================================================================

   Uno walks a short stretch of Boston. Three stops along the way each open a
   card with one piece of Matt's work; bones are scattered about for charm.

   Artwork lives in assets/sprites. Uno (running, sitting, leaping) and the
   bone were drawn separately. The city backdrop is a single painting that
   repeats and drifts slowly behind the action. The cobblestone was cut from
   the In-Game-Experience painting and mirrored so it repeats seamlessly.

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
  parallaxBg:   0.45,  // how much the city drifts vs the camera. Lower =
                       // further away. Raise it and the city rushes past.

  // Jump. Higher gravity = snappier, less floaty. These two together decide
  // how high he goes and how long he hangs there.
  jumpSpeed:    430,   // upward push at the moment of take-off
  gravity:      1250,  // pulls him back down, pixels per second per second
};


/* 2. LOOK ------------------------------------------------------------------
   Only a few things are still drawn as plain shapes: the fill below the
   cobblestone, and the stop markers. Everything else is artwork now.
   -------------------------------------------------------------------------- */

const LOOK = {
  // Sampled from the painting so the drawn shapes sit with the artwork
  sky:        [103, 164, 198],   // matches the bottom of the sky image
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
const HYDRANT_H     = 84;    // height of hydrant.png
const GROUND_TILE_W = 380;
const GROUND_TILE_H = 42;
const BG_TILE_W     = 1089;  // width of boston-bg.jpg

const START_X = 120;   // where Uno begins the walk


/* 3. LEVEL -----------------------------------------------------------------
   A short, flat walk with three stops along it.
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
  k.loadSprite("uno-run",  "assets/sprites/uno-run.png");
  k.loadSprite("uno-sit",  "assets/sprites/uno-sit.png");
  k.loadSprite("uno-jump", "assets/sprites/uno-jump.png");
  k.loadSprite("bone",     "assets/sprites/bone.png");
  k.loadSprite("hydrant",  "assets/sprites/hydrant.png");
  k.loadSprite("ground",   "assets/sprites/ground.png");
  k.loadSprite("bg",       "assets/sprites/boston-bg.jpg");

  k.onLoad(() => buildScene(k, setCam));
}


function buildScene(k, setCam) {

  /* --- Backdrop ------------------------------------------------------- */

  // The painted Boston skyline, carrying its own sky. It is narrower than the
  // walk, so it repeats and drifts slower than the ground for depth — you
  // pass Fenway about twice over the whole walk, which is normal for a
  // side-scroller. Enough tiles to cover the screen, then wrapped each frame.
  const bgCount = Math.ceil(SIZE.viewW / BG_TILE_W) + 2;
  const bgTiles = [];
  for (let i = 0; i < bgCount; i++) {
    bgTiles.push(k.add([
      k.sprite("bg"),
      k.pos(i * BG_TILE_W, 0),
      k.z(0),
    ]));
  }

  /* --- Ground --------------------------------------------------------- */

  // The cobblestone strip, laid end to end along the whole walk. It scrolls
  // at full speed under Uno's feet, while the painted walkway behind it
  // drifts with the rest of the city.
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

  // Each stop is a fire hydrant — the one street object nobody questions a
  // dog stopping at. The hydrant itself stays planted; the number above it
  // bobs, because a floating marker is what actually catches the eye against
  // a busy painted background.
  const stopMarkers = STOPS.map(stop => ({
    stop,
    hydrant: k.add([
      k.sprite("hydrant"),
      k.pos(stop.x, SIZE.groundY),
      k.anchor("bot"),
      k.z(4),
    ]),
    label: k.add([
      k.text(stop.label, { size: 16 }),
      k.pos(stop.x, SIZE.groundY - HYDRANT_H - 18),
      k.anchor("center"),
      k.color(...LOOK.landmark),
      k.z(4),
    ]),
  }));

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

  const unoJump = k.add([
    k.sprite("uno-jump"),
    k.pos(START_X, SIZE.groundY),
    k.anchor("bot"),
    k.opacity(0),
    k.z(6),
  ]);

  // Only ever one pose visible at a time
  const showPose = (which) => {
    unoRun.opacity  = which === "run"  ? 1 : 0;
    unoSit.opacity  = which === "sit"  ? 1 : 0;
    unoJump.opacity = which === "jump" ? 1 : 0;
  };

  // All three poses share a position, so they only need setting in one place.
  // The bob is only applied to the running pose — a sitting dog shouldn't bounce.
  let bobOffset = 0;
  const placeUno = () => {
    for (const s of [unoRun, unoSit, unoJump]) {
      s.pos.x = posX;
      s.pos.y = feetY;
      s.flipX = facing === -1;
    }
    unoRun.pos.y = feetY - bobOffset;
  };

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

    // Numbers float above their hydrant, and fade once that stop has been
    // read, so it is obvious at a glance which ones are still waiting.
    const t = k.time();
    for (const m of stopMarkers) {
      m.label.pos.y = SIZE.groundY - HYDRANT_H - 18 + Math.sin(t * 2.2) * 4;
      m.label.opacity = visited.has(m.stop) ? 0.35 : 1;
    }
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

    // While a card is up, Uno stops walking — otherwise he wanders off behind
    // it while the visitor is reading. He still finishes any jump he was in
    // the middle of, though, rather than hanging in the air until dismissed.
    if (modal.isOpen || ending.isOpen) {
      walkTime = 0;
      bobOffset = 0;

      if (!onGround) {
        velY += FEEL.gravity * dt;
        feetY += velY * dt;
        if (feetY >= SIZE.groundY) {
          feetY = SIZE.groundY;
          velY = 0;
          onGround = true;
        }
      }

      showPose(onGround ? "sit" : "jump");
      placeUno();
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

    bobOffset = (onGround && dir !== 0)
      ? Math.abs(Math.sin(walkTime * FEEL.bobSpeed)) * FEEL.bobHeight
      : 0;

    // Mid-air he uses the leaping pose. Standing still at a marker or at the
    // end of the walk, he sits down. Otherwise he is running.
    if (!onGround) {
      showPose("jump");
    } else if (dir === 0 && (currentStop || atEnd)) {
      showPose("sit");
    } else {
      showPose("run");
    }

    placeUno();

    // Camera eases toward Uno and stops at the level edges
    const half = SIZE.viewW / 2;
    const targetX = Math.max(half, Math.min(posX, LEVEL_END - half + 200));
    camX += (targetX - camX) * FEEL.cameraEase;
    setCam(k.vec2(camX, SIZE.viewH / 2));

    // Parallax: the backdrop drifts slower than the ground, so the city
    // feels further away. Tiles wrap around the camera so it never runs out.
    const drift = camX - half;
    const bgShift = drift * (1 - FEEL.parallaxBg);
    const span = BG_TILE_W * bgTiles.length;
    const leftEdge = camX - half - BG_TILE_W;
    for (let i = 0; i < bgTiles.length; i++) {
      const base = bgShift + i * BG_TILE_W;
      bgTiles[i].pos.x = base - Math.floor((base - leftEdge) / span) * span;
    }
  });

  initModal();
  initEnding();
  wireKeyboard();
  wireOnScreenButtons();

  // Add ?debug to the URL to read the walk position from the browser console.
  if (new URLSearchParams(location.search).has("debug")) {
    window.pose = () => unoJump.opacity ? "jump" : unoSit.opacity ? "sit" : "run";
    window.unoX = () => Math.round(posX);
    window.camX = () => Math.round(camX);
    window.unoY = () => Math.round(feetY);
    window.onGround = () => onGround;
  }
}

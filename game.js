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

const LANDMARKS = [
  { x:  900, label: "1" },
  { x: 2200, label: "2" },
  { x: 3500, label: "3" },
];

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

const input = { left: false, right: false, jump: false };

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

  // Phase E gives this a job: opening the modal for a stop.
  const interact = document.getElementById("btn-interact");
  if (interact) interact.addEventListener("click", () => {});
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

  // --- Landmarks: placeholders for the three stops (Phase E) ---
  for (const m of LANDMARKS) {
    k.add([
      k.rect(14, 110),
      k.pos(m.x, SIZE.groundY - 110),
      k.color(...LOOK.landmark),
      k.z(4),
    ]);
    k.add([
      k.text(m.label, { size: 18 }),
      k.pos(m.x + 7, SIZE.groundY - 132),
      k.anchor("center"),
      k.color(...LOOK.landmark),
      k.z(4),
    ]);
  }

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

  k.onUpdate(() => {
    const dt = k.dt();

    const goLeft  = input.left  || k.isKeyDown("left")  || k.isKeyDown("a");
    const goRight = input.right || k.isKeyDown("right") || k.isKeyDown("d");
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
    const wantsJump = input.jump
      || k.isKeyPressed("up")
      || k.isKeyPressed("w")
      || k.isKeyPressed("space");
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

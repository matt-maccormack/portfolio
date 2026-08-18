# PLAN.md — Matt's Portfolio: The Game

> This document is the source of truth for this project. Read it fully before writing any code. If anything here is ambiguous, ask me before making architectural decisions — do not improvise structure, dependencies, or scope.

---

## 0\. Who I am and what this is

I'm Matt, a marketer (product storytelling, creative campaigns, making complex tech interesting). This site is my portfolio, and the site itself is meant to be evidence of my creativity and hands-on AI/technical fluency.

**I am not a developer.** I have limited vibe-coding experience. Optimize every decision for:

- **Simplicity** — the fewest moving parts that achieve the goal.  
- **Readability** — when something breaks, I need to describe it in plain English and have you fix it. Prefer boring, standard, well-trodden patterns over clever ones.  
- **Shippability** — a working, charming, done site beats an ambitious, half-broken one.

If you're ever choosing between "impressive but complex" and "simple but solid," choose simple. Ask me before adding any dependency, tool, or abstraction not named in this document.

---

## 1\. The concept

The site has two ways to explore my work:

1. **Interactive game — homepage `/`** — Visitors follow my sheepadoodle, Uno, on a short side-scrolling walk through a pixel-art Boston. Along the way there are three "stops" where Uno sits and a small modal shows one piece of my work.  
2. **Traditional portfolio — `/portfolio`** — A clean, simple, polished page with the same work, for people who want to skip the game.

The game demonstrates creativity and experimentation. The traditional portfolio proves the actual marketing work. **Both must stand on their own.**

**Guiding principle:** Keep the experience simple, charming, fast, and *optional*. This is a side-scrolling interactive webpage, NOT a complex video game. No levels, no enemies, no physics engine, no accounts, no database, no backend, no CMS.

---

## 2\. Tech stack — DECIDED, do not change without asking

- **Plain static site**: HTML, CSS, and JavaScript. **No framework** (no React, no Next.js, no build step, no bundler).  
- **Game library**: **Kaplay** (the maintained successor to Kaboom.js), loaded for the game page only. Use it for the game loop, sprites, collision, and input so we are not hand-writing a game engine. Load it via CDN — no npm build pipeline.  
- **Hosting**: Vercel, deploying a static site directly from a GitHub repo.  
- **Source control**: GitHub.

Rationale: this keeps the whole project as a small set of files I can open, preview by double-clicking, and reason about. No compilation, minimal that-can-break surface area.

If at any point you believe a framework or build step is genuinely necessary, STOP and explain why in plain English before doing it.

---

## 3\. File structure — keep it this flat

```
/
├── index.html          # the game (homepage)
├── portfolio.html      # the traditional portfolio
├── styles.css          # shared styles
├── game.js             # all game logic (Kaplay)
├── /assets             # images, sprites, the title-screen art
└── PLAN.md             # this file
```

Adjust only if there's a real reason, and tell me if so. `/portfolio` should resolve to `portfolio.html` on Vercel — configure that cleanly (e.g. via file naming or a minimal `vercel.json` if needed, but keep config to the absolute minimum).

---

## 4\. Build order — follow this sequence exactly

Build in phases. **At the end of each phase, stop and let me preview it before moving on.** Do not race ahead to later phases.

### Phase A — Portfolio page first (`portfolio.html`)

This is the highest-stakes page and my fallback. Build and polish it before touching the game. Content is in Section 7\. When done, I preview it in the browser.

### Phase B — GitHub \+ Vercel

Once the portfolio works locally:

1. Initialize a git repo and push to GitHub (walk me through anything I need to click).  
2. Help me connect the repo to Vercel for auto-deploy on the free tier. We prove the full pipeline (code → GitHub → live URL) while the project is still simple.

### Phase C — Opening/title screen (`index.html`)

Intro copy \+ two buttons \+ credit line (Section 6). This is mostly a static screen with the title-screen image as background. No game logic yet.

### Phase D — Game core loop (PLACEHOLDERS ONLY)

Using **colored rectangles, no art**:

- A short, flat, single level. Walk left and right. No enemies.  
- Uno can jump (up arrow / W / space, or the ▲ button). Added 18 Aug 2026 — see the amendment note at the bottom of this file.  
- Uno stays roughly centered; the world scrolls past him.  
- Keyboard controls (arrow keys / A-D) **and** on-screen click buttons (◀ ▶ and an interact button).  
- Get the *feel* right — smooth movement, sensible scroll speed — before any art exists. **Do not add art in this phase.** We lock the mechanics first.

### Phase E — Stops \+ modals

- Three stops at fixed positions along the level (Section 5).  
- When Uno reaches a stop, he stops/sits and an interact prompt appears.  
- **The modal opens automatically the first time Uno reaches each stop** (amended 18 Aug 2026). Recruiters are not gamers, and the whole point of the game is that they see the work — a discretionary button press is where people fall off. On any later visit to the same stop it does not auto-open; the prompt appears and interact re-opens it.  
- Pressing interact (keyboard or button) opens a simple modal for that stop.  
- Each modal has a headline, a line of copy, and a link that opens the real work **in a new tab**.  
- A small "stops visited 0/3" indicator, so visitors know how many there are.

### Phase F — Bones (charm only)

- Collectible bones/biscuits scattered along the walk.  
- A counter in the corner (e.g. `🦴 3 / 20`) increments on pickup.  
- **Purely cosmetic** — nothing depends on the count. No win/lose logic.

### Phase G — Ending screen

- After the third stop, Uno reaches the end and sits.  
- Show: "Thanks for playing\!", optionally the bones count, and a button **"View Matt's full portfolio →"** linking to `/portfolio`.  
- **Also list all three pieces of work with their links** (amended 18 Aug 2026). This is the safety net: nobody reaches the end without the work having been put in front of them at least once.  
- No contact section anywhere.

### Phase H — Art swap

- Replace placeholder rectangles with real art assets (see Section 8).  
- Structure the code so art lives in a clearly-marked, easily-swappable layer, so dropping art in doesn't touch game logic.

### Phase I — Polish

- On phones: do NOT try to make the game playable. Detect small screens and show a short friendly message routing visitors to `/portfolio` instead. The game is a desktop experience by design.  
- Final pass: check every link works and opens correctly, tighten spacing, confirm it's fast.

---

## 5\. Game stops — exact content

Three stops, in this order. Each modal opens its link in a **new tab**.

**Stop 1 — Product Launches**

> **PRODUCT LAUNCHES** I turn product releases into stories people actually want to engage with. **View Ask Galileo launch →** Link: [https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b\_today-im-excited-to-announce-ask-galileo-activity-7435346977799770113-F3EY](https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b_today-im-excited-to-announce-ask-galileo-activity-7435346977799770113-F3EY)

**Stop 2 — Customer Storytelling**

> **CUSTOMER STORYTELLING** I turn real customer experiences into credible proof of product value. **View customer story →** Link: [https://www.youtube.com/watch?v=RrlLZU-h32s](https://www.youtube.com/watch?v=RrlLZU-h32s)

**Stop 3 — Thought Leadership**

> **THOUGHT LEADERSHIP** I work with technical leaders to turn complex ideas into clear, compelling narratives. **View self-improving software article →** Link: [https://blog.logrocket.com/introducing-self-improving-software/](https://blog.logrocket.com/introducing-self-improving-software/)

---

## 6\. Opening screen — exact content

- **Title:** Matt's Portfolio: The Game  
- **Intro copy:**  
    
  > Hi, I'm Matt. I'm a marketer focused on product storytelling, creative campaigns, and making complex technology interesting. I built this little Boston adventure as a different way to explore some of my work.  
    
- **Primary button:** ▶ Play the game  
- **Secondary button:** Just show me the portfolio → (links to `/portfolio`)  
- **Credit line (subtle, small):** Built with Claude Code · ChatGPT · GitHub · Vercel

A title-screen art image will be provided (see Section 8). Design this screen so that image can sit behind the text/buttons, matching the look-book.

---

## 7\. Traditional portfolio page — content

Keep it **deliberately simple, clean, and polished**. A single scrollable page. No game elements. This is for recruiters and hiring managers.

Sections, in order:

1. **About** — short intro. `Hi, I’m Matt. I’m a marketer focused on product storytelling, creative campaigns, and making complex technology interesting. I built this little Boston adventure as a different way to explore some of my work.`  
     
2. **Product Launches**  
     
   - Headline: Product Launches  
   - Blurb: I turn product releases into stories people actually want to engage with. I produce and project managed launch videos, building the positioning narrative, writing storyboards, and directing designers and freelance video vendors through delivery.  
   - Links (all open in a new tab)  
     - LogRocket: [Ask Galileo](https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b_today-im-excited-to-announce-ask-galileo-activity-7435346977799770113-F3EY?utm_source=share&utm_medium=member_desktop&rcm=ACoAABaTwB8BqdWWD6uVP81NHR9W4bpxx3EFhlQ)  
       - Communicating the story of LogRocket’s new AI-powered chat functionality. Achieved 119,000 impressions and 3,800+ engagements.  
* LogRocket: [Self-Improving Software](https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b_your-ai-coding-agents-are-amazing-so-why-activity-7475183877443973120-MRDf?utm_source=share&utm_medium=member_desktop&rcm=ACoAABaTwB8BqdWWD6uVP81NHR9W4bpxx3EFhlQ)  
  * Defining LogRocket’s positioning as a driver of “self-improving software”, where LogRocket’s Galileo AI can automatically dispatch issues to agents in Cursor and Claude Code.  
* LogRocket: [MCP](https://www.linkedin.com/posts/matthew-arbesfeld-04b5429b_super-excited-to-announce-one-of-our-biggest-activity-7467580375381381120-TCbm?utm_source=share&utm_medium=member_desktop&rcm=ACoAABaTwB8BqdWWD6uVP81NHR9W4bpxx3EFhlQ)  
  * Amplifying the LogRocket MCP, which gives your agents “sight” into the digital experience of your users by connecting it to insights from Galileo AI.


3. **Customer Storytelling**  
     
   - Headline: Customer Storytelling  
   - Blurb: I turn real customer experiences into credible proof of product value.  
   - Links (all open in new tab)  
     - LogRocket: [How Meilisearch uses LogRocket’s MCP to improve free trial experience and feature adoption](https://www.youtube.com/watch?v=RrlLZU-h32s)  
       - Telling the story of how an innovative customer is using LogRocket’s MCP to build tools and dashboards. Identified a customer by surveying internal product usage data, interviewed her, and edited/recorded the video in Riverside and Descript.  
     - Fidelity Private Shares: [Rugged Robotics](https://www.fidelityprivateshares.com/resources/case-studies/rugged-robotics)  
       - Interviewed Rugged Robotics Founder Derrick Morse before writing this case study on behalf of fintech client Shoobx (now Fidelity Private Shares).

4. **Thought Leadership**  
     
   - Headline: Thought Leadership  
   - Blurb: I work with technical leaders to turn complex ideas into clear, compelling narratives.  
   - Links (all open in new tab)  
     - LogRocket: [Introducing self-improving software: LogRocket finds issues, agents fix them](https://blog.logrocket.com/introducing-self-improving-software/)  
       - Worked with LogRocket CEO Matt Arbesfeld to write this narrative about how LogRocket is pioneering the emerging field of self-improving software. Part of the Deploy to Code Agents product launch.  
     - Fidelity Private Shares: [How To Fix The Broken Fundraising Process for Entrepreneurs](https://news.crunchbase.com/startups/how-to-fix-the-broken-fundraising-process-for-entrepreneurs/)   
       - Ghostwritten article for Jason Furtado, CEO and Co-Founder of Shoobx (now Fidelity Private Shares). Getting featured in Crunchbase News had been a dream for Jason for years.

**No contact section** — this is intentional. The site is sent directly to people who already have my contact info.

Wherever copy isn't provided above, insert a clearly-marked `[PLACEHOLDER]` — **do not write marketing copy in my voice on my behalf** unless I ask.

---

## 8\. Art / assets

**Approach:** The game must be fully functional with placeholder rectangles BEFORE any art is added (Phase D builds this way). Art is dropped in during Phase H. This means I am never blocked on art to have a working game.

**Look and feel:** Detailed pixel-art Boston — deep blues, warm building tones, harbor. A title-screen painting and a gameplay reference will be provided in `/assets`. Match that style; keep the gameplay scene a notch simpler/flatter than the title painting so pieces can move independently.

**Assets I'll provide (or generate and drop in later):**

- Title-screen image (for the opening screen) — likely ready first.  
- Scrolling background layer(s) for the game — simplified Boston strip(s).  
- Uno the sheepadoodle — a simple character sprite (idle / walk / sit; a few frames is plenty). Black-and-white coat, green bandana.  
- A bone/biscuit collectible.  
- Three portfolio signs/markers.

If real art isn't ready when we reach Phase H, that's fine — the placeholder version still ships. Build so swapping art never requires changing game logic.

---

## 9\. Explicit non-goals — do NOT build these

- ~~No jumping, gravity, or platforming physics.~~ **Amended 18 Aug 2026:** Uno can jump, so that some bones can sit above head height. Simple gravity only — still no platforms, no falling, and nothing to land on but the ground.  
- No enemies, hazards, health, score-based win/lose, or levels.  
- No mobile game controls (route mobile users to the portfolio instead).  
- No accounts, login, database, backend, API, or CMS.  
- No analytics, cookie banners, or third-party trackers unless I ask.  
- No contact form or contact section.  
- No extra pages beyond `/` and `/portfolio`.  
- No npm build step, bundler, or framework.

---

## 10\. How to work with me

- Work in the phases above. **Pause at the end of each phase so I can preview** before continuing.  
- Explain what you're doing in plain, non-developer English.  
- When I need to do something myself (create an account, click a button, paste a key), give me exact step-by-step instructions.  
- Before adding ANY dependency or tool not listed in Section 2, stop and ask.  
- If something in this plan turns out to be a bad idea once you're building, tell me — don't silently work around it.  
- Prefer the simple, boring, reliable solution every time.  
- Do NOT re-write any text that I suggest without first asking. I don’t want em dashes and a bunch of “Claudeisms” in my writing.


---

## 11. Amendments

Changes made to this plan after the build started. Newest first.

**18 Aug 2026 — Stops auto-open, and the ending screen repeats the work.**
Phase E originally required the visitor to press interact at each stop. Changed
so the modal opens by itself the first time Uno reaches a stop, because the
audience is recruiters rather than gamers and an optional button press is where
people drop off. Re-visiting a stop does not auto-open it. Phase G additionally
lists all three pieces of work, so nobody can finish without having seen them.

**18 Aug 2026 — Uno can jump.**
Section 9 originally ruled out jumping, gravity, and platforming physics.
Amended so that bones can be placed above head height and be worth reaching
for. What this covers: a single jump from the ground, with gravity pulling
him back down. What it deliberately still excludes: platforms to land on,
falling or pits, double-jumping, and any way to fail. Bones stay purely
cosmetic per Phase F — a missed bone costs nothing.

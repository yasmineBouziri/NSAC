# BSZ-OS MASTER CONTEXT HUB
NASA Space Apps Challenge 2026 | Team "Blood, Sweat and Zero-G" | Challenge: Health Monitoring Software for Astronauts

Read this whole file before doing anything. It is the single source of truth for what we are building, what the judges want, what the hard rules are, and how you should work.

---

## 0. HOW TO USE THIS FILE (instructions for the agent)

1. This file is your standing context. Re-read sections 3, 4 and 5 before every major decision.
2. Keep everything modular. One faulty part must be fixable by re-uploading a single file.
3. Style rules for ALL code, UI text, docs and slides we produce: no em-dashes, no generic AI-sounding wording, pragmatic and compact. Write like an engineer, not like a brochure.
4. If something here is marked UNVERIFIED, treat it as a lead to check, not as a fact.

---

## 1. TIMELINE AND DEADLINE

- Today is the competition day: Saturday, November 14, 2026.
- Hard deadline: **Sunday, November 15, 2026, 11:59 p.m. in the Local Event's time zone**. Click **Submit for Judging** before then. Every required field must be complete.
- Plan backwards from the deadline. A working, demoable, submitted project beats a perfect unsubmitted one. Reserve the last hours for submission only (demo link test in a logged-out browser, form fields, resource links).

---

## 2. THE CHALLENGE (official text)

**Title:** Create Health Monitoring Software for Astronauts on Space Missions

> Long-duration missions expose astronauts to space radiation, isolation and confinement, altered gravity, and a hostile closed environment, which can bring immune changes, bone loss, cardiovascular events, and behavioral health problems. On long missions, astronauts carry much of the responsibility for spotting these changes in themselves. Your challenge is to build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health.

### What the text actually demands (parse it carefully)
| Phrase | Meaning for us |
|---|---|
| "gathers health indicators" | Data acquisition layer: sensors (real device signatures, simulated), self-report, environmental, inferred |
| "enables astronauts to evaluate" | Interpretation layer: baselines, thresholds, trends, risk scores, explanations the astronaut can read |
| "and act on" | Action layer: guided tips, protocols, escalation, countermeasures, alerts. Not just a dashboard |
| "astronauts carry much of the responsibility for spotting these changes in themselves" | The user is the astronaut, not a ground doctor. Must work with delayed or no Earth contact. Self-monitoring first |
| Hazards named | Radiation, isolation and confinement, altered gravity, hostile closed environment |
| Outcomes named | Immune changes, bone loss, cardiovascular events, behavioral health problems |

Every one of those four hazards and four outcomes should be visibly covered in the product and in the demo.

---

## 3. SUBMISSION REQUIREMENTS (from the official "Components of Project" sheet)

All fields are required unless marked optional.

### 3.1 High-Level Summary
- Project name.
- 50 to 200 words. Answer: what did you develop, how does it address the challenge, why is it important.

### 3.2 Link to Project Demo and Link to Project
- Provide a short demo. Only include **ONE** link, either:
  - **Slide presentation, maximum 7 slides** (a title slide counts), OR
  - **Video presentation, 30 seconds**. Can be in native language but must have **English subtitles**.
- Host on an external site (YouTube, Google Drive, GitHub, OneDrive, Dropbox, etc.) with a **publicly accessible link**.
- If we created a new website, requesting a **Web Filter Classification** is recommended.
- The link must NOT need a password, permission or registration. Test it in a logged-out or incognito browser.
- Do NOT include names, voices or likenesses of anyone under 18.

### 3.3 Project Details
Answer: what exactly does it do, how does it work, what benefits, what do we hope to achieve, what tools, languages, hardware and software did we use.

### 3.4 Use of SI (AI tools disclosure)
- Using LLMs, chatbots, image/video generation, foundation models and coding generation is **allowed**.
- Select every tool used in the drop-down. The answer is for data collection and not seen by judges.
- Generated content **may not use, contain or modify any NASA branding or design elements** (NASA logos, flags, mission identifiers). This applies to the app, the slides and any generated images.
- Indicate where and how these tools were used, with a watermark or in the project description. Judges CAN see SI indicators (watermarks, descriptive text, metadata), so disclose cleanly and briefly.

### 3.4b Practical consequence
No NASA logo, meatball, worm or mission patch anywhere in our UI, slides or generated art. Our own branding is BSZ-OS and "Blood, Sweat and Zero-G".

### 3.5 NASA Data
- Suggested NASA data is listed per challenge under the **Resources** tab.
- **At least one NASA resource from the challenge is required to be eligible for global awards.**
- The form asks: what NASA data did you use, with links to ALL resources used.

### 3.6 Space Agency Partner Data and Other Resources
- Partner agency data: optional but encouraged.
- All other references go here. Provide links for all data and resources used.
- Must include any code, text and images used, even if open source or freely available.

---

## 4. JUDGING CRITERIA (official "How Your Project Is Judged")

Each project is scored **1 to 5** on five criteria. 5 is top.

| # | Criterion | Question judges ask | Score of 5 looks like | Official tip |
|---|---|---|---|---|
| 1 | **Impact** | How big is the problem and how many people does it help? | Significant problem, large audience, solution that works far better than expected | Say who has the problem and what changes for them |
| 2 | **Creativity** | How original is the idea? New or a meaningful improvement | Groundbreaking approach not tried before | Say what you did differently from existing solutions |
| 3 | **Validity** | Would it really work? Scientifically sound, feasible, easy to use | Scientifically sound, fully developed, ready for real-world use | Explain how it works and what tools you used |
| 4 | **Relevance** | Does it directly answer the challenge with NASA data at its core (not just added on)? | NASA data is essential to the solution and drives real insights | Say exactly which NASA data you used and how |
| 5 | **Presentation** | How clearly is the story told? Judges use both demo and full project | Well-structured, engaging, makes importance clear | Keep the demo short and visual, make the link public |

### 4.1 What this means for our strategy
- **Relevance is where "NASA data added on" loses points.** NASA data must DRIVE outputs in the app (thresholds, baselines, radiation inputs, reference ranges, datasets feeding the engines), and the submission must name each dataset and where it is used.
- **Validity** is our strongest lever: every threshold, tip and UI decision backed by an academic or NASA source, with all values as adjustable constants in a sourced constants file. Say clearly which inputs are simulated and which are real. Judges reward honesty about limits.
- **Creativity**: the "BSZ-OS" idea (a self-contained operating-system-like environment, modular plugin engines, offline-first, widget dashboard, local AI) versus the typical single-page dashboard.
- **Impact**: the astronaut who is alone with the problem (the crew medical officer may be the one who is ill, Earth contact delayed). Also spin-off value for remote and isolated populations on Earth.
- **Presentation**: demo must be short and visual. Show one concrete scenario end to end (see section 11).

---

## 5. NON-NEGOTIABLE RULES CHECKLIST

- [ ] At least one real NASA resource from the challenge Resources tab is used and actually feeds the app
- [ ] Every NASA resource used is listed with its link in the submission
- [ ] Every other resource (code libraries, text, images, fonts, open-source repos) is listed with links
- [ ] SI (AI) tools disclosed in the drop-down and indicated in the description or by watermark
- [ ] No NASA logos, flags, mission identifiers or modified NASA design elements anywhere
- [ ] Exactly ONE demo link: either max 7 slides (title counts) or 30-second video with English subtitles
- [ ] Demo link is public, no password, no login, no permission request. Tested logged-out
- [ ] No names, voices or likenesses of anyone under 18
- [ ] Summary is 50 to 200 words
- [ ] Web Filter Classification requested if we published a new website
- [ ] Submitted with **Submit for Judging** before Sunday Nov 15, 11:59 p.m. local event time

---

## 6. WHAT WE ARE BUILDING: BSZ-OS

**Team:** Blood, Sweat and Zero-G (INSAT, Tunisia). Members cover software, robotics, mechatronics and sensors, so any stack is acceptable.

**Concept:** "The everything app" for astronaut health. Covers every health domain that can reasonably be tracked and has real sensors. It feels like its own operating system, not a generic health dashboard. Offline-first, fed by ship/pod/mission sensors, with a local AI assistant.

### 6.1 Architecture principles
- Fully modular. Engines are plugins that expect certain behavior from each other and allows us to make proper modifications in a modular fashion. (some sort of core that links everything and allows for independent failure of each part AND A BUNCH OF ENGINES: health engine that contains all health relevant data and constants and performs all the calculations and statistics to determine health condition etc..., display engine in charge of the actual display of the app and anything related to the interface and its philosophy, sensor engine that, for the sake of this demo, simulates real-world sensor data that we cant get for whatever reason (radiation sensor, astronaut spo2, bpm, etc.. all will be simulated with a small chip under its display indicating that this is simulated data (`SIM`)), engine that behaves like a harness to host and run a local ai model that talks with the user keeping in mind all of their stats and health conditions that other parts of the app indicate and provide, an account engine that ensures secure and safe login and privacy for multiple accounts on the app, add any that you feel are necessary)
- User may point you to an inspiration somewhere that you can start from (it is in fact a previous iteration of this app and everything will remain more or less the same besides the actual display language, but the settings and the engine availability display and how simulation is handled etc.. are pretty good and functional, literally just the design language would change)
- Unbuilt engines still show visibly working but simulated widgets, so the demo never has dead areas.
- Starting the app is one .exe click that boots all engines.
- Everything offline-first, or fed by simulated ship/pod/mission sensors. No hard dependency on internet at runtime. NASA datasets are cached or snapshotted locally.
- Data-driven: every constant, threshold and tip has an academic or NASA source. All thresholds are adjustable constants in one sourced constants file. (when none exist for a given detail, its safe to use other medical sources)
- Fixing a bug should require uploading only one file.

### 6.2 Components and status (as of the last working session)
- None. Starting from scratch. Except for the inspiration the user may link or point out.


### 6.3 Dashboard applets (planned)
- Clock app (contains countdown, stopwatch, and a place containing the current time in all major capitals in the world with the ability to favorite), sensor monitor app (contains radiation, live solar feed and flare graphs, co2, EVERYTHING..), games app (contains space themed snake (snake has star/galaxy pattern, the thing it eats is jupiter/saturn/neptune/uranus/earth/mars/sun (they cycle)), space-themed 2048, space pinball cadet which will also be provided as reference file and can be copied in its entirety since I personally authored it, space sudoku with planets instead of numbers - same rules and everything just planets instead of numbers (from sun to neptune), space-themed chess) local model AI chat harness app with chat history and favorites and everything, physical health app containing an anatomical body view with muscles/bones and bubbles pointing at different parts being monitored (i.e. a bubble pointing at the heart showing current bpm and detecting palpitations, skipped beats, etc.. one pointing at bones showing bone density, etc..) doesnt have to be all live since some need active monitoring and such, so only the active/selected one shows. for the sake of our demo, each can be activated/deactivated to start a showing a stream of simulated/synthetic data., mental health app with CHECKUPS, PERIODIC SURVEYS, TIPS, etc.. (all apps will be individually assessed and improved upon later. we just need a working base/skeleton), settings app to modify font size and app color theme and many other things, tutorial and about area explaining everything, credits section where we will later put ourselves and our credentials (plenty more))

- Notifications in the app that alert you of emergency/important details before you go to their applet, with a sound warning too.

- MOST IMPORTANTLY: FOR THE FIRST TIME WORKING ON THIS, JUST GENERATE A WORKING SKELETON FOR EVERYTHING, DETAILS ARE THE COSTLY PART AND WILL BE ADDRESSED BIT BY BIT LATER

### 6.4 Health domains the health engine covers
- **Continuous:** cardiovascular, respiratory, thermoregulation, sleep, activity
- **Periodic:** bone and muscle proxies, SANS (spaceflight associated neuro-ocular syndrome) checks, vestibular, cognition, body composition, hydration, nutrition
- **Environmental:** radiation, CO2, O2, cabin temperature, humidity, noise, VOCs
- **Behavioral:** questionnaires, mood, workload, voice, social interaction
- **Immune state:** inferred, not directly measured

Map these to the four hazards and four outcomes in section 2 so the demo story is traceable:
| Hazard | Outcome | Engine domains that watch it |
|---|---|---|
| Space radiation | Immune changes, cardiovascular risk | Radiation, immune (inferred), cardio |
| Isolation and confinement | Behavioral health problems | Behavioral, sleep, social, cognition |
| Altered gravity | Bone loss, cardiovascular, SANS, vestibular | Bone/muscle proxies, cardio, SANS, vestibular, activity |
| Hostile closed environment | All of the above | CO2, O2, temp, humidity, noise, VOCs |

---

## 7. WORKING RULES FOR THE AGENT

1. **Never invent data or citations.** If a source cannot be verified, say so and mark the constant as "needs source". Fabricated references destroy Validity.
2. **Separate real from simulated.** Label simulated data as simulated in code, UI and slides. Be explicit that BSZ-OS is a decision-support prototype and not a medical device.
3. **NASA data must drive behavior.** When integrating a dataset, state exactly which engine consumes it and what output changes because of it.
4. **No em-dashes, no filler language** in code, UI strings, comments or docs.
5. **Token and size discipline.** The local AI must stay efficient long-term. Stored data must never outgrow or slow it (summarize, window, compact).
6. **Offline first.** Anything fetched from the internet must have a cached fallback (or like download from CDN and run locally after the first launch)

---

## 8. COMPETITIVE LANDSCAPE (public repos seen for this same challenge, UNVERIFIED as to quality)

Other teams have already published projects for this challenge. Patterns worth knowing so we can differentiate:
- Many are single dashboards with simulated crew data and a "not a medical device" disclaimer.
- Some argue for rule-based evaluation instead of prediction models, because day-by-day in-flight astronaut vitals are not public and rules are auditable and run offline. This is a strong argument we should also make where it applies.
- Some are offline-first with a local LLM (Ollama) and keep core alerting independent of the LLM. We should do the same: **alerts and thresholds never depend on the AI model.**
- At least one entry advertises integrating NASA OSDR, GeneLab and NTRS research data, and others use real NASA/NOAA radiation and solar proton measurements.
- Some cite NASA-STD-3001 (human system standards) for display design.

**Our differentiators:** the OS-style modular plugin architecture, the breadth of domains covered, per-account state, app-based dashboard, local adaptive AI, and rigorous source-backed constants.

---

## 9. RESOURCE INGESTION PROTOCOL

The Resources tab of the challenge page lists the suggested NASA data and partner resources. The human will paste the links. For EACH link, produce this summary, one at a time, in this exact structure:

```
### RESOURCE: <name>
- URL:
- Provider: (NASA / partner agency / other)
- What it is: (2 to 3 sentences)
- Data type and format: (time series, tabular, images, API, CSV, JSON, PDF, etc.)
- How to access: (direct download, API endpoint, auth needed or not, rate limits)
- Key fields and units:
- Time or population coverage:
- License or usage terms:
- Offline strategy: (what to snapshot or cache, approximate size)
- Maps to BSZ-OS: (which engine and domain, which threshold, baseline or widget it would drive)
- Concrete use in the app: (what output changes because of this data)
- Strength for judging: (Relevance / Validity / Impact / Creativity angle)
- Risks or limits: (sparse data, not astronaut-specific, outdated, etc.)
- Citation line for the submission form:
- Verdict: USE (core) / USE (supporting) / SKIP, plus one sentence why
```

- WHEN ASKED TO WORK ON THE APP, IGNORE THE RESOURCE SUMMARY THING AND JUST WORK WITH THEM. WHEN ASKED TO GENERATE THE RESOURCE SUMMARIES FOR LATER USE, ONLY DO THAT AND DONT TOUCH THE APP.

After all links are summarized:
1. Rank them by how much they can drive the app in the time left.
2. Pick the minimum set that makes NASA data the **core** of the solution (not added on). Aim for at least 2 to 3 resources wired into real behavior.
3. Flag any resource that is requested but cannot be fetched (site blocks automated access, login needed, huge file). Propose a workaround such as a representative snapshot or manually transcribed reference values, clearly labeled.

### 9.1 Leads to check against the Resources tab (UNVERIFIED, these are candidates, not confirmed as listed there)
- NASA Open Science Data Repository (OSDR) and GeneLab: omics and biological data from spaceflight experiments (immune, bone, cardiovascular signals)
- NASA Technical Reports Server (NTRS): research papers for sourcing thresholds and countermeasures
- NASA Human Research Program material: human health risks and countermeasures (radiation, behavioral health, bone, cardiovascular)
- NASA-STD-3001: human system standards (health, performance, displays)
- NASA and NOAA space weather feeds (solar flares, solar proton events, radiation environment) for the radiation and live solar widgets
- NASA ISS environmental and radiation measurements (daily dose rate references)

Verify each against what the Resources tab actually lists. Prefer what the challenge lists, since it is the official suggestion and it is what judges expect to see.

---

## 10. NASA DATA REGISTER (fill as resources are processed)

| # | Resource name | Link | Provider | Engine and domain it drives | Where it appears in the app | Verdict | In submission list? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

### Other resources register (libraries, fonts, images, code, text)
| # | Name | Link | License | Where used |
|---|---|---|---|---|
| 1 | Motion (JS animation) | | | Display engine |
| 2 | anime.js | | | Display engine |
| 3 | | | | |

Keep this register current as we build. The submission form requires links to everything used, including open source code, text and images.

---

## 11. DEMO AND SUBMISSION PLAN

### 11.1 Choose ONE demo format
- **Option A, slide deck (max 7 slides, title counts).** Better for explaining sourcing and architecture.
- **Option B, 30-second video with English subtitles.** Better for showing the live app.
Only one link is allowed. Decide early and build toward it.

### 11.2 Suggested 7-slide outline (if deck)
| Slide | Content | Criterion it serves |
|---|---|---|
| 1 | Title: BSZ-OS, team name, one-line promise | Presentation |
| 2 | The problem: astronaut alone with the diagnosis, four hazards, four outcomes | Impact |
| 3 | The solution in one screen: dashboard screenshot with labeled domains | Presentation, Relevance |
| 4 | How it works: sensors, engines, offline-first, local AI, alerts independent of AI | Validity |
| 5 | NASA data at the core: which datasets drive which outputs | Relevance |
| 6 | Science and sources: sourced constants, simulated vs real, limits stated honestly | Validity |
| 7 | What is different and what is next: modularity, extensibility, Earth spin-offs | Creativity, Impact |

### 11.3 Suggested 30-second video beats (if video)
0 to 5 s: the problem. 5 to 20 s: one scenario run live (a radiation spike plus poor sleep plus elevated heart rate leads to an explained alert and a guided action). 20 to 27 s: NASA data named on screen. 27 to 30 s: name and tagline. Burn in English subtitles.

### 11.4 Hero scenario for the demo (pick one and rehearse it)
A simulated crew member shows rising radiation exposure from a solar event, degraded sleep and reduced HRV. BSZ-OS flags the combined risk, shows the NASA-sourced threshold behind the flag, explains why in plain language, and gives a guided action. Works fully offline.

### 11.5 Final submission checklist (last 2 hours)
1. Open the demo link in an incognito window. Confirm no login.
2. Confirm slide count is 7 or fewer, or video is 30 seconds with subtitles.
3. Confirm no NASA logos or mission identifiers anywhere.
4. Confirm no minors' names, voices or likenesses.
5. Paste summary (50 to 200 words) and count words.
6. Fill NASA data list with all links. Fill other resources list with all links.
7. Select all SI tools used and add the disclosure line to the project description.
8. Click **Submit for Judging**. Screenshot the confirmation.

---

## 12. DRAFT TEXT BLOCKS (the agent should refine these at the end)

### 12.1 SI disclosure line (edit to match what was actually used)
"AI tools were used for code generation, debugging and drafting documentation. All thresholds and references were checked against the cited sources. No AI-generated content uses NASA branding."

### 12.2 High-level summary skeleton (target 120 to 180 words)
"BSZ-OS is an offline-first health operating environment for astronauts on long missions. It gathers health indicators from sensors, self-reports and environmental monitors, interprets them against personal baselines and sourced thresholds, and tells the astronaut what changed, why it matters and what to do. It covers cardiovascular, respiratory, sleep, bone and muscle proxies, neuro-ocular and vestibular checks, cognition, behavioral health and the cabin environment, and infers immune status. NASA data drives <FILL IN: which datasets and what they drive>. A local AI assistant adapts to each crew member without depending on Earth contact, while alerts and thresholds run independently of the AI. The system is modular, so engines can be swapped or fixed one file at a time. It is a decision-support prototype, not a medical device."

---

## 13. OPEN ITEMS (things not known when this file was written)

- The challenge page "Details" and "Resources" tabs could not be read automatically (the site blocks automated access). The challenge statement in section 2 comes from the provided challenge file, and the submission and judging sections come from the two official PDFs received by email. The Resources tab list must come from the human pasting the links.
- The Local Event's time zone is not stated here. The deadline is 11:59 p.m. in that time zone on Sunday, November 15.
- Whether any additional rules exist in the Details tab (team size, eligibility, prize categories) is unknown. If the human pastes the Details tab text, update section 2 and 3.
- Current file versions of the display engine, health engine and sensor simulator will be uploaded by the human. Do not assume contents.

# Forecastify (Aether) — Live Pitch Script
### Runtime: 5:00 – 8:00 | ~1,050 spoken words + 3 demo beats

---

## 🧭 Framework Stack Used

| Layer | Framework | Where it applies |
| :--- | :--- | :--- |
| **Spine** | **Monroe's Motivated Sequence** | Attention → Need → Satisfaction → Visualization → Action |
| **Opening** | **PAS** (Problem – Agitate – Solve) | 0:00 – 1:00 |
| **Each feature** | **FTR** (Feature → Technical → Relatable) | 1:00 – 5:00 |
| **Proof block** | **Depth-on-Demand** (one claim, one artifact) | 5:00 – 6:15 |
| **Close** | **Rule of Three + Callback** | 6:45 – 7:30 |

**FTR is the engine of this pitch.** Every feature gets three beats: what it is, how it's built, what it means to a shopkeeper. Judges get the rigor; the room gets the story. Never give one without the other.

**No named character — by design.** Instead of a person, the pitch uses **one specific shop on one specific day**. The shop is unnamed, so every judge fills it in with a shop they've actually walked past. That's stronger than a name: a name is someone else's story, an unnamed corner shop is *theirs*.

> ⚠️ **Tone discipline:** this is a business pitch with a human opening, not a story. The shop carries the emotional beats — hook, visualization, close. The technical blocks stand entirely on their own.

---

## ⏱️ Time Map

```
0:00 ──────── 1:00 ──────── 2:00 ──────── 3:30 ──────── 5:00 ──────── 6:15 ──── 6:45 ──── 7:30
│  ATTENTION  │    NEED     │        SATISFACTION       │ VISUALIZE  │  PROOF  │ ACTION │
│  The shop   │  The gap    │   Feature walkthrough     │  The day   │  Depth  │ Close  │
│    PAS      │  Agitate    │   FTR × 4                 │  after     │  Tech   │ Punch  │
```

**Flex points if you're running long:** cut Feature 4 (Federated Intelligence) → saves 45s. Compress the K8s paragraph to one line → saves 30s. Never cut the demo or the close.

---

# 🎙️ THE SCRIPT

---

## ▸ PHASE 1 — ATTENTION (0:00 – 1:00)
### *Problem · Agitate · Solve*

> **[Walk to center. Black slide or no slide. Say nothing for two seconds.]**

*"Second week of May. Forty-one degrees.*

*There is a shop at the end of a lane — the kind you have walked past a hundred times. It opens at seven in the morning. By two in the afternoon, every cold drink in that shop is **sold out.** Customers keep walking in, look at the empty fridge, and walk straight back out — to the shop across the road."*

> **[Beat. Drop the pace.]**

*"And here is the part that actually hurts. While that shop was losing sales at the counter, **eighteen thousand rupees** of curd, bread and milk were quietly expiring in the back room. Nobody knew. There was no system that could tell anyone.*

*Money lost at the front of the shop. Money lost at the back of the shop. **Same day.**"*

> **[Lift. Turn to the room.]**

*"There are **thirteen million** shops like that one. Together they run **88% of India's grocery trade** — and almost every one of them is running it on memory, instinct, and a notebook.*

*Meanwhile Amazon and Walmart have entire data science divisions solving exactly this problem."*

> **[Slide 1 — logo]**

*"We're Team Forecastify. We built **Aether** — a platform that hands that thirteen-million-store market the same forecasting intelligence the giants already have. And we built it so the shop can use it by **talking to it.**"*

---

## ▸ PHASE 2 — NEED (1:00 – 1:45)
### *Why nothing on the market solves this*

> **[Slide 2 — "Ledgers look backward"]**

*"Now you'll say — there are apps for this. Khatabook. Vyapar. Every POS on the market.*

*True. And every single one of them is a **ledger.** A ledger tells you what you sold **yesterday.** Not one of them has ever told a shop that a heatwave is landing on Thursday."*

> **[The core reframe. Say it slowly — this line comes back at the very end:]**

*"It's the difference between a **rear-view mirror** and a **windshield.** Indian retail has been driving on the rear-view mirror for forty years.*

*So we asked one question: what would it take to give a small shop a **windshield?***

*Yesterday's sales alone won't do it. You need the weather. The festival calendar. What's trending in the local market this week. Batch-level expiry data. Forecastify pulls all four into one prediction — and then it makes that prediction **speak Hindi.**"*

---

## ▸ PHASE 3 — SATISFACTION (1:45 – 5:00)
### *Feature walkthrough — FTR format*

> **[Switch to the live console. Two full seconds of silence before you speak. The UI buys you credibility for free.]**

*"This is the Aether console. 94 screens, 133 APIs, roughly 76,000 lines of TypeScript. Four things matter."*

---

### 🔹 FEATURE 1 — Predictive Demand Engine *(1:55 – 2:40)*

**FEATURE:**
*"The Demand Spike engine. Right now it is telling this store: order 120 more units before Thursday."*

**TECHNICAL:**
*"Behind that one number is a real feature pipeline — nine raw feature builders pulling sales, inventory, pricing, promotions, suppliers, expiry, procurement, calendar and **live weather**, plus four derived builders on top. Those features feed a model registry with **ten** forecasting models — Prophet, XGBoost, LightGBM, LSTM, Transformer, Random Forest and more — combined through a configurable ensemble: weighted average, median, or trimmed mean. Every model is scored on eleven metrics — MAPE, WAPE, pinball loss, coverage probability — so the ensemble weights aren't guesses. They're earned."*

**RELATABLE:**
*"In plain terms: instead of asking one expert what next week looks like, we ask **ten.** We check which ones have actually been right lately. And we listen to those ones more.*

*Every shopkeeper already does a rough version of this — ask the supplier, ask the family, check what happened last Diwali. We just did it with ten models and no arguments."*

---

### 🔹 FEATURE 2 — J.A.R.V.I.S. Voice Assistant *(2:40 – 3:25)*

> **[DEMO BEAT 1 — the money moment. Rehearse until it bores you.]**

**FEATURE:**
*"But a dashboard is useless to someone with both hands full of stock. So — watch this."*

> **[Press the mic. Speak clearly:]**
> **"J.A.R.V.I.S. — is hafte kya stock mangana chahiye?"**
>
> **[Let it answer out loud. Do NOT talk over it. The silence is the demo.]**

**TECHNICAL:**
*"That's Groq's Llama 3 for sub-second inference, with automatic failover to Google Gemini 1.5 Flash and a Hugging Face zero-shot classifier if a rate limit hits — so the assistant never goes silent mid-sentence. Web Speech API for recognition and synthesis, English and Hindi, and any answer exports as a PDF report."*

**RELATABLE:**
*"The shopkeeper doesn't have to learn our software. **Our software learned their language.** That's our entire accessibility strategy in one sentence."*

---

### 🔹 FEATURE 3 — Expiry Shield, Dead Stock & One-Click Procurement *(3:25 – 4:20)*

> **[DEMO BEAT 2 — Expiry Risk → Dead Inventory → Purchase List → extension.]**

**FEATURE:**
*"Remember the eighteen thousand rupees rotting in the back room? This is the Expiry Shield. FEFO tracking — First Expired, First Out — at batch level. Under seven days: recommend 50% off. Seven to fifteen days: 20–30% and move it to the front shelf.*

*Alongside it, the Dead Inventory module does the same for stock that simply stopped selling — it tells you what that frozen capital is costing you and prices it to clear."*

**RELATABLE:**
*"We're not preventing waste. We're **converting waste into cash flow before it becomes waste.** A 30% discount is not a loss. A 100% expiry is."*

**FEATURE + TECHNICAL:**
*"Then the reorder. The system builds the purchase list — and this is our Chrome Manifest V3 extension. One click…*

> **[Click Export to Cart. Switch to the distributor site. Let it populate.]**

*…and the wholesaler cart is searched and filled. No API partnership. No integration deal. No permission needed from JioMart or Udaan — it's controlled DOM automation running on the retailer's own logged-in session. That's a **deliberate architectural decision**: it means we onboard a store today, not after an eighteen-month enterprise integration."*

**RELATABLE:**
*"Two to three hours of writing orders by hand, every single day, becomes **one click.**"*

---

### 🔹 FEATURE 4 — Federated Intelligence & What-If *(4:20 – 5:00)*
> *[CUT THIS FIRST if you're over time.]*

**FEATURE:**
*"Two more, fast. Federated Intelligence lets neighbouring shops share demand signals — 'cold drinks are surging across this pincode' — **without** exposing one rupee of anyone's sales data."*

**RELATABLE:**
*"A neighbourhood watch for demand. Everyone sees the weather. **Nobody sees your wallet.**"*

**FEATURE:**
*"And the What-If simulator: 'what if my supplier's lead time goes from three days to seven?' It recalculates safety stock and margin impact live."*

**RELATABLE:**
*"A flight simulator for your shop. Crash it here — not on your capital."*

---

## ▸ PHASE 4 — PROOF / TECHNICAL DEPTH (5:00 – 6:15)

> **[Slide — architecture diagram. Point at it. Don't read it.]**

*"Three things on the record, because we didn't build a demo — we built a **product.***

***One — explainability.*** *A 28-module explanation engine: feature attribution, counterfactuals, confidence scoring, full decision lineage. Every forecast can answer 'why did you say that?' — because a shopkeeper who doesn't trust the number will not act on it. **Trust is a feature, and we shipped it as one.***

***Two — it survives production.*** *Underneath this sits a full background operations layer: job queues, schedulers, distributed locks, idempotency, model-drift detection, automated retraining, tracing, SLA monitoring, disaster recovery. Thirty-plus subsystems.*

***Three — it deploys like enterprise software.*** *CNCF-compliant Kubernetes, Pod Security Admission on restricted profile, non-root containers, read-only root filesystems, default-deny network policies. CI/CD through Jenkins with SonarQube quality gates and Trivy vulnerability scans, shipped by ArgoCD GitOps."*

> **[Honesty line. Say it — it wins more judges than it costs.]**

*"And to be straight with you: our headline numbers — 82% fewer stockouts, 76% less waste — are modelled design targets against baseline retail benchmarks. Validating them in live pilot stores is exactly what the next phase is for. What is **built and running today** is everything I just showed you."*

---

## ▸ PHASE 5 — VISUALIZATION (6:15 – 6:45)

> **[Leave the laptop. Come forward. Speak to people, not to the screen.]**

*"So — back to that shop at the end of the lane.*

*Same May morning. Same forty-one degrees. Same empty fridge waiting to happen.*

*Except on **Tuesday**, a phone in that shop said, out loud, in Hindi: Thursday will be five degrees hotter — order 120 more cold drinks. One click. Done. The same message flagged eleven items expiring on Sunday and put them on the front shelf at 30% off by Wednesday afternoon.*

*Thursday arrives. The fridge is full. The curd is sold. **Nothing goes into the bin, and nobody walks across the road.***

*The heatwave didn't change. **The shop just stopped being surprised by it.**"*

---

## ▸ PHASE 6 — ACTION & CLOSE (6:45 – 7:30)

**Business model — 15 seconds, no slower:**
*"Tiered SaaS. **Free** for basic tracking. **₹499 a month** for the full engine plus J.A.R.V.I.S. **Custom** for multi-store retail networks. At ₹499, it pays for itself the first time it saves one crate of milk."*

> **[Pause. Slow right down for the last four lines. This is the punchline. Do not rush it.]**

### 🎯 THE PUNCHLINE

*"Thirteen million shopkeepers in this country already know their customers better than any algorithm ever will.*

*What they have never had is **someone to tell them what's coming.***

*Amazon has a data science team. Walmart has a data science team."*

> **[Full stop. Two seconds. Then quietly:]**

***"Now the shop at the end of your lane has one too — and it fits in a pocket, and it speaks the language.***

*We're Forecastify. **We didn't digitize the ledger. We replaced the rear-view mirror with a windshield.***

*Thank you."*

---

# 📋 DELIVERY CARD

**Pace:** ~145 wpm. The script is deliberately under-packed so you can breathe.

**Three silences you must actually take:**
1. Two seconds before your first word.
2. The full J.A.R.V.I.S. response — never talk over your own demo.
3. Two seconds before *"Now the shop at the end of your lane…"*

**Callbacks that must land — this is what makes it feel written, not assembled:**
| Planted | Cashed |
| :--- | :--- |
| The shop at the end of the lane, 0:08 | 6:18 and 7:20 |
| Rear-view mirror / windshield, 1:20 | Final sentence, 7:25 |
| ₹18,000 expiring in the back room, 0:28 | 3:28 and 6:32 |
| The shop across the road, 0:20 | 6:38 |

**Why the shop has no name, and why that matters:** the phrase to protect is **"the kind you have walked past a hundred times"** at 0:10. That single clause does the work a character name would do — it makes the judge supply the shop from their own memory. Then the close pays it off with *"the shop at the end of **your** lane."* Opening with an anonymous shop and ending with *their* shop is the whole emotional arc. Don't let anyone talk you into naming it.

**Demo insurance:** record a 40-second screen capture of the voice demo and the cart injection. If the network dies: *"live network's fighting us — here's the recording from this morning"* and keep the exact same words. Never debug on stage.

**If a judge interrupts mid-demo:** answer in one sentence, then *"— and that connects to the next thing I want to show you."* Do not let one question restructure your seven minutes.

**Emphasis map — the six words to hit hardest:**
thirteen million · windshield · ten · language · surprised · replaced

---

# 🗜️ 5-MINUTE CUT (if the slot shrinks)

Drop, in this order:
1. Feature 4 — Federated Intelligence & What-If *(−45s)*
2. Proof point Two — background operations layer *(−20s)*
3. Proof point Three — compress Kubernetes/DevSecOps to one sentence *(−25s)*
4. Business model — compress to *"Tiered SaaS, ₹499 a month for the full engine"* *(−10s)*

**Never cut:** the opening shop, the voice demo, the cart injection, the visualization, the punchline. Those five *are* the pitch. Everything else is evidence.

---
name: design-principles
description: Foundational visual and interaction design principles combining Refactoring UI (Wathan & Schoger) and The Design of Everyday Things (Don Norman). Use when building, reviewing, or critiquing any UI, interaction, or user-facing feature.
---

# Design Principles

A combined reference of two foundational design texts:

1. **Part 1 — Refactoring UI** (Adam Wathan & Steve Schoger): visual and practical principles for building polished interfaces — hierarchy, spacing, typography, color, depth, imagery, and finishing touches.
2. **Part 2 — The Design of Everyday Things** (Don Norman, Revised & Expanded Edition): the psychology of human-centered design — affordances, signifiers, mappings, feedback, conceptual models, error, and the HCD process.

Apply both when building, reviewing, or critiquing any UI, interaction, or user-facing feature. Refactoring UI tells you _how to make it look right_; Don Norman tells you _how to make it work right_.

---

## Part 1 — Refactoring UI (Wathan & Schoger)

Source: _Refactoring UI_ by Adam Wathan & Steve Schoger. Apply these when building, reviewing, or refining any UI component or layout.

### Design Process

- **Start with a feature, not a layout.** Don't design the shell (nav, sidebar, logo placement) first — design a real piece of functionality. The shell decisions depend on the features, not the other way around.
- **Design in grayscale first.** Hold off on color until hierarchy and spacing work without it. Forced constraint produces cleaner hierarchy.
- **Don't design too much up front.** Work in short cycles: design a simple version → build it → iterate on the working design. Don't imply functionality you're not ready to build.
- **Be a pessimist about scope.** Design the smallest useful version you can ship. Nice-to-haves should be designed later, not up front.
- **Define systems before you start.** Pre-define your spacing scale, type scale, color palette, and shadow scale. Never hand-pick arbitrary values mid-design — always pick from a constrained set.

---

### Visual Hierarchy

- **Not all elements are equal.** Deliberately de-emphasize secondary and tertiary content. An interface where everything competes for attention looks noisy; one with clear hierarchy looks designed.
- **Use weight and color, not just size, to create hierarchy.** Two font weights are enough: normal (400–500) for body, bold (600–700) for emphasis. Never use weights below 400 in UI — use a lighter color or smaller size instead.
- **Three text colors max on white/light backgrounds:**
  - Dark (e.g. near-black) for primary content
  - Mid-grey for secondary content
  - Light-grey for tertiary content (captions, copyright)
- **Never use grey text on colored backgrounds.** Grey reduces contrast relative to white, not relative to the background. Instead, hand-pick a color with the same hue as the background and adjust saturation/lightness until the contrast feels right.
- **Emphasize by de-emphasizing.** If the primary element won't pop, soften the competing elements rather than inflating the main one. (e.g. dim inactive nav items instead of overstyling the active one.)
- **Labels are a last resort.** Where possible, embed context in the value: "12 left in stock" not "In stock: 12"; "3 bedrooms" not "Bedrooms: 3". When labels are needed, treat them as secondary — smaller, lower-contrast. Only make labels prominent when users scan for label words, not data (e.g. a tech spec sheet).
- **Separate visual hierarchy from document hierarchy.** An `h2` used as a section label should look subdued and small — content is the focus, not the title. Pick semantic tags for meaning, then style them however the visual hierarchy demands.
- **Button hierarchy over button semantics.** Every page has a hierarchy of actions:
  - **Primary**: solid, high-contrast fill
  - **Secondary**: outline or low-contrast background
  - **Tertiary**: plain link style
  - A destructive action is not automatically red and big — only apply that treatment when the destructive action is the _primary_ action on screen (e.g. a confirmation dialog).
- **Balance weight and contrast.** Heavy elements (bold text, solid icons) cover more surface area and feel emphasized. Reduce the contrast of an icon sitting next to text so they feel balanced. Conversely, increase border weight instead of border darkness when subtle borders feel too weak.

---

### Layout & Spacing

- **Start with too much white space.** Add space then remove it, don't add space to fix cramped UI. The minimum-to-not-look-bad floor is too low.
- **Use a base-16px spacing/sizing scale.** Values should differ by at least ~25%: e.g. `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`. Never hand-pick arbitrary pixel values — always snap to the scale.
- **Spacing between groups must exceed spacing within groups.** If the gap between a label and its input equals the gap between two form groups, the form reads as ambiguous. Apply this rule to all grouped content (headings + body, list items, card rows).
- **Don't fill the screen just because you can.** If content looks best at 600px wide, use 600px. Extra space at the edges hurts nothing. Give each element the width it needs; avoid stretching things unnecessarily.
- **Use `max-width` + `flex-grow` instead of percentage widths.** Fixed-width sidebars and components are better than percentage-based widths that collapse awkwardly at narrow viewports.
- **Avoid blind adherence to a grid.** Grid percentages are useful for fluid layouts but inappropriate for elements that have an optimal fixed width. Don't compromise a sidebar or card's readability to stay "on the grid."
- **Elements don't scale proportionately across breakpoints.** Large elements shrink faster than small ones at smaller screen sizes. Don't use `em` to tie headline size to body size and expect it to scale correctly — redefine sizes independently per breakpoint.
- **Relative sizing doesn't scale within components either.** A large button shouldn't just be a scaled-up version of a small button — the padding should be more generous proportionally. Fine-tune independently.
- **Avoid ambiguous spacing.** Make it visually unambiguous which elements belong together. Always: space between groups > space within groups.

---

### Typography

- **Define a hand-crafted type scale in `px` or `rem` — never `em`.** `em` compounds when nested, breaking the scale. A practical scale: `12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72px`. Avoid fractional values.
- **Pick fonts with 5+ weights.** Typefaces with many weights are crafted with more care. On Google Fonts, filtering to 10+ styles eliminates 85% of options and leaves only quality choices. Neutral sans-serifs are safest for UI.
- **Optimize for legibility.** Avoid condensed typefaces with short x-heights for body text. They're designed for headlines, not interfaces.
- **Keep line length between 45–75 characters** (~20–35em). Constrain paragraph containers even when the surrounding layout is wider. Going wider than 75 chars risks readability.
- **Align mixed font sizes on their baseline, not their vertical center.** Baseline alignment matches how the eye perceives text naturally. Center-aligning different font sizes creates an awkward offset when they're close together.
- **Line-height is inversely proportional to font size.** Small body text: ~1.5–2. Wide or long-form text: up to 2. Large headlines: ~1–1.2. Don't use a single `line-height: 1.5` globally.
- **Line-height should grow with line length.** Narrow content (short lines) can use ~1.5; wide content (long lines) may need up to 2 so the eye can find the next line.
- **Most text should be left-aligned.** Center-align only short independent text blocks (≤2–3 lines). Right-align numbers in tables for easy decimal comparison. Justify only for formal/print contexts, and always pair with CSS `hyphens: auto`.
- **Not every link needs a color.** In dense UI where almost everything is a link, colored links are overbearing. Use a heavier weight or darker color instead. Ancillary links can even hide styling until hover.
- **Letter-spacing rules:**
  - Tighten letter-spacing for large headlines using body fonts (to mimic purpose-built headline fonts).
  - Increase letter-spacing for all-caps text (uniform cap height reduces distinguishing characteristics between letters).
  - Don't adjust letter-spacing for normal body text — trust the typeface designer.

---

### Color

- **Work in HSL, not hex or RGB.** HSL (hue, saturation, lightness) maps to human perception and is natively supported in CSS. Colors that are visually similar look similar in HSL.
- **You need far more colors than you think.** A 5-color palette can't build a real UI. You need:
  - **8–10 grey shades** (from near-black to off-white — avoid true black and true white)
  - **5–10 shades per primary color** (ultra-light for tinted backgrounds, mid for interactive elements, dark for text)
  - **Accent colors** for semantic states: green (positive/success), yellow (warning), red (destructive/error) — each with multiple shades
  - Additional accent colors for categories, graph lines, tags, etc.
- **Define all shades up front.** Name them 100–900 (100 = lightest, 900 = darkest). Pick the base (~500), then the edges (lightest/darkest), then bisect to fill the scale. Never generate shades on the fly with `lighten()`/`darken()` — you'll end up with 35 indistinguishable blues.
- **Increase saturation at extreme lightness values.** In HSL, saturation loses its impact near 0% or 100% lightness. To keep light and dark shades vibrant, increase saturation as lightness diverges from 50%.
- **Use hue rotation to change perceived brightness without losing vibrancy.** Rotate hue toward yellow/cyan/magenta (bright hues) to make a color feel lighter, or toward red/green/blue (dark hues) to make it feel darker. Limit rotation to 20–30° to avoid a color shift.
- **Greys should be slightly saturated, not true grey (0% saturation).** Cool greys: saturate with blue. Warm greys: saturate with yellow/orange. Maintain consistent saturation increases across the light and dark ends of the grey scale.
- **Accessible contrast without ugly design:**
  - Normal text (<18px): minimum 4.5:1 contrast ratio (WCAG AA)
  - Large text: minimum 3:1
  - To keep accessible contrast while staying colorful on dark backgrounds, try using dark-colored text on a light-colored background instead of white text on a very dark background.
  - On colored panels with secondary text, rotate the hue toward a bright color (cyan, magenta, yellow) to increase contrast without going near white.
- **Never rely on color alone to communicate state.** Always pair color with a supporting icon, label, or pattern. Red/green alone is invisible to red-green colorblind users (~8% of men). For graphs, use contrast (light vs dark) in addition to color.

---

### Depth & Shadows

- **Light comes from above.** Simulate a light source consistently: top edges of raised elements are lighter; bottom edges of raised elements cast a small shadow below. Inset elements have a shadow at the top and a light edge at the bottom.
- **Use hand-picked lighter/darker colors for raised/inset edges** — don't use semi-transparent white overlays, which desaturate the underlying color.
- **Use shadows to communicate elevation, not decoration.** Define a 5-level shadow scale from smallest (tight blur, slight raise) to largest (diffuse blur, high elevation). Assign shadows semantically:
  - Small: buttons, inputs (slightly raised)
  - Medium: dropdowns, popovers (floating above UI)
  - Large: modals, dialogs (capturing full attention)
- **Shadows can have two parts:**
  1. A large, soft, high-offset shadow → simulates direct light cast
  2. A tight, dark, low-offset shadow → simulates ambient shadow directly under the element
  - At higher elevations, the tight ambient shadow should fade (nearly disappear at the highest level).
- **Use shadows as interaction feedback.** Increase shadow on drag (element lifts). Remove or shrink shadow on button press (element depresses into page).
- **Flat designs can still have depth.** Lighter elements feel closer; darker elements feel further away. A card lighter than the page background reads as raised; a card darker reads as inset. You can also use a short, zero-blur offset shadow for a flat-but-layered look.
- **Overlap elements to create layers.** Cards that cross section boundaries, elements taller than their parent, or controls that extend outside a container all create a sense of multi-layered depth. Use an invisible same-as-background "border" on overlapping images to prevent color clashing.

---

### Images

- **Use good photos.** Bad photography will ruin an otherwise excellent design. Use professional photography or high-quality stock (Unsplash, paid stock). Never design with placeholder images intending to swap in smartphone photos later.
- **Ensure text contrast on background images.** A dynamic photo has light and dark areas — no single text color works everywhere. Fixes:
  - Semi-transparent dark overlay (for light text) or light overlay (for dark text)
  - Reduce image contrast and adjust brightness to compensate
  - Colorize the image: reduce contrast → desaturate → apply solid color in "multiply" blend mode
  - Add a large-blur, zero-offset text shadow to selectively increase local contrast
- **Never scale icons beyond their intended size.** Icons drawn at 16–24px look chunky and unprofessional at 3–4× size. Instead, enclose small icons in a shaped container with a background color — keep the icon at its intended size while filling the larger space.
- **Never scale screenshots down to fit a small space.** 16px UI text becomes ~4px when shrunk 70% — unreadable. Solutions: take the screenshot at a smaller viewport, show only a cropped portion, or draw a simplified wireframe version with placeholder lines replacing text.
- **Handle user-uploaded images safely:**
  - Always constrain to a fixed container size; crop to fill using `object-fit: cover` or `background-size: cover`.
  - Prevent background bleed (when the image background matches the page) with a subtle inner box shadow or semi-transparent inner border — not an opaque border that clashes with image colors.

---

### Finishing Touches

- **Supercharge default elements:**
  - Replace bullet points with meaningful icons (checkmarks, padlocks, arrows)
  - Make blockquote/testimonial marks oversized visual elements in a brand color
  - Style custom checkboxes and radio buttons with brand colors instead of browser defaults
  - Give links rich custom underlines (colored, thick, offset) instead of the default underline
- **Add color with accent borders.** A colored border-top on a card, border-left on an alert, or a short border-bottom on a headline adds visual flair without graphic design skills. Works at the layout level too (a top-of-page accent stripe).
- **Decorate backgrounds to break monotony:**
  - Use a lightly contrasted repeating pattern (see Hero Patterns) — keep contrast low so content stays readable
  - Apply a subtle gradient (use hues no more than ~30° apart for natural-looking results)
  - Place geometric shapes or partial pattern sections at specific positions rather than tiling the whole background
- **Always design the empty state.** It's the first thing a new user sees. It should include an illustration or image, a clear explanation of what the section is for, and a prominent CTA to get started. Hide filter/sort controls in empty states — they're meaningless with no content.
- **Use fewer borders.** Borders add visual noise. Before adding one, consider:
  - A box shadow (subtle outline without weight)
  - Adjacent elements with slightly different background colors
  - Simply adding more spacing between sections
- **Think outside the box on components.** Dropdowns don't have to be plain link lists — use columns, icons, or supporting text. Tables can combine related columns into richer cells with hierarchy. Radio buttons can become selectable cards. Don't let convention constrain the design.

---

### Personality & Consistency

- **Every design has a personality — pick one deliberately:**
  - Elegant/classic → serif typeface
  - Playful → rounded sans-serif, larger border radius
  - Neutral/professional → clean sans-serif, small or no border radius
  - The personality should be consistent across font choice, color, border radius, and copy tone
- **Border radius must be consistent.** Mixing square and rounded corners in the same interface almost always looks worse than committing to one style.
- **Copy tone is part of the design.** "An error occurred." vs "Oops, something went wrong!" communicate completely different personalities. Choose a register and stay consistent throughout.

---

## Part 2 — The Design of Everyday Things (Don Norman)

The complete set of human-centered design principles from Don Norman's _The Design of Everyday Things_ (Revised & Expanded Edition).

### Chapter 1: Fundamental Principles of Interaction

**The two most important characteristics of good design:**

- **Discoverability** — Users can always determine what actions are possible, where, and how to perform them — without labels, signs, or trial and error.
- **Understanding** — Users can form an accurate model of how the system works. The design communicates its purpose, structure, and operation.

When hand-lettered signs appear on doors, switches, or products telling people what to do and what not to do, that is a signal of poor design.

**Affordances**
An affordance is the _relationship_ between the properties of an object and the capabilities of the agent interacting with it — not a property of the object alone. A chair affords sitting; a button affords pressing. Affordances define what actions are _possible_. They can be visible or invisible.

- Visible affordances provide strong clues about how to interact with something without labels.
- Anti-affordances prevent certain interactions (glass blocks passage; a wall prevents entry).
- If an affordance is not perceivable, a _signifier_ is required.

**Signifiers** (more important than affordances for designers)
A signifier is any perceivable indicator — a mark, sound, or physical cue — that communicates appropriate behavior. Signifiers specify _where_ and _how_ to interact. They can be deliberate (a push plate on a door) or accidental (a worn path across a lawn).

> "In design, signifiers are more important than affordances, for they communicate how to use the design."

- Adding a label to a product to explain how to use it is a design failure.
- Electronic UIs need explicit signifiers (arrows, icons, highlighted regions) to show what is interactive.

**Mapping**
The relationship between controls and the things they affect. Natural mapping uses spatial correspondence:

- To move something up, move the control up.
- Controls close to (or arranged like) the things they control require no labels.
- Best: controls mounted directly on the item.
- Second-best: controls adjacent to the item.
- Third-best: controls arranged in the same spatial pattern as the items.

Cultural mapping differences exist: what feels "natural" in one culture may not in another (e.g., time direction: left-to-right vs. right-to-left cultures).

**Feedback**
Every action must produce immediate, informative confirmation. Users must always know what happened and what state the system is now in.

- Feedback must be **immediate**: even a tenth-of-a-second delay is disconcerting.
- Feedback must be **informative**: not just "something happened," but _what_ happened.
- **Poor feedback** (cryptic beeps, disappearing messages, no confirmation) is worse than no feedback — it is distracting, uninformative, and anxiety-provoking.
- **Too much feedback** causes users to ignore all of it. Prioritize: unimportant info unobtrusively; critical signals prominently.

**Conceptual Models**
A conceptual model is a simplified explanation of how something works. It doesn't need to be complete or accurate — just useful. The design must project all the information needed for users to form a correct conceptual model.

- The **designer's model** (how it was intended to work), the **system image** (what can be perceived from the physical structure, documentation, signifiers), and the **user's mental model** (what users infer through interaction) must align.
- The system image is the only bridge between designer and user. If it's incoherent or wrong, the user forms a wrong model.
- A **false conceptual model** (e.g., two refrigerator dials that look independent but aren't) makes it impossible to operate the system correctly.
- Without a good model, users operate by rote and cannot recover from novel situations or errors.

**The Paradox of Technology**
The same technology that simplifies life by providing more functions also complicates life by making devices harder to learn and use. Every new function added is a design challenge.

---

### Chapter 2: The Psychology of Everyday Actions

**The Gulfs**
Users face two gulfs when interacting with any system:

- **Gulf of Execution** (how do I use this?) → Bridge with: signifiers, constraints, mappings, feedforward, and a clear conceptual model.
- **Gulf of Evaluation** (what just happened?) → Bridge with: feedback and a clear conceptual model.

When people fail to use things and blame themselves, the blame belongs to the design.

**The Seven Stages of Action**

1. **Goal** — form the goal
2. **Plan** — plan the action sequence
3. **Specify** — specify the action sequence
4. **Perform** — execute the action
5. **Perceive** — perceive the state of the world
6. **Interpret** — interpret the perception
7. **Compare** — compare outcome with goal

Anyone using a product should always be able to answer all seven corresponding questions. Designers must ensure every stage is supported.

**Feedforward vs. Feedback**

- **Feedforward** answers "what can I do?" and "what will happen?" Achieved through signifiers, constraints, and mappings.
- **Feedback** answers "what did happen?" Must be immediate, meaningful, and prioritized.

**Three Levels of Processing**
All three operate simultaneously and must all be designed for:

1. **Visceral** — immediate sensory response (appearance, sound, feel). Style, aesthetics, and first impressions live here. Designers use aesthetics to drive visceral responses.
2. **Behavioral** — home of learned skills and interaction fluency. Every action creates an expectation; feedback confirms or denies it. Frustration, anxiety, satisfaction, and relief are behavioral emotions. Feedback provides reassurance even when it indicates failure; _lack_ of feedback creates a feeling of lost control.
3. **Reflective** — conscious reasoning, memory, and storytelling. This is where deep understanding, pride, guilt, and recommendation live. Memories last long after the interaction ends. A frustrating ending ruins an otherwise good experience; a memorable delight can redeem friction. (See also: Peak-End Rule.)

> "Reflective memories are often more important than reality."

**Flow**
The optimal experience occurs when challenge slightly exceeds skill. Too easy = boredom; too hard = anxiety. Calibrate challenge to the user's level.

**Subconscious vs. Conscious Thought**

- Most human behavior is subconscious and fast. Conscious thought is slow, labored, and limited.
- Cognition and emotion cannot be separated. Every action carries expectations; those expectations drive emotions.
- Positive emotional states promote creativity; negative states promote focus. Both extremes are dangerous.

**People as Storytellers**
Humans are predisposed to find causes and form stories. Conceptual models are a form of story. When designs don't communicate clearly, people construct their own (often wrong) models and then blame themselves for subsequent failures.

**Design Must Accommodate Human Behavior**

- Never design for the user you wish you had. Design for users as they actually are.
- Eliminate the word "human error." Replace with "design error." When many people make the same error, the design is at fault.
- Replace error messages with guidance. Allow people to continue without restarting.
- Make it possible to correct problems directly from help messages.

---

### Chapter 3: Knowledge in the Head and in the World

**Precise behavior from imprecise knowledge:**

1. Knowledge is distributed between head and world.
2. Great precision is not always required.
3. Natural constraints in the world restrict possible behavior.
4. Cultural constraints and conventions narrow choices further.

**Memory Is Knowledge in the Head**

_Short-Term / Working Memory (STM)_

- Capacity: ~5 items (treat as 3–5 for practical design purposes).
- Fragile: any distraction wipes it.
- Implication: never require users to hold more than ~3 items in working memory to complete a step. Never display critical information in a message that immediately disappears.

_Long-Term Memory (LTM)_

- Reconstructive, not reproductive — subject to distortion and bias.
- Two types: **declarative** (facts, rules: easy to teach, easy to write) and **procedural** (skills, how-to: best taught by demonstration and learned through practice).
- Retrieval is pattern-matching, slow, and fallible.

**Knowledge in the World**
When the knowledge needed to perform a task is available in the environment (via signifiers, constraints, mappings), the cognitive burden on the user decreases dramatically.

> "The most effective way of helping people remember is to make it unnecessary."

**The Tradeoff**

| Knowledge in the World                | Knowledge in the Head                   |
| ------------------------------------- | --------------------------------------- |
| Always available and self-reminding   | Fast and efficient once learned         |
| No learning required                  | Requires learning (can be considerable) |
| Can be slow (must find and interpret) | Can be automated after overlearning     |
| Easy on first encounter               | Hard on first encounter                 |
| Can look cluttered                    | Allows cleaner, more elegant appearance |

**Natural Mapping Rules**
Stove burner example: arranging 4 burners in a rectangle with 4 controls in a line creates ambiguous mapping. Fix: arrange controls in the same spatial pattern as the burners, or mount them directly on/next to each burner.

Three levels of natural mapping (in decreasing effectiveness):

1. Controls mounted directly on the item being controlled
2. Controls adjacent to the item
3. Controls arranged in the same spatial configuration as the items

**Culture Shapes What Feels "Natural"**
What seems like an obvious mapping in one culture (top = forward) may be the opposite in another. Always validate with representative users.

**Approximate Models Are Fine**
Scientific accuracy is not required. Useful approximations that produce correct behavior are sufficient. The goal is a model that works for the task at hand, not one that is theoretically complete.

---

### Chapter 4: Constraints, Discoverability, and Feedback

**Four Kinds of Constraints**

1. **Physical** — shape, size, material properties that limit what can be done (a key fits only one lock).
2. **Cultural** — learned conventions of behavior; powerful but can change with generations.
3. **Semantic** — meaning of the situation limits possible actions (a seat faces the direction of travel).
4. **Logical** — rational deduction from the spatial layout makes some options impossible (only one remaining item can go in the last space).

**Forcing Functions**
Physical constraints that prevent the next step from happening if the current step is wrong or incomplete:

- **Interlocks** — force proper sequence (microwave door interlock cuts power when opened).
- **Lock-ins** — keep an operation active; prevent premature exit (confirmation dialog before closing unsaved work).
- **Lockouts** — prevent entering a dangerous space or triggering a dangerous action (child-proof caps; gate blocking stairs to basement during fire).

Forcing functions can be nuisances in normal use. Minimize nuisance value while retaining the safety benefit.

**Conventions as Cultural Constraints**
Conventions allow users to apply learning from previous products to new ones. They are powerful guides for novel situations but make change painful. Key principle:

> "Consistency in design is virtuous. If a new way of doing things is only slightly better, it is better to be consistent. But if there is to be a change, everybody has to change."

**Activity-Centered Controls vs. Device-Centered Controls**
Design controls around _activities_ (video presentation, lecture mode), not _devices_ (lights, sound, projector separately). Activity-centered controls anticipate what users need at each stage of a task and make it available in one place.

**Standardization: The Last Resort**
When no natural mapping is possible and no other solution exists:

> "Standardize. Design everything the same way, so people only have to learn once."

Standards must reflect psychological conceptual models, not physical mechanics.

**Sound as Signifier**
Sound provides information unavailable through any other channel — and it works when eyes are occupied elsewhere.

- Natural sounds (click, hiss, thud) carry rich meaning about what is happening.
- Artificial sounds must be: **alerting** (indicate presence), **orienting** (convey direction, speed), and **non-annoying** (infrequent short warnings can be aggressive; continuous background sounds must not irritate).
- Silence can be dangerous: electric vehicles below ~30 km/h produce no sound that pedestrians can detect.
- Too many warning sounds cause operators to disable all of them.

**Skeuomorphism**
Incorporating old, familiar forms into new technologies eases the transition by allowing users to apply existing conceptual models. Purists deride it; in practice, it reduces learning cost during paradigm shifts. Eventually, genuinely new forms emerge.

---

### Chapter 5: Human Error? No, Bad Design

**The Core Principle**
75–95% of industrial accidents are attributed to "human error." When the percentage is that high, the cause is the design, not the people. When many people make the same error, redesign the system.

> "Eliminate the term human error. Instead, talk about communication and interaction."

**Root Cause Analysis — The Five Whys**
Never stop asking "why?" when a human error is found. That is when the real investigation begins. Keep asking until the fundamental systemic cause is identified. Blame and train is not a fix; the same error will recur.

**Two Categories of Error**

_Slips_ — right goal, wrong action; occur when conscious attention is diverted:

- **Action-based slips**: capture errors (routine habit overrides intended action), description-similarity errors (acted on the wrong but similar object), mode errors (correct action for wrong mode).
- **Memory-lapse slips**: forgot to do a step; often caused by interruptions.

_Mistakes_ — wrong goal or wrong plan:

- **Rule-based mistakes**: wrong rule selected (often from misclassifying the situation).
- **Knowledge-based mistakes**: novel situation; insufficient knowledge or wrong model; hardest to detect.
- **Memory-lapse mistakes**: forgot the overall goal or plan.

Novices make more mistakes; experts make more slips.

**Mode Errors Are Design Errors**
If equipment doesn't make its current mode clearly visible, mode errors are inevitable. Minimize modes. When modes are necessary, always display the active mode prominently.

**Social and Institutional Pressures**
Economic pressure, time pressure, social hierarchy, and cultural norms all push people toward unsafe behavior. Design must account for these forces; good design alone is not sufficient — culture and incentives must also change.

**Designing for Error**

1. Understand the causes and design to minimize them.
2. Perform **sensibility checks**: flag actions that seem out of range (e.g., a radiation dose 1,000× normal).
3. Make actions **reversible** — provide Undo at multiple levels.
4. Make errors **discoverable and correctable** — the sooner the better.
5. Don't treat user actions as errors; treat them as approximations to what is desired and help the user complete the action.
6. Provide perceptible feedback about what action was taken and what the new state is.

**Checklists**
Proven to reduce slips and memory lapses in complex, multi-step tasks. Most effective when done collaboratively (one reads, one executes). Resist the temptation to impose sequential order when the task itself doesn't require it; electronic checklists can track skipped items.

**The Swiss Cheese Model of Accidents (James Reason)**
Accidents require multiple independent failures (holes in cheese slices) to align. Well-designed systems add more defensive layers (more cheese slices), reduce the number of holes, and alert operators when holes are starting to line up. There is almost never a single cause of a major accident.

**Poka-Yoke (Error-Proofing)**
Add simple fixtures, shapes, jigs, or physical constraints that make it impossible to perform an action incorrectly. Asymmetric screw holes, size-coded connectors, guards over critical switches — all are practical applications of affordances, signifiers, mapping, and constraints.

---

### Chapter 6: Design Thinking

**The Double-Diamond Model**
Two phases, each diverging then converging:

1. **First diamond**: Discover the _right problem_. Observe broadly → define the problem narrowly.
2. **Second diamond**: Develop the _right solution_. Explore widely → deliver a specific solution.

The hardest part of design is getting the requirements right. Requirements made in the abstract are almost always wrong. Requirements produced by asking people what they need are also almost always wrong. Requirements are developed by _watching_ people in their natural environment.

**The HCD Process (Human-Centered Design)**

1. **Observe** — study real users in real contexts. People are often unaware of their true needs and the difficulties they face.
2. **Generate ideas** — brainstorm widely; avoid fixating on one or two ideas too early; question the obvious.
3. **Prototype** — build quickly and cheaply; sketches, foam models, Wizard of Oz simulations.
4. **Test** — ~5 people per iteration reveals most usability problems (Jakob Nielsen). Observe; do not instruct.
5. **Iterate** — each iteration makes the problem definition and solution clearer. "Fail often, fail fast."

**Norman's Law of Product Development**

> "The day a product development process starts, it is behind schedule and above budget."

The HCD ideal rarely survives contact with real schedules and budgets. The solution: keep design researchers always studying users between product cycles so research is ready when needed; use multidisciplinary teams that share requirements from day one.

**Activity-Centered vs. Human-Centered Design**
For global products serving diverse populations, design for _activities_ rather than for a specific individual. Activities are universal even when people differ. Users will tolerate complexity and learning if the demands feel appropriate to the activity.

**Task vs. Activity**

- **Activity**: high-level goal ("go shopping", "listen to music").
- **Task**: lower-level component of an activity ("drive to market", "find a playlist").

Design must support both. Apple's iPod success came from supporting the _entire activity_ of music enjoyment (discovering, purchasing, organizing, listening, sharing), not just the task of playing a file.

**Iterative vs. Waterfall Methods**
Neither is universally superior. Best practice combines both: iteration inside stages (between gate reviews), with management checkpoints at gates. Early iterations with rapidly deployed prototypes defer rigid specification until you know enough to get requirements right.

**Complexity Is Good; Confusion Is Bad**
Do not confuse the two. A kitchen is complex, but not confusing — if you understand it. Complexity is necessary to match life's tasks. Confusion is undesirable, and the cure is a good conceptual model.

**Inclusive / Universal Design**
Designing for people with special needs often benefits everyone:

- Large, high-contrast type helps everyone in dim light.
- The OXO vegetable peeler, designed for someone with arthritis, became a bestseller because it was simply a better peeler.
- Flexibility (adjustable seats, scalable fonts, alternative routes) is the best strategy when fixed designs inevitably fail some users.

**Deliberately Hard Design**
Some things _should_ be hard to use: child-proof caps, security systems, two-person authentication switches, emergency overrides. Knowing the rules of good design tells you exactly which rules to violate — and where.

---

### Chapter 7: Design in the World of Business

**Featuritis and Creeping Featurism**
Every successful product attracts pressure to add features:

- Existing customers request more.
- Competitors add features and sales teams demand parity.
- Markets saturate, forcing "upgrades" to sustain sales.

The result is products that grow in complexity until they become unusable. There is no budget to remove old features.

Counter-strategy: focus on strengths, not weaknesses. Differentiate instead of matching. "Good enough" in areas that don't matter; exceptional in areas that do.

**Two Forms of Innovation**

- **Incremental innovation**: steady, continuous improvement of existing products; most common; the heart of HCD; always finds the _local_ peak.
- **Radical innovation**: starts fresh, driven by new technology or a reconceptualization of the problem; paradigm-shifting but rare; most radical ideas fail; even successful ones take decades (sometimes centuries) to be adopted.

Both are necessary. HCD methods are well-suited to incremental innovation but cannot lead to radical innovation on their own.

**Technology Changes; People Stay the Same**
Human psychology evolves on a scale of millennia; technology changes in years. The principles in this book are based on psychology, so they remain valid even as specific technologies change. Design principles built on human cognition, emotion, action, and interaction are permanent.

**The Moral Obligations of Design**
Planned obsolescence, unnecessary models, and fashion-driven product cycles have real environmental costs. Designers have a responsibility to ask whether a new product is genuinely needed and whether it can be produced and disposed of sustainably.

**The Rise of the Small**
New technologies — 3-D printing, open-source hardware, global distribution platforms — empower individuals and small groups to design and manufacture. Innovation is no longer the exclusive domain of large corporations. The best innovations increasingly come from people designing for their own real needs.

---

## Common Failure Modes to Watch For

When applying these principles in practice, these are the most common mistakes to audit for in any interface. They draw from both Refactoring UI (visual execution) and Don Norman (cognitive interaction).

### Visual & Structural

- **Flat hierarchy** — every element rendered with equal weight, color, and size. Nothing draws the eye. Re-rank: emphasize the primary, soften the secondary, hide the tertiary.
- **Ambiguous spacing** — equal gaps between unrelated and related elements. Increase between-group spacing or decrease within-group spacing.
- **Off-scale values** — arbitrary pixel sizes, off-palette colors, or hand-tuned shadows that don't belong to a defined system. Snap to the scale; if the scale doesn't fit, extend the scale, don't bypass it.
- **Grey text on a colored background** — looks washed out and reduces contrast against the background. Use a hue-matched tinted color instead.
- **Color-only state communication** — red/green badges with no icon or label. Add a redundant signal (icon, text, pattern).
- **Decorative shadows** — shadow scales applied for "pop" rather than to indicate elevation. Tie every shadow to a layer in the elevation scale.
- **Inconsistent border radius** — square inputs next to rounded cards. Pick one and stick with it.

### Interaction & Cognition

- **Missing signifiers** — an interactive element that exists but is invisible. Users don't know it's there. Add discoverable signifiers (hover states, labels, icons, distinct visual styling).
- **Broken feedback loop** — an action (click, submit, drag) with no perceptible state change. Every action needs immediate feedback within ~100ms.
- **False conceptual model** — a UI that _looks_ like it has independent controls but doesn't, or implies one behavior and delivers another. Audit for misleading affordances.
- **Mode errors** — an element that behaves differently depending on context without making the current mode visible.
- **Memory overload** — a flow that requires users to hold more than ~3 pieces of information in working memory between steps. Externalize information into the UI.
- **Forcing functions missing** — a destructive or irreversible action without a lock-in (confirmation step) or an undo mechanism.
- **Inconsistent conventions** — diverging from platform/app norms without strong justification, forcing users to relearn what they already know.
- **Unprioritized feedback** — every notification competing for attention with the same weight, training users to ignore all of them.

### Process & Scope

- **Featuritis** — adding options and configurations until the product becomes unusable. Prefer focused new components over endlessly growing old ones. Differentiate instead of matching competitors.
- **Designing for the user you wish you had** — assuming patient, attentive, technically literate users instead of designing for distracted, hurried, real ones.
- **No empty state** — the first thing a new user sees is a blank screen or a lonely "0". Always design the empty state with an explanation and a clear next action.
- **Solving the stated problem instead of the real one** — skipping observation and root-cause analysis. Ask "why?" five times before committing to a solution.
- **Designing the shell first** — building nav, sidebar, and chrome before any real feature exists. Design a real feature, _then_ let the shell emerge from what the feature needs.

# Concept Art Prompts

> Output from these prompts is **concept art, not in-game footage**, and must be
> labelled as such anywhere it is shown. `src/site.ts` badges every image
> automatically at the injection point, so new art cannot be published
> unlabelled — keep it that way rather than hand-writing captions.

Ten prompts for image generation (Stable Diffusion / Midjourney / Flux), built
from the locked art direction in `GAME_DESIGN.md § 8.8`, `§ 10.1` and
`DECISIONS.md` D-005.

**These are design documents, not just prompts.** Each one encodes decisions
that are easy to lose: fossil-not-machinery, hue-shifted shadows, overgrowth as
real material, and the four "explicitly NOT" constraints that keep each race
from reading as a StarCraft faction.

---

## How to use these

**The shared style suffix.** Append to any prompt for consistency:

```
Studio Ghibli influenced, warm painterly lighting, low-poly stylised 3D,
natural asymmetry, hand-painted textures, soft rim light, shadows that shift
hue toward violet and teal rather than going black, three-tone colour ramp
(cool shade / saturated midtone / warm sunlit highlight), golden hour,
cinematic composition, concept art, high detail
```

**The shared negative prompt.** This one matters more than the positives — it
is what stops the generator defaulting to sci-fi clichés:

```
photorealistic, gritty, desaturated, grimdark, black shadows, harsh contrast,
sci-fi power armour, space marine, mecha, exposed gears, cogs, pistons, visible
joints, hydraulics, steampunk, brass, rivets, glowing red eyes, neon, chrome,
metallic sheen, hard surface panelling, text, watermark, signature, oversaturated
```

**Why the negatives are so long:** every one of them is a failure mode the
design explicitly rejects. Cohort must not read as Terran, Necron or
steampunk; the palette must never go grimdark. Drop these and the model will
reliably give you a space marine.

---

## 1. Cohort Legionnaire — the core melee unit

> The single most important image. It defines the whole race.

```
Ancient guardian statue-warrior standing in tall summer grass, fossil-proportioned
not mechanical — closer to a weathered skeleton than a robot, carved from
bone-pale limestone, no visible joints or gears anywhere, broad and low and
heavy, carrying a large stone shield, soft warm-gold light glowing from within
cracks in its chest and eye sockets like embers seen through bone, moss and
lichen and tiny white flowering vines collected thickly in the seams of its
body the way sediment collects in real fossils, one shoulder overgrown, quiet
and patient and not hostile, ancient and still faintly alive
```

**Negative:** shared negative + `robot, android, armour plating, weapons technology`

**Getting it right:** if it reads as a *robot*, the prompt failed. Push harder
on "fossil", "carved", "skeleton", "statue". The Laputa guardians in *Castle in
the Sky* are the target — armed, ancient, and gently overgrown at once.

---

## 2. Cohort Marksman — the ranged unit

```
Tall narrow ancient guardian figure of bone-pale weathered stone, slender and
elongated compared to its broader kin, holding a long carved stave of fossil
bone angled back over one shoulder, standing perfectly still on a grassy ridge
in warm afternoon light, pale green internal glow leaking from hairline cracks
along the stave and from its narrow eye slits, less moss than its heavier
kin — worn closer to bare bone from constant use, poised and motionless,
silhouette reads instantly as "ranged" at a distance
```

**Negative:** shared negative + `rifle, gun, firearm, scope, muzzle flash`

**Note:** silhouette legibility is a real gameplay requirement — the Legionnaire
is broad and low, the Marksman narrow and tall. The reader must tell them apart
at a glance from a distant camera.

---

## 3. Cohort Standard — the main base structure

```
Ancient circular temple-machine half-buried in a green hillside, drum-shaped
base of bone-pale weathered stone, six enormous curved ribs rising and leaning
inward like the ribcage of a colossal fossil, no doors and no mechanism visible
anywhere, a soft warm-gold light pulsing gently from a crystalline core
suspended at its centre, thick moss and wildflowers gathered in every seam and
crevice, grass growing right up to and over its base, birds nesting in the ribs,
it looks like it has been here for ten thousand years and is still working
```

**Negative:** shared negative + `factory, industrial, smokestack, antenna, door, window`

---

## 4. Cohort Worker and an essence node

```
Small rounded ancient stone caretaker figure, bone-pale and heavily overgrown
with moss, gently cupping a floating luminous teal crystal shard in both hands,
kneeling beside a cluster of larger glowing cyan-teal crystals growing out of a
grassy hillside like quartz from rock, the crystals cast soft turquoise light
onto the surrounding grass and onto the figure's pale stone, warm afternoon sun
from the opposite side making the two colours meet, peaceful, unhurried
```

**Negative:** shared negative + `mining equipment, drill, machinery, cart`

---

## 5. Mycora — Life, the opposing force

```
Towering figure of walking wood and animate root, bark-skinned and shaggy with
moss, fungal caps and pale luminous spores growing along its shoulders and
spine, ferns and creeping vines trailing from its limbs, striding through a
forest it is visibly part of, the ground beneath it thick with spreading green
overgrowth, soft dappled light through a canopy, immense and patient and utterly
indifferent to people, beautiful and quietly threatening at once
```

**Negative:** shared negative + `zombie, undead, insects, swarm, hive, carapace, chitin, monster, teeth, claws`

**Note:** the reference is the Sea of Corruption in *Nausicaä* — fungal spread
as a vast natural process, not a monster. Explicitly **not** a swarm of small
creatures; that is Zerg and the design rejects it.

---

## 6. Conclave — Water, "The Current"

```
Elegant scholar-navigator figure in flowing layered robes, standing on a stone
lock-gate between two canals, ribbons of clear water visibly flowing upward and
outward from their hands and along carved stone channels into the surrounding
architecture, aqueducts and reflecting pools connecting a settlement of pale
stone terraces, every structure linked by visible running water, sunlight
scattering off the surface into caustic patterns on the stone, calm and
deliberate and deeply intelligent
```

**Negative:** shared negative + `psionic, energy shields, glowing runes, magic circles, crystals, cables, wires, floating rocks`

**Note:** the network is *literally water* — canals, locks, cisterns. Not energy,
not psionics (that is Protoss), not cables.

---

## 7. Titanfolk — Earth, land given form

```
Colossal humanoid figure made of living geology, granite and slate and seams of
exposed ore, grass and small trees growing on its shoulders and back like a
hillside because that is effectively what it is, standing waist-deep in a valley
it resembles, moving so slowly it might be mistaken for terrain, low morning mist
pooling around its legs, scale established by tiny birds circling its head,
immense, immovable, geological
```

**Negative:** shared negative + `golem, elemental, lava, fire, crystal armour, humanoid proportions`

---

## 8. Contested ground — Cohort vs Mycora ⭐

> The image that sells the whole game. Two forces of nature fighting over
> literal ground.

```
A hillside split down the middle by two spreading forces meeting: on one side
pale ash-grey barren earth creeping outward from an ancient bone-white ruined
structure, every plant reduced to skeleton and dust; on the other side vivid
green overgrowth surging back — moss, ferns, fungal blooms, creeping vine —
pushing into the ash and being pushed back, the boundary between them ragged and
alive and clearly moving, warm low sunlight raking across the contested line,
epic scale, wide cinematic landscape
```

**Negative:** shared negative + `fire, explosion, army, soldiers, battle, blood`

**Note:** this is the "contested ground cover" concept from `GAME_DESIGN.md §
8.8` — currently unscheduled but visually the strongest idea in the document.

---

## 9. The war table — the game's actual camera (D-014)

```
A living miniature landscape floating in a vast empty dark void, an island of
rolling green hills and tiny ancient stone structures and minute figures,
lit warmly from above as if by its own private sun, its underside a rough
floating shelf of rock and soil, faint volumetric light spilling off its edges
into the surrounding darkness, no horizon and no sky — only the void and the
lit table, the surrounding emptiness deep and quiet, sense of enormous scale
looking down at something small and precious
```

**Negative:** shared negative + `sky, clouds, horizon, room, table legs, hands, screen, UI, holographic scanlines, blue hologram`

**Note:** "hologram" in the design means *floating diorama*, **not** blue
translucent sci-fi projection. That's why it's in the negative.

---

## 10. Environment key art — day/night and terrain

```
Wide painterly landscape of rolling grassland hills at golden hour, scattered
faceted rocks and stylised low-poly trees casting long shadows, a bone-pale
ancient ruin overgrown with moss on a distant ridge, soft cloud shadows drifting
across the hills, clear layered depth from foreground grass through midground
hills to distant haze, sky graduating from warm gold at the horizon to deep
teal-blue overhead, no people, serene, expansive
```

**Variant — night (test the readability requirement):** replace *golden hour*
with

```
clear moonlit night, cool blue-violet ambient light, the landscape still fully
readable and never black, warm gold light glowing from distant ancient ruins
```

**Note:** the night variant is a genuine design constraint, not a mood piece.
Night must lift ambient well above physical darkness — a strategy game that is
hard to read at night is one people refuse to play at night (D-013).

---

## What to generate first

If you only run three, run **1 (Legionnaire)**, **8 (contested ground)** and
**9 (war table)**. Those three settle the questions with the most downstream
consequences: whether the fossil-not-machine read actually lands, whether the
two-forces-of-nature premise is legible, and whether the floating-diorama camera
looks like a game or like a tech demo.

Feed anything good back into `ART_REFERENCES.md`.

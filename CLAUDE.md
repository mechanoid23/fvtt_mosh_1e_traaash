# CLAUDE.md — fvtt_mosh_1e_traaash

Module ID: `fvtt_mosh_1e_traaash`

## Format

NeDB compendium packs — one JSON document per line in `.db` files under `packs/`. Edit directly as text.

## Pack contents

| Pack file | Content |
|---|---|
| `rolltables_traaash_1e.db` | "The Company" (1d10) and "Jubilee — Debt Source" (1d10) rolltables |
| `macros_traaash_1e.db` | "Roll: The Company" macro |
| `items_pet_skills_1e.db` | 17 pet skills (7 Trained / 5 Expert / 5 Master) with prerequisite tree — stored as `type: "pet_skill"` (not `"skill"`) so MCG's skill picker, which scans all Item compendiums for `d.type === "skill"`, does not include them |

## Rolltable IDs

| Table | ID |
|---|---|
| The Company | `CompanyMotiv1e01` |
| Jubilee — Debt Source | `JubileeDebtD10X1` |

## Macro IDs

| Macro | ID |
|---|---|
| Roll: The Company | `TrMacRollComp01X` |

## Architecture

`scripts/traaash-hooks.js` contains all logic, organised into three sections: Settings, Ready, and one section per feature.

### Settings (`Hooks.once("init")`)

Settings are registered in `init` (required by Foundry before `ready`). Each feature has one `Boolean` setting with `scope: "world"` and `config: true`, so they appear in **Game Settings → Configure Settings → Module Settings** and are changeable only by GMs.

| Setting key | Default | Status | Effect when `false` |
|---|---|---|---|
| `enableCompany` | `true` | Fully wired | Suppresses `traaash.skillsChosen` listener, `createItem` watcher, and `renderActorSheet` Bio tab injection |
| `enablePetSkills` | `true` | Fully wired | Suppresses the `renderItemSheet` pet skill tree injection. Compendium pack is always present (Foundry cannot hide declared packs at runtime), but the in-sheet tracker is hidden when off. |

New feature settings should be added here following the same pattern. If a future feature has a runtime hook, guard it with `game.settings.get(MODULE_ID, "<key>")` at the top of that hook handler.

### Core functions

- `rollCompanyMotivation(actor)` — core function; exposed as `game.traaash.rollCompanyMotivation` after `ready`
- `confirmCompanyRoll(actorName)` — version-compatible confirm dialog: uses `DialogV2` on Foundry v12+, falls back to legacy `Dialog` on v11

### The Company feature (guarded by `enableCompany`)

Two triggers fire `_promptCompany(actor)`, with the hook cancelling the fallback if both would fire:

**Primary** — `traaash.skillsChosen` hook (requires MCG v1.0.3+): `mcgChooseSkillsA` fires `Hooks.callAll("traaash.skillsChosen", myActor)` immediately after skills are confirmed. This cancels the fallback timer and prompts without delay.

**Fallback** — `createItem` watch: when `updateActor` fires with a new class, the actor is added to `_pendingCompany` (a `Map<actorId, timerId|null>`). Each skill item created on that actor resets a 5-second debounce timer. When the timer fires (no new skills for 5s), Company is prompted. Handles older MCG versions, world-imported macro copies, or any case where the hook never fires.

- `renderActorSheet` hook — injects The Company block at the top of the Bio tab (`.tab[data-tab="description"]`) on all character sheets. Skipped entirely when `enableCompany` is off.

### The Company block (Bio tab)

Rendered at the top of the Bio tab, above the biography editor. Contains:
- Header: "THE COMPANY" (uppercase, dark red `#8b1a1a`)
- Description: *"Motivation to carry out the mission, even in the face of the horrors to come."*
- Full result text, e.g. `"Family Member's Debt — Someone you love owes the company big. You're the collateral."`
- No reroll button — a GM can reroll via `game.traaash.rollCompanyMotivation(actor)` in the console

### Actor flags (namespace `fvtt_mosh_1e_traaash`)

| Flag | Description |
|---|---|
| `company` | Full display string stored after rolling, e.g. `"Student Debt — The corporation paid for your higher education..."`. For Jubilee, appends `" Debt source: <result>."`. For Mole, appends `" Rival corp leverage: <full text>"`. |
| `company_roll` | Raw d10 result (1–10) |
| `company_jubilee` | Jubilee sub-table result text (set when roll = 6) |
| `company_mole_reason` | Short text of rival corp's leverage (set when roll = 10) |

### Jubilee (roll = 6)

Automatically rolls the Jubilee sub-table. Appends debt source to the display string.

### Mole (roll = 10)

Re-rolls 1d10 until the result is not 10, then looks up that result in the main table as the rival corporation's leverage. Appends the full rival result text to the display string.

## Pet Skill Tree

Pack: `items_pet_skills_1e.db`. All item IDs are in `Compendium.fvtt_mosh_1e_traaash.items_pet_skills_1e.Item.<id>`.

**Document type is `"pet_skill"`, not `"skill"`.** MCG's `mcgChooseSkillsA` macro scans all Item compendiums for documents where `d.type === "skill"` to build its skill pool. Using `"pet_skill"` keeps pet skills out of that pool. Do not change this back to `"skill"` — traaash runtime uses the hardcoded `PET_SKILLS` array exclusively and never queries these compendium documents.

### Skill IDs

| ID | Name | Rank | Prerequisite IDs |
|---|---|---|---|
| `Tr1CalmUndrFire0` | Calm Under Fire | Trained | — |
| `Tr2ToothAndClaw0` | Tooth & Claw | Trained | — |
| `Tr3TrackingPet00` | Tracking | Trained | — |
| `Tr4ForagingPet00` | Foraging | Trained | — |
| `Tr5RimwisePet000` | Rimwise | Trained | — |
| `Tr6SafetyPet0000` | Safety | Trained | — |
| `Tr7AthleticsPet0` | Athletics | Trained | — |
| `Ex1CompanionTrng` | Companion Training | Expert | `Tr1CalmUndrFire0` |
| `Ex2MilitaryTrng0` | Military Training | Expert | `Tr2ToothAndClaw0` (also via Calm Under Fire or Tracking) |
| `Ex3HuntingPet000` | Hunting | Expert | `Tr3TrackingPet00` (also via Tooth & Claw) |
| `Ex4DetectPet0000` | Detect | Expert | `Tr3TrackingPet00` (also via Foraging or Rimwise) |
| `Ex5ZeroGTraining` | Zero-G Training | Expert | `Tr7AthleticsPet0` (also via Safety) |
| `Ms1PanicTraining` | Panic Training | Master | `Ex1CompanionTrng` |
| `Ms2XenoTracking0` | Xeno Tracking | Master | `Ex2MilitaryTrng0` |
| `Ms3SearchRescue0` | Search & Rescue | Master | `Ex3HuntingPet000` (also via Detect) |
| `Ms4DetectSubst00` | Detect Substance | Master | `Ex4DetectPet0000` |
| `Ms5DetectDisease` | Detect Disease | Master | `Ex4DetectPet0000` |

### How pet skill tracking works

Pet items in the mosh system are `type: "item"` gear documents (Cat, Dog, "Pet (Organic)", etc.). Foundry does not allow embedded items inside item documents, so skills cannot be attached natively.

traaash injects a skill tree tracker directly into the item's sheet via `renderItemSheet`:

1. For any owned `type: "item"` document, a subtle "Track pet skills →" link appears at the bottom of the item sheet.
2. Clicking it sets `item.flags.fvtt_mosh_1e_traaash.petSkillsEnabled = true` and re-renders the sheet.
3. The full 17-skill tree then appears below the description, with checkboxes gated by prerequisites.
4. Selections are stored as `item.flags.fvtt_mosh_1e_traaash.petSkills = [<skillId>, ...]`.
5. Unchecking a skill cascades: any Expert/Master skills that depend on it are also cleared.

The `enablePetSkills` setting gates the entire injection (both the enable link and the tree). When off, the item sheet is unchanged.

### Prerequisite note

`prerequisite_ids` on the compendium skill items encodes the primary tree path (AND logic in the mosh system). The in-sheet tracker enforces the same prerequisite gates. Alternative paths shown in the ASCII tree and item descriptions are advisory.

## Source

Table content from: https://www.traaa.sh/d10-reasons-youre-in-the-corporations-pocket

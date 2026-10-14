# CLAUDE.md — fvtt_mosh_1e_traaash

Module ID: `fvtt_mosh_1e_traaash`

## Format

NeDB compendium packs — one JSON document per line in `.db` files under `packs/`. Edit directly as text.

## Pack contents

| Pack file | Content |
|---|---|
| `rolltables_traaash_1e.db` | "The Company" (1d10) and "Jubilee — Debt Source" (1d10) rolltables |
| `macros_traaash_1e.db` | "Roll: The Company" macro |

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

| Setting key | Default | Controls |
|---|---|---|
| `enableCompany` | `true` | The Company auto-prompt and Bio tab display |

New feature settings should be added here following the same pattern.

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

## Source

Table content from: https://www.traaa.sh/d10-reasons-youre-in-the-corporations-pocket

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

`scripts/traaash-hooks.js` contains all logic:

- `rollCompanyMotivation(actor)` — core function; exposed as `game.traaash.rollCompanyMotivation` after `ready`
- `confirmCompanyRoll(actorName)` — version-compatible confirm dialog: uses `DialogV2` on Foundry v12+, falls back to legacy `Dialog` on v11
- `updateActor` hook — detects when `system.class.value` is set for the first time (fires during the Character Generator flow); prompts to roll The Company if not yet rolled
- `renderActorSheet` hook — injects The Company block at the top of the Bio tab (`.tab[data-tab="description"]`) on all character sheets

### The Company block (Bio tab)

Rendered at the top of the Bio tab, above the biography editor. Contains:
- Header: "THE COMPANY" (uppercase, dark red `#8b1a1a`)
- Description: *"Motivation to carry out the mission, even in the face of the horrors to come."*
- Full result text, e.g. `"Family Member's Debt — Someone you love owes the company big. You're the collateral."`
- ↻ re-roll button

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

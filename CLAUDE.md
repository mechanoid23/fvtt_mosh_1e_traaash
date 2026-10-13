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
- `createActor` hook — auto-prompts to roll The Company on new character creation (500ms delay, DialogV2.confirm)
- `renderActorSheet` hook — injects "The Company:" banner above `nav.mosh.sheet-tabs` on all character sheets

Actor flags (namespace `fvtt_mosh_1e_traaash`):
- `company` — short display string, e.g. `"Student Debt"`, `"Jubilee (Gambling)"`, `"Mole (rival: Work Visa)"`
- `company_roll` — raw d10 result (1–10)
- `company_jubilee` — Jubilee sub-table result text (set when roll = 6)
- `company_mole_reason` — rival corp's leverage text (set when roll = 10)

## Source

Table content from: https://www.traaa.sh/d10-reasons-youre-in-the-corporations-pocket

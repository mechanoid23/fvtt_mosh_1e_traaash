**Install in Foundry VTT:** `https://raw.githubusercontent.com/mechanoid23/fvtt_mosh_1e_traaash/main/module.json`

> Community tables and extras from [traaa.sh](https://www.traaa.sh) for Mothership 1e.

## The Company

*Motivation to carry out the mission, even in the face of the horrors to come.*

Source: [https://www.traaa.sh/d10-reasons-youre-in-the-corporations-pocket](https://www.traaa.sh/d10-reasons-youre-in-the-corporations-pocket)

Each player rolls 1d10 at character creation to find out why they're in the corporation's pocket.

| d10 | Result |
|---|---|
| 1 | Student Debt — The corporation paid for your higher education or a critical training program. You owe them for the opportunity. |
| 2 | Body Modification — An experimental or costly procedure, fully covered by the corp. The debt keeps you close. |
| 3 | Family Member's Debt — Someone you love owes the company big. You're the collateral. |
| 4 | Scrip — You owe an enormous amount of company scrip. The interest compounds daily. |
| 5 | Work Visa — Your legal right to exist in this sector is company-sponsored. One word from them and you're gone. |
| 6 | Jubilee — You took out a Jubilee loan. *(roll sub-table)* |
| 7 | Set Up — You were framed for something you didn't do — or something you did. The corp holds the evidence. |
| 8 | Citizenship — They can make you a citizen, or unmake you. Your legal identity is their asset. |
| 9 | Investment — You used company capital for a private venture. It hasn't paid off. It may never. |
| 10 | Mole — You work for a rival corporation, embedded here. But they found out. Now they own you too. *(re-roll excluding 10 for rival corp's leverage)* |

### Jubilee Debt Source (d10)

| d10 | Source |
|---|---|
| 1 | Gambling |
| 2 | Drug Abuse |
| 3 | Education |
| 4 | Healthcare |
| 5 | Failed Business |
| 6 | Failed Market Speculation |
| 7 | Expensive Body Modification |
| 8 | Purchasing a Spacecraft |
| 9 | Criminal Extortion |
| 10 | Lawsuit |

## Features

- **Auto-prompt during character generation**: after the player confirms their skill choices in the Mothership Character Generator's Choose Skills step, a dialog offers to roll The Company — sequenced after skills, not concurrent with them
- **The Company field in the Bio tab**: displayed at the top of every character sheet's Bio tab, showing the full result text; GMs can reroll at any time via `game.traaash.rollCompanyMotivation(actor)` in the browser console
- **Jubilee sub-roll**: automatically rolls and appends the debt source when result is 6
- **Mole re-roll**: re-rolls excluding 10, appends the rival corp's full leverage text when result is 10
- **Roll: The Company macro**: select a token and run the macro to roll for any character at any time
- **Compendium tables**: The Company and Jubilee tables available for manual use in Foundry

## Android Subtype

Source: [https://www.traaa.sh/3-androids-for-mothership](https://www.traaa.sh/3-androids-for-mothership)

Android players choose a subtype during character creation that defines the nature of their mechanical existence:

| Subtype | Description |
|---|---|
| **Bioroid** | Biological constructs built instead of born. Function as humans — cryo-compatible, detectable only via careful testing or a critical scanner result. Standard Android stats. |
| **Synthetic** | Fully mechanical beings with synthetic skin and milky white internal fluids. Cannot be healed normally; immune to poison and disease; vulnerable to EMPs. Must charge 6 hours weekly or shut down. Rolls the **Android Panic Table**. |
| **Cyberized Human** | A human consciousness transferred into a robotic body. Choose a base class (PSG core: Marine, Scientist, Teamster — or any non-robotic RWC class) for saves and skills; stats are adjusted to reflect that class instead of standard Android. Uses Synthetic body rules. Rolls the **Android Panic Table**. |

- Auto-rolls a roleplay suggestion table for the chosen subtype and posts the result to chat
- Subtype description, rules, and roleplay feature display in the character sheet Bio tab
- Synthetic and Cyberized Human characters get a **Roll Android Panic** button in the Bio tab
- **Android Panic Table** (2d10, 19 results, range 2–30) is available in the *Traaa.sh Tables (1e)* compendium for manual use

## Pet Skill Tree

A tiered skill tree for pet companions, from [traaa.sh](https://www.traaa.sh). All 17 skills are available in the **Pet Skill Tree (1e)** compendium pack.

```
Trained (+10%)       Expert (+15%)          Master (+20%)
══════════════       ══════════════════     ═════════════════
Calm Under Fire ─┬─▶ Companion Training ──▶ Panic Training
                 └┐
Tooth & Claw ──┬──┴▶ Military Training ───▶ Xeno Tracking
              ┌┘
Tracking ────┬┴────▶ Hunting ─────────┬───▶ Search & Rescue
             └┐                      ┌┘
Foraging ─────┼─┬──▶ Detect ─────────┼────▶ Detect Substance
             ┌┘ │                    └┐
Rimwise ─────┘ ┌┘                     └───▶ Detect Disease
               │
Safety ────────┴─┬─▶ Zero-G Training
                ┌┘
Athletics ──────┘
```

Each skill carries its prerequisite(s) in `prerequisite_ids` following the primary path shown above. Some expert skills are reachable via multiple trained skills — see each item's description.

### How to use

1. Open a pet item's sheet (e.g., Cat, Dog, or any gear item representing a pet).
2. Click **Track pet skills →** at the bottom of the sheet.
3. The skill tree appears with checkboxes. Prerequisites must be met before an Expert or Master skill can be selected.
4. Unchecking a skill automatically clears any dependent skills above it.

Progress is stored on the item itself — it travels with the item if moved between actors.

## Admin settings

In Foundry: **Game Settings → Configure Settings → Module Settings → Mothership 1e — Traaa.sh Extras**

| Setting | Default | Wired | Description |
|---|---|---|---|
| The Company — Character Creation | On | ✓ fully | Suppresses the auto-prompt and Bio tab section when off |
| Android Subtype — Character Creation | On | ✓ fully | Suppresses the subtype dialog and Bio tab block when off |
| Pet Skill Tree | On | ✓ fully | Suppresses the in-sheet skill tracker; compendium pack is always present |

## Compatibility

Foundry VTT v11–v14. Uses `DialogV2` on v12+ with automatic fallback to the legacy `Dialog` API on v11.

## Licensing

Unofficial community module for Mothership RPG (Tuesday Knight Games). Table content from [traaa.sh](https://www.traaa.sh). Released under the MIT License.

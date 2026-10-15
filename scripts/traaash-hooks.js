const MODULE_ID = "fvtt_mosh_1e_traaash";

const COMPANY_RESULTS = [
  { range: [1, 1],  text: "Student Debt",            full: "Student Debt — The corporation paid for your higher education or a critical training program. You owe them for the opportunity." },
  { range: [2, 2],  text: "Body Modification",        full: "Body Modification — An experimental or costly procedure, fully covered by the corp. The debt keeps you close." },
  { range: [3, 3],  text: "Family Member's Debt",     full: "Family Member's Debt — Someone you love owes the company big. You're the collateral." },
  { range: [4, 4],  text: "Scrip",                    full: "Scrip — You owe an enormous amount of company scrip. The interest compounds daily." },
  { range: [5, 5],  text: "Work Visa",                full: "Work Visa — Your legal right to exist in this sector is company-sponsored. One word from them and you're gone." },
  { range: [6, 6],  text: "Jubilee",                  full: "Jubilee — You took out a Jubilee loan. Roll on the Jubilee sub-table to find out why." },
  { range: [7, 7],  text: "Set Up",                   full: "Set Up — You were framed for something you didn't do — or something you did. The corp holds the evidence." },
  { range: [8, 8],  text: "Citizenship",              full: "Citizenship — They can make you a citizen, or unmake you. Your legal identity is their asset." },
  { range: [9, 9],  text: "Investment",               full: "Investment — You used company capital for a private venture. It hasn't paid off. It may never." },
  { range: [10, 10], text: "Mole",                    full: "Mole — You work for a rival corporation, embedded here. But they found out. Now they own you too." },
];

const JUBILEE_RESULTS = [
  { range: [1, 1],  text: "Gambling" },
  { range: [2, 2],  text: "Drug Abuse" },
  { range: [3, 3],  text: "Education" },
  { range: [4, 4],  text: "Healthcare" },
  { range: [5, 5],  text: "Failed Business" },
  { range: [6, 6],  text: "Failed Market Speculation" },
  { range: [7, 7],  text: "Expensive Body Modification" },
  { range: [8, 8],  text: "Purchasing a Spacecraft" },
  { range: [9, 9],  text: "Criminal Extortion" },
  { range: [10, 10], text: "Lawsuit" },
];

function lookupEntry(table, total) {
  return table.find(r => total >= r.range[0] && total <= r.range[1]);
}

async function rollCompanyMotivation(actor) {
  const mainRoll = await new Roll("1d10").evaluate();
  const rollTotal = mainRoll.total;
  const mainEntry = lookupEntry(COMPANY_RESULTS, rollTotal);
  const mainText = mainEntry?.text ?? "Unknown";
  const mainFull = mainEntry?.full ?? mainText;

  let jubileeText = null;
  let moleRollTotal = null;
  let moleFull = null;
  let companyDisplay = mainFull;

  if (rollTotal === 6) {
    const jubRoll = await new Roll("1d10").evaluate();
    const jubEntry = lookupEntry(JUBILEE_RESULTS, jubRoll.total);
    jubileeText = jubEntry?.text ?? "Unknown";
    companyDisplay = `${mainFull} Debt source: ${jubileeText}.`;
    await actor.setFlag(MODULE_ID, "company_jubilee", jubileeText);
  }

  if (rollTotal === 10) {
    let moleRoll;
    do {
      moleRoll = await new Roll("1d10").evaluate();
    } while (moleRoll.total === 10);
    moleRollTotal = moleRoll.total;
    const moleEntry = lookupEntry(COMPANY_RESULTS, moleRollTotal);
    moleFull = moleEntry?.full ?? moleEntry?.text ?? "Unknown";
    companyDisplay = `${mainFull} Rival corp leverage: ${moleFull}`;
    await actor.setFlag(MODULE_ID, "company_mole_reason", moleEntry?.text ?? "Unknown");
  }

  await actor.setFlag(MODULE_ID, "company_roll", rollTotal);
  await actor.setFlag(MODULE_ID, "company", companyDisplay);

  let chatContent = `<div style="border:1px solid #8b1a1a;padding:6px 10px;border-radius:3px;font-family:inherit">
    <div style="font-weight:bold;margin-bottom:4px">The Company <span style="color:#666;font-weight:normal;font-size:0.85em">(rolled ${rollTotal})</span></div>
    <div style="font-style:italic;margin-bottom:2px">${mainFull}</div>`;

  if (jubileeText) {
    chatContent += `<div style="font-size:0.88em;border-top:1px solid rgba(139,26,26,0.3);padding-top:4px;margin-top:4px"><strong>Jubilee debt:</strong> ${jubileeText}</div>`;
  }
  if (moleFull) {
    chatContent += `<div style="font-size:0.88em;border-top:1px solid rgba(139,26,26,0.3);padding-top:4px;margin-top:4px"><strong>Rival corp leverage (rolled ${moleRollTotal}):</strong> ${moleFull}</div>`;
  }
  chatContent += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: chatContent,
  });

  for (const app of Object.values(ui.windows)) {
    if (app.actor?.id === actor.id) app.render(false);
  }
}

// Version-compatible confirm dialog (DialogV2 = v12+, Dialog = v11).
async function confirmCompanyRoll(actorName) {
  const title = "The Company";
  const content = `<p>Roll <strong>The Company</strong> for <strong>${actorName}</strong>?</p><p style="font-size:0.85em;color:#888">Find out why they're in the corporation's pocket.</p>`;
  if (foundry.applications?.api?.DialogV2?.confirm) {
    return foundry.applications.api.DialogV2.confirm({ window: { title }, content });
  }
  return new Promise(resolve => {
    new Dialog({
      title,
      content,
      buttons: {
        yes: { label: "Yes", callback: () => resolve(true) },
        no:  { label: "No",  callback: () => resolve(false) },
      },
      default: "yes",
      close: () => resolve(false),
    }).render(true);
  });
}

// ---- Settings ----

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enableCompany", {
    name: "The Company — Character Creation",
    hint: "After Choose Skills, prompt to roll why the character is in the corporation's pocket. Also displays the result in the character sheet Bio tab.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "enablePetSkills", {
    name: "Pet Skill Tree",
    hint: "Shows a skill tree tracker inside any gear item's sheet that has been registered as a pet. Skill progress is stored as flags on the item.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

// ---- Ready ----

// All UUIDs and IDs from every items_pet_skills_1e pack across all modules.
// Populated at ready so the renderDialog filter covers terminal, traaash, and any future pack.
const _petSkillPackKeys = new Set();

Hooks.once("ready", async () => {
  game.traaash = { rollCompanyMotivation };

  const PET_PACK_NAME = "items_pet_skills_1e";
  for (const pack of game.packs) {
    if (pack.documentName !== "Item" || pack.metadata.name !== PET_PACK_NAME) continue;
    try {
      await pack.getIndex();
      for (const entry of pack.index) {
        _petSkillPackKeys.add(entry.uuid);
        _petSkillPackKeys.add(entry._id);
      }
    } catch(e) {
      console.warn(`fvtt_mosh_1e_traaash | could not index ${pack.collection}:`, e);
    }
  }

  console.log(`fvtt_mosh_1e_traaash | ready (${_petSkillPackKeys.size} pet skill keys cached)`);
});

// ---- The Company ----

// Tracks actors whose class was just set this session; value is a pending fallback timer ID or null.
const _pendingCompany = new Map();

function _promptCompany(actor) {
  if (!game.settings.get(MODULE_ID, "enableCompany")) return;
  if (actor.getFlag(MODULE_ID, "company_roll") != null) return;
  console.log(`fvtt_mosh_1e_traaash | prompting The Company roll for ${actor.name}`);
  confirmCompanyRoll(actor.name)
    .then(roll => roll ? rollCompanyMotivation(actor) : null)
    .catch(e => console.error("fvtt_mosh_1e_traaash | The Company dialog error:", e));
}

// Mark actor as pending when a class is first assigned.
Hooks.on("updateActor", (actor, changes, _options, userId) => {
  if (userId !== game.user.id) return;
  if (actor.type !== "character") return;
  if (!changes?.system?.class?.value) return;
  if (actor.getFlag(MODULE_ID, "company_roll") != null) return;
  if (!game.settings.get(MODULE_ID, "enableCompany")) return;
  _pendingCompany.set(actor.id, null);
});

// Primary trigger: MCG v1.0.3+ fires this after Choose Skills confirms.
// Cancels the fallback timer and prompts immediately.
Hooks.on("traaash.skillsChosen", (actor) => {
  const timer = _pendingCompany.get(actor.id);
  if (timer) clearTimeout(timer);
  _pendingCompany.delete(actor.id);
  _promptCompany(actor);
});

// Fallback trigger: watch for skill items being added to a pending actor.
// Resets a 5-second debounce on each new skill; fires Company after the burst settles.
// This handles cases where MCG's hook never fires (older MCG version, world-imported macro copy, etc.).
Hooks.on("createItem", (item, _options, userId) => {
  if (userId !== game.user.id) return;
  if (item.type !== "skill") return;
  const actor = item.parent;
  if (!actor || actor.type !== "character") return;
  if (!_pendingCompany.has(actor.id)) return;

  const existing = _pendingCompany.get(actor.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    _pendingCompany.delete(actor.id);
    _promptCompany(actor);
  }, 5000);
  _pendingCompany.set(actor.id, timer);
});

// ---- Pet Skills ----

const PET_SKILLS = [
  { id: "Tr1CalmUndrFire0", name: "Calm Under Fire",    rank: "trained", prereqs: [] },
  { id: "Tr2ToothAndClaw0", name: "Tooth & Claw",       rank: "trained", prereqs: [] },
  { id: "Tr3TrackingPet00", name: "Tracking",           rank: "trained", prereqs: [] },
  { id: "Tr4ForagingPet00", name: "Foraging",           rank: "trained", prereqs: [] },
  { id: "Tr5RimwisePet000", name: "Rimwise",            rank: "trained", prereqs: [] },
  { id: "Tr6SafetyPet0000", name: "Safety",             rank: "trained", prereqs: [] },
  { id: "Tr7AthleticsPet0", name: "Athletics",          rank: "trained", prereqs: [] },
  { id: "Ex1CompanionTrng", name: "Companion Training", rank: "expert",  prereqs: ["Tr1CalmUndrFire0"] },
  { id: "Ex2MilitaryTrng0", name: "Military Training",  rank: "expert",  prereqs: ["Tr1CalmUndrFire0", "Tr2ToothAndClaw0", "Tr3TrackingPet00"] },
  { id: "Ex3HuntingPet000", name: "Hunting",            rank: "expert",  prereqs: ["Tr2ToothAndClaw0", "Tr3TrackingPet00", "Tr4ForagingPet00"] },
  { id: "Ex4DetectPet0000", name: "Detect",             rank: "expert",  prereqs: ["Tr3TrackingPet00", "Tr4ForagingPet00", "Tr5RimwisePet000", "Tr6SafetyPet0000"] },
  { id: "Ex5ZeroGTraining", name: "Zero-G Training",    rank: "expert",  prereqs: ["Tr6SafetyPet0000", "Tr7AthleticsPet0"] },
  { id: "Ms1PanicTraining", name: "Panic Training",     rank: "master",  prereqs: ["Ex1CompanionTrng"] },
  { id: "Ms2XenoTracking0", name: "Xeno Tracking",      rank: "master",  prereqs: ["Ex2MilitaryTrng0"] },
  { id: "Ms3SearchRescue0", name: "Search & Rescue",    rank: "master",  prereqs: ["Ex4DetectPet0000"] },
  { id: "Ms4DetectSubst00", name: "Detect Substance",   rank: "master",  prereqs: ["Ex4DetectPet0000"] },
  { id: "Ms5DetectDisease", name: "Detect Disease",     rank: "master",  prereqs: ["Ex4DetectPet0000"] },
];

function _removePetSkillDependents(skillId, current) {
  PET_SKILLS.forEach(s => {
    if (!s.prereqs.includes(skillId) || !current.has(s.id)) return;
    // OR logic: only cascade if no other prereq is still satisfied
    if (s.prereqs.some(p => p !== skillId && current.has(p))) return;
    current.delete(s.id);
    _removePetSkillDependents(s.id, current);
  });
}

function _buildPetSkillsHtml(owned) {
  const tiers = [
    { key: "trained", label: "Trained", bonus: "+10%" },
    { key: "expert",  label: "Expert",  bonus: "+15%" },
    { key: "master",  label: "Master",  bonus: "+20%" },
  ];
  return tiers.map(({ key, label, bonus }) => {
    const skills = PET_SKILLS.filter(s => s.rank === key);
    const cells = skills.map(s => {
      const hasPrereqs = s.prereqs.length === 0 || s.prereqs.some(p => owned.has(p));
      const isOwned = owned.has(s.id);
      const disabled = !hasPrereqs && !isOwned ? "disabled" : "";
      const checked = isOwned ? "checked" : "";
      const dim = disabled ? "opacity:0.4;" : "";
      const prereqNames = s.prereqs.map(p => PET_SKILLS.find(x => x.id === p)?.name ?? p).join(", ");
      const reqLabel = s.prereqs.length > 1 ? "Requires any of" : "Requires";
      const title = prereqNames ? `title="${reqLabel}: ${prereqNames}"` : "";
      return `<label style="display:flex;align-items:center;gap:4px;${dim}cursor:${disabled ? "default" : "pointer"}" ${title}>
        <input type="checkbox" class="traaash-pet-skill" data-id="${s.id}" ${checked} ${disabled} style="margin:0;cursor:inherit">
        <span style="font-size:0.82em;white-space:nowrap">${s.name}</span>
      </label>`;
    }).join("");
    return `<div style="margin-bottom:8px">
      <div style="font-size:0.72em;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:3px">${label} <span style="color:#bbb">${bonus}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 14px">${cells}</div>
    </div>`;
  }).join("");
}

// Known pet item names from fvtt_mosh_1e_psg. Add custom pet names here.
const PET_ITEM_NAMES = new Set(["Cat", "Dog", "Rat", "Pet (Organic)", "Pet (Synthetic)"]);

const _PET_SKILL_ICONS = {
  "Tr3TrackingPet00": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/tracking.png",
  "Tr7AthleticsPet0": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/tricks_&_stunts.png",
  "Ex1CompanionTrng": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/emotional_support.png",
  "Ex2MilitaryTrng0": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/sentry.png",
  "Ms1PanicTraining": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/service_support.png",
  "Ms2XenoTracking0": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/tracking.png",
  "Ms3SearchRescue0": "modules/fvtt_mosh_1e_traaash/icons/pet_skills/rescue.png",
};

const _PET_SKILL_DESCS = {
  "Tr1CalmUndrFire0": "Trained to keep calm in dangerous situations, around gunfire, etc.",
  "Tr2ToothAndClaw0": "Trained to fight viciously, e.g. in pit fights or to defend their owner.",
  "Tr3TrackingPet00": "Trained to follow spoor on command when presented with a sample.",
  "Tr4ForagingPet00": "Trained to find and/or retrieve edible plants, bugs, fungus, running water, etc.",
  "Tr5RimwisePet000": "Trained to intimidate people, distract them to assist in pickpocketing, survive on city streets, etc.",
  "Tr6SafetyPet0000": "Trained to alert people to safety protocols not being followed (e.g. no seatbelt, no helmet, exposed wires, etc.)",
  "Tr7AthleticsPet0": "Trained to do athletic feats, e.g. run long distances, leap high into the air, etc.",
  "Ex1CompanionTrng": "Trained to be a comforting, helpful companion animal.",
  "Ex2MilitaryTrng0": "Very disciplined. Trained to military standards to attack, subdue, guard, etc.",
  "Ex3HuntingPet000": "Trained to track and kill prey.",
  "Ex4DetectPet0000": "Trained to detect and alert owner to the presence of substances when given a sample.",
  "Ex5ZeroGTraining": "Trained to move nimbly in microgravity.",
  "Ms1PanicTraining": "Trained to calm down a panicking person with contact and pressure.",
  "Ms2XenoTracking0": "Trained to track certain kinds of alien creatures. Does not require a sample. Note the type of alien creature it is trained to track.",
  "Ms3SearchRescue0": "Trained to find people buried under rubble and in other disaster scenarios, and to alert others to their presence. Does not require a sample.",
  "Ms4DetectSubst00": "Trained to detect and alert owner to the presence of a specific substance. Does not require a sample. Note the substance it is trained to detect.",
  "Ms5DetectDisease": "Trained to detect and alert owner that someone is infected with a specific disease. Does not require a sample. Note the disease it is trained to detect.",
};

function _buildPickerContent(selected) {
  const tiers = [
    { key: "trained", label: "Trained Pet Skills", bonus: "+10%" },
    { key: "expert",  label: "Expert Pet Skills",  bonus: "+15%" },
    { key: "master",  label: "Master Pet Skills",  bonus: "+20%" },
  ];
  const sections = tiers.map(({ key, label, bonus }) => {
    const rows = PET_SKILLS.filter(s => s.rank === key).map(s => {
      const prereqNames = s.prereqs.map(p => PET_SKILLS.find(x => x.id === p)?.name ?? p).join(", ");
      const locked = s.prereqs.length > 0 && !s.prereqs.some(p => selected.has(p));
      const icon = _PET_SKILL_ICONS[s.id];
      const iconHtml = icon
        ? `<img src="${icon}" style="width:20px;height:20px;object-fit:contain;flex-shrink:0;border:none;box-shadow:none">`
        : `<span style="width:20px;height:20px;flex-shrink:0;display:inline-block"></span>`;
      const reqLabel = s.prereqs.length > 1 ? "Requires any of" : "Requires";
      const prereqNote = prereqNames
        ? `<span style="font-size:0.75em;color:#aaa;margin-left:4px;font-style:italic">${reqLabel}: ${prereqNames}</span>` : "";
      const desc = _PET_SKILL_DESCS[s.id] ?? "";
      return `<label class="traaash-pick-row" data-id="${s.id}" style="display:flex;align-items:flex-start;gap:8px;padding:5px 8px;border-radius:3px;opacity:${locked ? "0.4" : "1"};cursor:${locked ? "default" : "pointer"}">
        <input type="checkbox" class="pet-pick" data-id="${s.id}" ${selected.has(s.id) ? "checked" : ""} ${locked ? "disabled" : ""} style="margin-top:2px;flex-shrink:0;cursor:inherit">
        ${iconHtml}
        <div style="line-height:1">
          <span style="font-size:0.87em;font-weight:600">${s.name}</span>${prereqNote}
          <div style="font-size:0.77em;color:#888;line-height:1.4;margin-top:2px">${desc}</div>
        </div>
      </label>`;
    }).join("");
    return `<div style="margin-bottom:10px">
      <div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#666;padding:0 8px 4px;border-bottom:1px solid rgba(0,0,0,0.1);margin-bottom:2px">${label} <span style="color:#bbb;font-weight:400">${bonus}</span></div>
      ${rows}
    </div>`;
  }).join("");
  return `<div>
    <div style="max-height:500px;overflow-y:auto;padding:2px 0">${sections}</div>
    <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 4px 2px;border-top:1px solid rgba(0,0,0,0.15);margin-top:4px">
      <button type="button" data-action="cancel" style="flex:0 0 auto;padding:2px 16px">Cancel</button>
      <button type="button" data-action="confirm" style="flex:0 0 auto;padding:2px 16px">Confirm</button>
    </div>
  </div>`;
}

class PetSkillPickerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "traaash-pet-skill-picker",
      classes: ["dialog"],
      width: 540,
      height: "auto",
      resizable: false,
    });
  }

  constructor(item, resolve, options = {}) {
    super(options);
    this._item = item;
    this._resolve = resolve;
    this._resolved = false;
    this._selected = new Set();
  }

  get title() { return `Pet Skills — ${this._item.name}`; }

  async _renderInner() {
    return $(_buildPickerContent(this._selected));
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._refreshLocks(html);

    html.on("change", ".pet-pick", ev => {
      const id = ev.currentTarget.dataset.id;
      if (ev.currentTarget.checked) {
        this._selected.add(id);
        const autoCheck = sid => {
          for (const pid of PET_SKILLS.find(x => x.id === sid)?.prereqs ?? []) {
            if (!this._selected.has(pid)) {
              this._selected.add(pid);
              html.find(`.pet-pick[data-id="${pid}"]`).prop("checked", true);
              autoCheck(pid);
            }
          }
        };
        autoCheck(id);
      } else {
        this._selected.delete(id);
        const autoClear = sid => {
          PET_SKILLS.forEach(s => {
            if (!s.prereqs.includes(sid) || !this._selected.has(s.id)) return;
            if (s.prereqs.some(p => p !== sid && this._selected.has(p))) return;
            this._selected.delete(s.id);
            html.find(`.pet-pick[data-id="${s.id}"]`).prop("checked", false);
            autoClear(s.id);
          });
        };
        autoClear(id);
      }
      this._refreshLocks(html);
    });

    html.find("[data-action='confirm']").on("click", () => {
      if (!this._resolved) { this._resolved = true; this._resolve([...this._selected]); }
      this.close();
    });

    html.find("[data-action='cancel']").on("click", () => {
      if (!this._resolved) { this._resolved = true; this._resolve(null); }
      this.close();
    });
  }

  _refreshLocks(html) {
    PET_SKILLS.forEach(s => {
      const locked = s.prereqs.length > 0 && !s.prereqs.some(p => this._selected.has(p));
      const $row = html.find(`.traaash-pick-row[data-id="${s.id}"]`);
      $row.find(".pet-pick").prop("disabled", locked);
      $row.css({ opacity: locked ? "0.4" : "1", cursor: locked ? "default" : "pointer" });
    });
  }

  async close(options = {}) {
    if (!this._resolved) { this._resolved = true; this._resolve(null); }
    return super.close(options);
  }
}

async function _showPetSkillPicker(item) {
  return new Promise(resolve => new PetSkillPickerApp(item, resolve).render(true));
}

// Remove pet skill entries from any dialog (e.g. MCG skill picker).
// Checks all data-* attributes and the label's outerHTML so it works regardless of
// which attribute name MCG uses. Also covers fvtt_mosh_1e_terminal's pet skills pack.
Hooks.on("renderDialog", (_app, html, _data) => {
  const $html = html.jquery ? html : $(html);
  const PET_PACK = "items_pet_skills_1e";

  $html.find("input[type='checkbox']").each((_i, el) => {
    const attrValues = Object.values(el.dataset);
    const labelHtml = el.closest("label")?.outerHTML ?? el.parentElement?.outerHTML ?? "";

    const isPetSkill =
      labelHtml.includes(PET_PACK) ||
      attrValues.some(v =>
        v.includes(PET_PACK) ||
        _petSkillPackKeys.has(v) ||
        _petSkillPackKeys.has(v.split(".").pop())
      );

    if (isPetSkill) $(el).closest("label").remove();
  });
});

Hooks.on("renderItemSheet", (app, html, _data) => {
  if (!game.settings.get(MODULE_ID, "enablePetSkills")) return;
  const item = app.document ?? app.object;
  if (!item || item.type !== "item") return;

  const $html = html.jquery ? html : $(html);
  const enabled = !!item.getFlag(MODULE_ID, "petSkillsEnabled");
  const owned = new Set(item.getFlag(MODULE_ID, "petSkills") ?? []);
  const $body = $html.find("section.sheet-body");

  if (!enabled) {
    if (!item.isOwner) return;
    if (!PET_ITEM_NAMES.has(item.name)) return;
    const $link = $(`<div style="text-align:right;padding:4px 10px 6px">
      <a class="traaash-enable-pet-skills" style="font-size:0.8em;color:#aaa">Set up pet skills →</a>
    </div>`);
    $link.find(".traaash-enable-pet-skills").on("click", async () => {
      const chosen = await _showPetSkillPicker(item);
      if (!chosen) return;
      await item.setFlag(MODULE_ID, "petSkillsEnabled", true);
      await item.setFlag(MODULE_ID, "petSkills", chosen);
    });
    $body.prepend($link);
    return;
  }

  const $section = $(`<div class="traaash-pet-skills-section" style="border-bottom:1px solid rgba(0,0,0,0.12);padding:10px 12px 6px;margin-bottom:4px">
    <div style="font-size:0.78em;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:8px">Pet Skills</div>
    ${_buildPetSkillsHtml(owned)}
  </div>`);

  $section.find(".traaash-pet-skill").on("change", async (ev) => {
    const id = ev.currentTarget.dataset.id;
    const current = new Set(item.getFlag(MODULE_ID, "petSkills") ?? []);
    if (ev.currentTarget.checked) {
      current.add(id);
    } else {
      current.delete(id);
      _removePetSkillDependents(id, current);
    }
    await item.setFlag(MODULE_ID, "petSkills", [...current]);
  });

  $body.prepend($section);
});

Hooks.on("renderActorSheet", (app, html, _data) => {
  if (!game.settings.get(MODULE_ID, "enableCompany")) return;

  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  const $html = html.jquery ? html : $(html);
  const $bioTab = $html.find('.tab[data-tab="description"]').first();
  if (!$bioTab.length) return;

  const company = actor.getFlag(MODULE_ID, "company");
  const valueHtml = company
    ? `<p style="margin:0;font-size:0.88em">${company}</p>`
    : `<p style="margin:0;font-size:0.88em;color:#888;font-style:italic">Not yet rolled.</p>`;

  const $section = $(`<div class="traaash-company-section" style="border:1px solid rgba(139,26,26,0.35);border-radius:3px;padding:8px 10px;margin-bottom:12px">
    <div style="margin-bottom:3px">
      <span style="font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:0.78em;color:#8b1a1a">The Company</span>
    </div>
    <p style="margin:0 0 6px;font-size:0.78em;color:#888;font-style:italic">Motivation to carry out the mission, even in the face of the horrors to come.</p>
    ${valueHtml}
  </div>`);

  $bioTab.prepend($section);
});

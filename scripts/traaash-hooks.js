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

  game.settings.register(MODULE_ID, "enableAndroidSubtype", {
    name: "Android Subtype — Character Creation",
    hint: "After choosing the Android class, prompt to select a subtype (Bioroid, Synthetic, or Cyberized Human) and roll a roleplay feature. Displays details in the character sheet Bio tab.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "yps14SystemAccess", {
    name: "Ypsilon 14: System [A] Access Override",
    hint: "Auto: unlocks when any player character has Sonya's Key Card. Locked: always ACCESS DENIED (overrides keycard). Unlocked: always ACCESS GRANTED (hacking scenarios). Can also be cycled from inside the terminal.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto:     "Auto (check for Sonya's Key Card)",
      locked:   "Force Locked (ACCESS DENIED)",
      unlocked: "Force Unlocked (ACCESS GRANTED)",
    },
    default: "auto",
  });

  game.settings.register(MODULE_ID, "yps14ShipName", {
    name: "Ypsilon 14: Player Ship Name",
    hint: "Replaces 'IMV GRASSHOPPER' in the Schedule and Comms screens. Update to match your players' ship.",
    scope: "world",
    config: true,
    type: String,
    default: "IMV GRASSHOPPER",
  });

  game.settings.register(MODULE_ID, "yps14State", {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
});

// ---- Ready ----

// All UUIDs and IDs from every items_pet_skills_1e pack across all modules.
// Populated at ready so the renderDialog filter covers terminal, traaash, and any future pack.
const _petSkillPackKeys = new Set();

Hooks.once("ready", async () => {
  game.traaash = { rollCompanyMotivation, Yps14TerminalApp };

  // Ypsilon 14 terminal — receive GM broadcasts
  game.socket.on(`module.${MODULE_ID}`, data => {
    if (data.action !== "yps14:open") return;
    if (game.user.isGM) return;
    const existing = Object.values(ui.windows).find(w => w.id === "traaash-yps14-terminal");
    if (existing) existing._navigate(data.screen);
    else new Yps14TerminalApp(data.screen).render(true);
  });

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

async function _promptCompany(actor) {
  if (!game.settings.get(MODULE_ID, "enableCompany")) return;
  if (actor.getFlag(MODULE_ID, "company_roll") != null) return;
  console.log(`fvtt_mosh_1e_traaash | prompting The Company roll for ${actor.name}`);
  try {
    const roll = await confirmCompanyRoll(actor.name);
    if (roll) await rollCompanyMotivation(actor);
  } catch(e) {
    console.error("fvtt_mosh_1e_traaash | The Company dialog error:", e);
  }
}

// Mark actor as pending when a class is first assigned (Company and/or Android subtype).
Hooks.on("updateActor", (actor, changes, _options, userId) => {
  if (userId !== game.user.id) return;
  if (actor.type !== "character") return;
  const newClass = changes?.system?.class?.value;
  if (!newClass) return;
  const needsCompany  = actor.getFlag(MODULE_ID, "company_roll") == null  && game.settings.get(MODULE_ID, "enableCompany");
  const needsSubtype  = newClass === "Android" && actor.getFlag(MODULE_ID, "androidSubtype") == null && game.settings.get(MODULE_ID, "enableAndroidSubtype");
  if (needsCompany || needsSubtype) _pendingCompany.set(actor.id, null);
});

// Primary trigger: MCG v1.0.3+ fires this after Choose Skills confirms.
// Cancels the fallback timer and runs Company → Android subtype sequentially.
Hooks.on("traaash.skillsChosen", async (actor) => {
  const timer = _pendingCompany.get(actor.id);
  if (timer) clearTimeout(timer);
  _pendingCompany.delete(actor.id);
  await _promptCompany(actor);
  if (game.settings.get(MODULE_ID, "enableAndroidSubtype") && actor.system.class.value === "Android") {
    await _promptAndroidSubtype(actor);
  }
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

  const timer = setTimeout(async () => {
    _pendingCompany.delete(actor.id);
    const freshActor = game.actors.get(actor.id) ?? actor;
    await _promptCompany(freshActor);
    if (game.settings.get(MODULE_ID, "enableAndroidSubtype")) {
      await _promptAndroidSubtype(freshActor);
    }
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
    { key: "trained", label: "Trained Pet Skills", bonus: "+10%" },
    { key: "expert",  label: "Expert Pet Skills",  bonus: "+15%" },
    { key: "master",  label: "Master Pet Skills",  bonus: "+20%" },
  ];
  const sections = tiers.map(({ key, label, bonus }) => {
    const skills = PET_SKILLS.filter(s => s.rank === key && owned.has(s.id));
    if (!skills.length) return "";
    const rows = skills.map(s => {
      const icon = _PET_SKILL_ICONS[s.id];
      const iconHtml = icon
        ? `<img src="${icon}" style="width:16px;height:16px;object-fit:contain;flex-shrink:0;border:none;box-shadow:none;margin-top:1px">`
        : `<span style="width:16px;flex-shrink:0;display:inline-block"></span>`;
      const desc = _PET_SKILL_DESCS[s.id] ?? "";
      return `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
        ${iconHtml}
        <div>
          <span style="font-size:0.83em;font-weight:600">${s.name}:</span>
          <span style="font-size:0.83em;color:#555"> ${desc}</span>
        </div>
      </div>`;
    }).join("");
    return `<div style="margin-bottom:10px">
      <div style="font-size:0.72em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:4px">${label} <span style="color:#bbb;font-weight:400">${bonus}</span></div>
      ${rows}
    </div>`;
  }).filter(Boolean);
  return sections.length
    ? sections.join("")
    : `<p style="font-size:0.82em;color:#aaa;margin:0;font-style:italic">No skills assigned.</p>`;
}

const PET_ITEM_NAMES = new Set([
  "Cat", "Dog", "Rat", "Pet (Organic)", "Pet (Synthetic)",
  "Bird", "Chameleon", "Cockroach", "Ferret", "Fish", "Frog",
  "Guinea Pig", "Hamster", "Hedgehog", "Iguana", "Monkey", "Mouse",
  "Parrot", "Rabbit", "Robotic Dog", "Snake", "Spider", "Turtle",
]);

function _isPetItem(item) {
  return PET_ITEM_NAMES.has(item.name);
}

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

const SYNTHETIC_RE = /\bsynthetic\b/i;

function _buildPickerContent(isSynthetic, mode, selected, limit) {
  const remaining = limit - selected.size;

  // Header: instruction text + mode toggle (synthetic) + remaining counter
  const remainingSpan = `<span style="color:#888;font-size:0.82em">Remaining: <strong class="traaash-remaining">${remaining}</strong></span>`;
  let headerHtml;
  if (!isSynthetic) {
    headerHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 8px">
      <span style="font-size:0.88em">Organic pet — select <strong>1 Trained</strong> skill.</span>
      ${remainingSpan}
    </div>`;
  } else {
    headerHtml = `<div style="margin-bottom:8px;padding:0 8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:0.88em">Synthetic pet — select skills or a starting Expert.</span>
        ${remainingSpan}
      </div>
      <div style="display:flex;gap:20px;font-size:0.88em">
        <label style="cursor:pointer"><input type="radio" name="petMode" value="trained" ${mode === "trained" ? "checked" : ""}> 2 Trained</label>
        <label style="cursor:pointer"><input type="radio" name="petMode" value="expert" ${mode === "expert" ? "checked" : ""}> 1 Expert <span style="font-size:0.8em;color:#aaa">(prerequisites waived)</span></label>
      </div>
    </div>`;
  }

  // Skill rows — only the relevant tier; expert mode shows all expert skills unlocked
  const tier = mode === "expert" ? "expert" : "trained";
  const tierLabel = tier === "expert" ? "Expert Pet Skills" : "Trained Pet Skills";
  const tierBonus = tier === "expert" ? "+15%" : "+10%";
  const rows = PET_SKILLS.filter(s => s.rank === tier).map(s => {
    const isSelected = selected.has(s.id);
    const atLimit = !isSelected && remaining <= 0;
    const icon = _PET_SKILL_ICONS[s.id];
    const iconHtml = icon
      ? `<img src="${icon}" style="width:20px;height:20px;object-fit:contain;flex-shrink:0;border:none;box-shadow:none">`
      : `<span style="width:20px;height:20px;flex-shrink:0;display:inline-block"></span>`;
    const desc = _PET_SKILL_DESCS[s.id] ?? "";
    return `<label class="traaash-pick-row" data-id="${s.id}" style="display:flex;align-items:flex-start;gap:8px;padding:5px 8px;border-radius:3px;opacity:${atLimit ? "0.4" : "1"};cursor:${atLimit ? "default" : "pointer"}">
      <input type="checkbox" class="pet-pick" data-id="${s.id}" ${isSelected ? "checked" : ""} ${atLimit ? "disabled" : ""} style="margin-top:2px;flex-shrink:0;cursor:inherit">
      ${iconHtml}
      <div style="line-height:1">
        <span style="font-size:0.87em;font-weight:600">${s.name}</span>
        <div style="font-size:0.77em;color:#888;line-height:1.4;margin-top:2px">${desc}</div>
      </div>
    </label>`;
  }).join("");

  const skillsHtml = `<div style="margin-bottom:10px">
    <div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#666;padding:0 8px 4px;border-bottom:1px solid rgba(0,0,0,0.1);margin-bottom:2px">${tierLabel} <span style="color:#bbb;font-weight:400">${tierBonus}</span></div>
    ${rows}
  </div>`;

  const confirmDisabled = remaining !== 0 ? "disabled" : "";
  return `<div>
    ${headerHtml}
    <div style="max-height:420px;overflow-y:auto;padding:2px 0">${skillsHtml}</div>
    <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 4px 2px;border-top:1px solid rgba(0,0,0,0.15);margin-top:4px">
      <button type="button" data-action="cancel" style="flex:0 0 auto;padding:2px 16px">Cancel</button>
      <button type="button" data-action="confirm" ${confirmDisabled} style="flex:0 0 auto;padding:2px 16px">Confirm</button>
    </div>
  </div>`;
}

class PetSkillPickerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "traaash-pet-skill-picker",
      classes: ["dialog"],
      width: 480,
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
    this._isSynthetic = SYNTHETIC_RE.test(item.name);
    this._mode = "trained"; // "trained" | "expert"
  }

  get _limit() {
    if (!this._isSynthetic) return 1;
    return this._mode === "expert" ? 1 : 2;
  }

  get title() { return `Pet Skills — ${this._item.name}`; }

  async _renderInner() {
    return $(_buildPickerContent(this._isSynthetic, this._mode, this._selected, this._limit));
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Mode switch (synthetic only) — clear selection and re-render
    html.on("change", "[name='petMode']", ev => {
      this._mode = ev.currentTarget.value;
      this._selected.clear();
      this.render(true);
    });

    html.on("change", ".pet-pick", ev => {
      const id = ev.currentTarget.dataset.id;
      if (ev.currentTarget.checked) {
        if (this._selected.size >= this._limit) { ev.currentTarget.checked = false; return; }
        this._selected.add(id);
      } else {
        this._selected.delete(id);
      }
      this._refreshState(html);
    });

    html.find("[data-action='confirm']").on("click", () => {
      if (this._selected.size !== this._limit) return;
      if (!this._resolved) { this._resolved = true; this._resolve([...this._selected]); }
      this.close();
    });

    html.find("[data-action='cancel']").on("click", () => {
      if (!this._resolved) { this._resolved = true; this._resolve(null); }
      this.close();
    });
  }

  _refreshState(html) {
    const remaining = this._limit - this._selected.size;
    html.find(".traaash-remaining").text(remaining);
    html.find(".pet-pick:not(:checked)").each((_, el) => {
      const $row = $(el).closest(".traaash-pick-row");
      const disable = remaining <= 0;
      $(el).prop("disabled", disable);
      $row.css({ opacity: disable ? "0.4" : "1", cursor: disable ? "default" : "pointer" });
    });
    html.find("[data-action='confirm']").prop("disabled", remaining !== 0);
  }

  async close(options = {}) {
    if (!this._resolved) { this._resolved = true; this._resolve(null); }
    return super.close(options);
  }
}

async function _showPetSkillPicker(item) {
  return new Promise(resolve => new PetSkillPickerApp(item, resolve).render(true));
}

// === Ypsilon 14 Interactive Terminal ===

function _getYps14State() {
  const DEFAULT = {
    airlocks: { bay1: true, bay2: false, mineshaft: false },
    showers: [false, false, false, false, false],
    lifeSupport: true,
    scuttle: false,
  };
  try {
    const raw = game.settings.get(MODULE_ID, "yps14State");
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed, airlocks: { ...DEFAULT.airlocks, ...(parsed.airlocks ?? {}) } };
  } catch { return DEFAULT; }
}

async function _setYps14State(state) {
  await game.settings.set(MODULE_ID, "yps14State", JSON.stringify(state));
}

function _yps14SystemUnlocked() {
  const access = game.settings.get(MODULE_ID, "yps14SystemAccess");
  if (access === "unlocked") return true;
  if (access === "locked")   return false;
  return game.actors.some(a => a.items?.some(i => i.name === "Sonya's Key Card"));
}

async function _yps14CycleAccess() {
  const cur  = game.settings.get(MODULE_ID, "yps14SystemAccess");
  const next = cur === "auto" ? "locked" : cur === "locked" ? "unlocked" : "auto";
  await game.settings.set(MODULE_ID, "yps14SystemAccess", next);
}

function _yps14ChatMsg(text) {
  ChatMessage.create({
    content: `<div style="font-family:'Courier New',monospace;background:#030e03;color:#33dd22;padding:6px 10px;border-radius:2px">${text}</div>`,
    speaker: { alias: "YPSILON 14" },
  });
}

async function _yps14Confirm(content) {
  if (foundry.applications?.api?.DialogV2) {
    return foundry.applications.api.DialogV2.confirm({ content, window: { title: "Confirm" } }).catch(() => false);
  }
  return new Promise(res => new Dialog({
    title: "Confirm", content,
    buttons: {
      yes: { label: "Yes", callback: () => res(true) },
      no:  { label: "No",  callback: () => res(false) },
    },
    default: "no", close: () => res(false),
  }).render(true));
}

function _getScheduleEntries() {
  const ship = game.settings.get(MODULE_ID, "yps14ShipName").padEnd(18);
  return [
    `666-07-02 06:33 - ${ship}- RESUPPLY - DOCKING BAY 2 - DOCK`,
    "666-06-04 08:34 - RSV THE HERACLES   - RESEARCH - DOCKING BAY 1 - DOCK",
    "666-06-02 12:23 - CTV HORN OV PLENTY - RESUPPLY - DOCKING BAY 2 - DEPART",
    "666-06-01 16:04 - CTV HORN OV PLENTY - RESUPPLY - DOCKING BAY 2 - DOCK",
    "666-05-02 08:32 - MV VASQUEZ XV      - PICKUP   - DOCKING BAY 1 - DEPART",
    "666-05-01 06:02 - MV VASQUEZ XV      - PICKUP   - DOCKING BAY 1 - DOCK",
    "666-04-02 13:02 - CTV HORN OV PLENTY - RESUPPLY - DOCKING BAY 2 - DEPART",
    "666-04-01 15:54 - CTV HORN OV PLENTY - RESUPPLY - DOCKING BAY 2 - DOCK",
    "666-06-02 08:33 - MV VAZQUEZ XV      - PICKUP   - DOCKING BAY 1 - DEPART",
    "666-06-01 06:04 - MV VAZQUEZ XV      - PICKUP   - DOCKING BAY 1 - DOCK",
  ];
}
const SCHEDULE_PAGE_SIZE = 10;

function _getCommsShips() {
  return ["RSV THE HERACLES", game.settings.get(MODULE_ID, "yps14ShipName")];
}

const YPS14_SCREENS = {
  main: {
    title: "YPSILON 14 CONTROL TERMINAL",
    lines: [
      { type: "nav", screen: "diagnostics", label: "DIAGNOSTICS" },
      { type: "nav", screen: "schedule",    label: "SCHEDULE"    },
      { type: "nav", screen: "controls",    label: "CONTROLS"    },
      { type: "nav", screen: "roster",      label: "ROSTER"      },
      { type: "nav", screen: "comms",       label: "COMMS"       },
    ],
  },
  diagnostics: {
    title: "DIAGNOSTICS",
    back: "main",
    lines: [
      { type: "nav", screen: "layout", label: "LAYOUT" },
      { type: "nav", screen: "status", label: "STATUS" },
    ],
  },
  layout: {
    title: "STATION LAYOUT",
    back: "diagnostics",
    image: "modules/fvtt_mosh_1e_traaash/images/ypsilon-14_layout.png",
    lines: [],
  },
  status: {
    title: "STATUS",
    back: "diagnostics",
    secret: "The station is not exactly up to code.",
    lines: [
      { type: "text", label: "SYSTEMS CHECK ..." },
      { type: "text", label: "WARNING: AIR FILTERS LAST REPLACED 455 DAYS AGO" },
      { type: "text", label: "(255 DAYS PAST RECOMMENDATION)" },
      { type: "text", label: "WARNING: SHOWER 5 OUT OF ORDER AS OF 1 DAY AGO" },
      { type: "text", label: "WARNING: MINESHAFT ELEVATOR LAST MAINTAINED 455 DAYS AGO" },
      { type: "text", label: "(255 DAYS PAST RECOMMENDATION)" },
      { type: "text", label: "WARNING: AIRFLOW 82%" },
      { type: "text", label: "(SUBOPTIMAL: REPLACE FILTERS AND CHECK VENTS FOR BLOCKAGES)" },
      { type: "text", label: "ALL SYSTEMS WITHIN ACCEPTABLE OPERATING CONDITIONS" },
    ],
  },
  schedule: {
    title: "SCHEDULE",
    back: "main",
    secret: "Replace 'IMV GRASSHOPPER' with your players' ship. If players scroll back further, more of the same two ships alternate each month. Reset astral calendar 666 to your campaign calendar.",
  },
  roster: {
    title: "ROSTER",
    back: "main",
    lines: [
      { type: "text", label: "01. VERHOEVEN, SONYA     - OVERSEER"        },
      { type: "text", label: "02. SINGH, ASHRAF        - BREAKER"         },
      { type: "text", label: "03. DE BEERS, DANA       - HEAD DRILLER"    },
      { type: "text", label: "04. HUIZINGA, JEROME     - ASST. DRILLER"   },
      { type: "text", label: "05. TOBIN, ROSA          - MINING ENGINEER" },
      { type: "text", label: "06. MIKKELSEN, MICHAEL   - MINING ENGINEER" },
      { type: "text", label: "07. KANTARO, KENJI       - LOADER"          },
      { type: "text", label: "08. OBOWE, MORGAN        - LOADER"          },
      { type: "text", label: "09. KENBISHI, RIE        - PUTTER"          },
      { type: "text", label: "10. VACANT"                                 },
    ],
  },
  controls: {
    title: "CONTROLS",
    back: "main",
    secret: "The [A] indicates 'Administrator.' SYSTEM [A] resolves based on the 'SYSTEM [A]: AUTO ↻' toggle in the terminal footer (auto / locked / unlocked). Auto checks whether any player character has Sonya\\'s Key Card. Use 'locked' to force denial even when the card is present; use 'unlocked' for hacking scenarios.",
    lines: [
      { type: "nav", screen: "airlocks",    label: "AIRLOCKS"   },
      { type: "nav", screen: "showers",     label: "SHOWERS"    },
      { type: "nav", screen: "system_auto", label: "SYSTEM [A]", gmOnly: true },
    ],
  },
  airlocks: {
    title: "AIRLOCKS",
    back: "controls",
    secret: "The airlocks must be closed manually before they can be locked remotely. Clicking toggles the lock state and posts to Chat Messages.",
  },
  showers: {
    title: "SHOWERS",
    back: "controls",
    secret: "Shower 5 is broken — it will not respond. Clicking any other shower posts to Chat Messages.",
  },
  system_locked: {
    title: "SYSTEM",
    back: "controls",
    secret: "No player character has Sonya\\'s Key Card and SYSTEM [A] is set to AUTO or LOCKED. Once the card is obtained (and mode is AUTO), this screen shows ACCESS GRANTED automatically. Use the 'SYSTEM [A]: ↻' toggle in the footer to override.",
    lines: [
      { type: "text", label: "[ACCESS DENIED. ADMIN KEYCARD REQUIRED.]" },
    ],
  },
  system_granted: {
    title: "SYSTEM",
    back: "controls",
    secret: "A player character has Sonya\\'s Key Card (and mode is AUTO), or SYSTEM [A] is set to UNLOCKED. Use the 'SYSTEM [A]: ↻' toggle in the footer to lock it out again.",
  },
  life_support: {
    title: "LIFE SUPPORT",
    back: "system_granted",
    secret: "This won't help much — the creature doesn't need oxygen. Clicking toggles life support and posts to Chat Messages.",
  },
  scuttle: {
    title: "SCUTTLE",
    back: "system_granted",
    secret: "Initiating requires a confirmation click and posts a warning to Chat Messages. Can be aborted by clicking again.",
  },
  comms: {
    title: "COMMS",
    back: "main",
    secret: "Replace 'IMV GRASSHOPPER' with your players' ship name. Add more ships to COMMS_SHIPS in the script if needed. Clicking a ship posts a hail to Chat Messages.",
  },
};

const _YPS14_NAV    = "cursor:pointer;padding:2px 0;user-select:none";
const _YPS14_TEXT   = "padding:2px 0";
const _YPS14_TOGGLE = "cursor:pointer;padding:2px 0;user-select:none";

function _buildYps14Html(screenKey, { schedulePage = 0 } = {}) {
  const screen = YPS14_SCREENS[screenKey];
  if (!screen) return `<div style="color:red;padding:16px">Unknown screen: ${screenKey}</div>`;
  const isGM  = game.user.isGM;
  const state = _getYps14State();
  const parts = [];

  if (isGM && screen.secret) {
    parts.push(`<div style="background:#1a0000;color:#cc6666;border:1px solid #550000;padding:6px 10px;margin-bottom:12px;font-size:0.78em;line-height:1.4;border-radius:2px">${screen.secret}</div>`);
  }

  parts.push(`<div style="letter-spacing:2px;margin-bottom:14px">${screen.title}</div>`);

  if (screen.image) {
    parts.push(`<img src="${screen.image}" style="max-width:100%;display:block;margin-bottom:10px">`);
  }

  // Dynamic screen content
  if (screenKey === "schedule") {
    const entries = _getScheduleEntries();
    const start = schedulePage * SCHEDULE_PAGE_SIZE;
    const end   = start + SCHEDULE_PAGE_SIZE;
    if (schedulePage > 0) {
      parts.push(`<div class="yps14-page" data-dir="-1" style="${_YPS14_NAV}">&lt; LESS</div>`);
    }
    for (const entry of entries.slice(start, end)) {
      parts.push(`<div style="${_YPS14_TEXT}">${entry}</div>`);
    }
    if (end < entries.length) {
      parts.push(`<div class="yps14-page" data-dir="1" style="${_YPS14_NAV}">&gt; MORE</div>`);
    }
  } else if (screenKey === "airlocks") {
    const locks = [
      { key: "bay1",      label: "DOCKING BAY 1" },
      { key: "bay2",      label: "DOCKING BAY 2" },
      { key: "mineshaft", label: "MINESHAFT    " },
    ];
    for (const lock of locks) {
      const status = state.airlocks[lock.key] ? "LOCKED" : "UNLOCKED";
      parts.push(`<div class="yps14-toggle" data-toggle="${lock.key}" style="${_YPS14_TOGGLE}">${lock.label} [&gt; ${status}]</div>`);
    }
  } else if (screenKey === "showers") {
    for (let i = 0; i < 5; i++) {
      const status = state.showers[i] ? "ON" : "OFF";
      parts.push(`<div class="yps14-toggle" data-toggle="shower${i + 1}" style="${_YPS14_TOGGLE}">SHOWER ${i + 1} [&gt; ${status}]</div>`);
    }
  } else if (screenKey === "system_granted") {
    parts.push(`<div style="${_YPS14_TEXT}">[ACCESS GRANTED. WELCOME, SONYA.]</div>`);
    parts.push(`<div class="yps14-nav" data-screen="life_support" style="${_YPS14_NAV}">&gt; LIFE SUPPORT</div>`);
    parts.push(`<div class="yps14-nav" data-screen="scuttle"      style="${_YPS14_NAV}">&gt; SCUTTLE</div>`);
  } else if (screenKey === "life_support") {
    const status = state.lifeSupport ? "ON" : "OFF";
    parts.push(`<div class="yps14-toggle" data-toggle="lifeSupport" style="${_YPS14_TOGGLE}">LIFE SUPPORT [&gt; ${status}]</div>`);
  } else if (screenKey === "scuttle") {
    if (!state.scuttle) {
      parts.push(`<div style="${_YPS14_TEXT}">[WARNING: THIS WILL INITIATE A 10-MINUTE STATION SELF-DESTRUCT SEQUENCE.]</div>`);
      parts.push(`<div class="yps14-toggle" data-toggle="scuttle" style="${_YPS14_TOGGLE};color:#ff6644">&gt; INITIATE SCUTTLE SEQUENCE</div>`);
    } else {
      parts.push(`<div style="${_YPS14_TEXT};color:#ff6644">[SCUTTLE SEQUENCE INITIATED. SELF-DESTRUCT IN 10 MINUTES.]</div>`);
      parts.push(`<div class="yps14-toggle" data-toggle="scuttle" style="${_YPS14_TOGGLE}">&gt; ABORT SCUTTLE SEQUENCE</div>`);
    }
  } else if (screenKey === "comms") {
    parts.push(`<div style="${_YPS14_TEXT}">SCANNING FOR NEARBY SHIPS...</div>`);
    for (const ship of _getCommsShips()) {
      parts.push(`<div class="yps14-hail" data-ship="${ship}" style="${_YPS14_NAV}">&gt; HAIL ${ship}</div>`);
    }
  } else {
    // Static screens: render lines declared in YPS14_SCREENS
    for (const line of screen.lines ?? []) {
      if (line.type === "nav") {
        if (line.gmOnly && !isGM) {
          parts.push(`<div style="${_YPS14_TEXT}">${line.label}</div>`);
        } else {
          let target = line.screen;
          if (target === "system_auto") {
            target = _yps14SystemUnlocked() ? "system_granted" : "system_locked";
          }
          parts.push(`<div class="yps14-nav" data-screen="${target}" style="${_YPS14_NAV}">&gt; ${line.label}</div>`);
        }
      } else {
        parts.push(`<div style="${_YPS14_TEXT}">${line.label}</div>`);
      }
    }
  }

  if (screen.back) {
    parts.push(`<div class="yps14-back" data-screen="${screen.back}" style="${_YPS14_NAV};margin-top:12px">&lt; BACK</div>`);
  }

  if (isGM) {
    const access = game.settings.get(MODULE_ID, "yps14SystemAccess");
    const accessColor = access === "locked" ? "#cc8844" : access === "unlocked" ? "#66ff44" : "#33dd22";
    const accessLabel = access === "locked" ? "LOCKED" : access === "unlocked" ? "UNLOCKED" : "AUTO";
    parts.push(`<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:16px;padding-top:8px;border-top:1px solid #1a4a1a">
      <button class="yps14-broadcast" type="button" style="background:#0a1f0a;color:#33dd22;border:1px solid #1a4a1a;padding:3px 14px;cursor:pointer;font-family:inherit;font-size:0.78em;letter-spacing:1px">BROADCAST TO PLAYERS</button>
      <div class="yps14-cycle-access" title="Cycle: auto → locked → unlocked" style="cursor:pointer;font-size:0.78em;color:${accessColor};user-select:none">SYSTEM [A]: ${accessLabel} ↻</div>
    </div>`);
  }

  return `<div style="background:#030e03;color:#33dd22;font-family:'Courier New',monospace;padding:20px 24px;line-height:1.7">${parts.join("")}</div>`;
}

class Yps14TerminalApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "traaash-yps14-terminal",
      classes: ["dialog"],
      width: 640,
      height: "auto",
      resizable: true,
    });
  }

  constructor(screenKey = "main", options = {}) {
    super(options);
    this._screen = screenKey;
    this._schedulePage = 0;
  }

  get title() { return "Ypsilon 14 Terminal"; }

  async _renderInner() {
    return $(_buildYps14Html(this._screen, { schedulePage: this._schedulePage }));
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", ".yps14-nav",       ev => this._navigate(ev.currentTarget.dataset.screen));
    html.on("click", ".yps14-back",      ev => this._navigate(ev.currentTarget.dataset.screen));
    html.on("click", ".yps14-page",      ev => { this._schedulePage += parseInt(ev.currentTarget.dataset.dir); this.render(true); });
    html.on("click", ".yps14-toggle",    ev => this._handleToggle(ev.currentTarget.dataset.toggle));
    html.on("click", ".yps14-hail",         ev => this._handleHail(ev.currentTarget.dataset.ship));
    html.on("click", ".yps14-cycle-access", () => _yps14CycleAccess().then(() => this.render(true)));
    html.on("click", ".yps14-broadcast", () => {
      game.socket.emit(`module.${MODULE_ID}`, { action: "yps14:open", screen: this._screen });
      ui.notifications.info(`Ypsilon 14 | Broadcasting: ${YPS14_SCREENS[this._screen]?.title ?? this._screen}`);
    });
  }

  _navigate(screenKey) {
    if (!YPS14_SCREENS[screenKey]) return;
    if (screenKey !== "schedule") this._schedulePage = 0;
    this._screen = screenKey;
    this.render(true);
  }

  async _handleToggle(key) {
    const state = _getYps14State();

    if (key === "bay1" || key === "bay2" || key === "mineshaft") {
      state.airlocks[key] = !state.airlocks[key];
      const names  = { bay1: "DOCKING BAY 1", bay2: "DOCKING BAY 2", mineshaft: "MINESHAFT" };
      const status = state.airlocks[key] ? "LOCKED" : "UNLOCKED";
      _yps14ChatMsg(`${names[key]}: ${status}`);
    } else if (key.startsWith("shower")) {
      const idx = parseInt(key.replace("shower", "")) - 1;
      if (idx === 4) {
        _yps14ChatMsg("SHOWER 5: NOT RESPONDING. OUT OF ORDER.");
        return;
      }
      state.showers[idx] = !state.showers[idx];
      const status = state.showers[idx] ? "ON" : "OFF";
      _yps14ChatMsg(`SHOWER ${idx + 1}: ${status}`);
    } else if (key === "lifeSupport") {
      state.lifeSupport = !state.lifeSupport;
      _yps14ChatMsg(state.lifeSupport
        ? "LIFE SUPPORT: RESTORED. Station atmosphere within survivable parameters."
        : "LIFE SUPPORT: DISABLED. Station atmosphere will become non-survivable in approximately 4 hours.");
    } else if (key === "scuttle") {
      if (!state.scuttle) {
        const ok = await _yps14Confirm("<p>Initiate 10-minute station self-destruct sequence?</p>");
        if (!ok) return;
        state.scuttle = true;
        _yps14ChatMsg("&#9888; SCUTTLE SEQUENCE INITIATED. STATION SELF-DESTRUCT IN 10 MINUTES. SEQUENCE IS IRREVERSIBLE AFTER 5 MINUTES.");
      } else {
        state.scuttle = false;
        _yps14ChatMsg("SCUTTLE SEQUENCE ABORTED.");
      }
    } else {
      return;
    }

    await _setYps14State(state);
    this.render(true);
  }

  _handleHail(ship) {
    _yps14ChatMsg(`Hailing ${ship}...`);
  }
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
    if (!_isPetItem(item)) return;
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

  $body.prepend($section);
});

// ---- Android Subtype ----

const ANDROID_SUBTYPE_TABLES = {
  bioroid:   "AndrSubBioroid01",
  synthetic: "AndrSubSynthtic1",
  cyberized: "AndrSubCyberz001",
};

// Android base_adjustment from fvtt_mosh_1e_psg (ID: zwu8YwLpOFihp7fE)
const _ANDROID_BASE_ADJ = { strength: 0, speed: 0, intellect: 20, combat: 0, sanity: 0, fear: 60, body: 0, max_wounds: 1 };

// Android base skills_granted (Linguistics, Computers, Mathematics)
const _ANDROID_SKILLS_GRANTED = [
  "Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.Lv4musH6UKdLnkFB",
  "Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.pxTk3Y9SDe0lU85j",
  "Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.JPeKPvButXFey4Xa",
];

// Non-robotic classes available as Cyberized Human base class.
// PSG core (Marine, Scientist, Teamster) + all non-robotic RWC classes.
// adj values are base_adjustment from their respective compendium items.
const CYBERIZED_BASE_CLASSES = [
  { name: "Marine",    source: "psg", id: "hEoRZtpDLnDcDM55", adj: { strength:0, speed:0,   intellect:0,  combat:10, sanity:0,   fear:20, body:10, max_wounds:1 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.WMleBDM9wAHUeoMF","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.41CEH7dOvmTaywpD"] },
  { name: "Scientist", source: "psg", id: "Tff5sFWOKlqmFopi", adj: { strength:0, speed:0,   intellect:10, combat:0,  sanity:30,  fear:0,  body:0,  max_wounds:0 }, skills: [] },
  { name: "Teamster",  source: "psg", id: "qDJrZCKDwf1A5H86", adj: { strength:5, speed:5,   intellect:5,  combat:5,  sanity:10,  fear:10, body:10, max_wounds:0 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.e1rHSbZrEDFkjizS","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.erO6jxrvrF94Fl3g"] },
  { name: "Psychic",   source: "rwc", id: "MviKBYaJbFyxdrhp", adj: { strength:0, speed:0,   intellect:20, combat:0,  sanity:-10, fear:30, body:0,  max_wounds:0 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.Lv4musH6UKdLnkFB","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.PGTfaLeKzqiNZhMk"] },
  { name: "Emissary",  source: "rwc", id: "Vq0x9hIhRkw2pyhS", adj: { strength:0, speed:0,   intellect:0,  combat:0,  sanity:30,  fear:30, body:30, max_wounds:0 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.xvdvk1oi8J9XLwtY","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.ktwDDlbvtcXAIsK8"] },
  { name: "Criminal",  source: "rwc", id: "MG5dRVFYmDFXCszO", adj: { strength:0, speed:0,   intellect:0,  combat:5,  sanity:0,   fear:0,  body:10, max_wounds:0 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.9vkt2RBybSeuHoQQ","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.pxTk3Y9SDe0lU85j","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.NBA4JiYlWEnFCS3U"] },
  { name: "Ranger",    source: "rwc", id: "DuXWShCsmRs2OgYi", adj: { strength:0, speed:10,  intellect:5,  combat:0,  sanity:0,   fear:5,  body:5,  max_wounds:0 }, skills: ["Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.Ne7SnktJvl8bFQ3n","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.8bncFeOgoLIResHT","Compendium.fvtt_mosh_1e_psg.items_skills_1e.Item.YqTFuG2lBWV4HlRC"] },
  { name: "Retiree",   source: "rwc", id: "KyC8LIq6Ps7q66Yr", adj: { strength:0, speed:-15, intellect:0,  combat:0,  sanity:0,   fear:30, body:-15,max_wounds:0 }, skills: [] },
];

async function _showAndroidSubtypeDialog() {
  return new Promise(resolve => {
    new Dialog({
      title: "Android Subtype",
      content: `<div style="font-size:0.88em;line-height:1.5">
        <p style="margin:0 0 10px">Choose your Android subtype:</p>
        <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:bold;margin-bottom:3px">Bioroid</div>
          <div>Bioroids aren't exactly robots, but they're not fully human, either. They're biological constructs, built instead of born, and designed for specific purposes. Many kinds of bioroid are quite difficult to distinguish from humans without careful testing. Think Replicants from <em>Blade Runner</em>, or Cylon "skinjobs" from <em>Battlestar Galactica</em>.</div>
        </div>
        <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:bold;margin-bottom:3px">Synthetic</div>
          <div>Synthetics are completely mechanical beings, designed to look and act like the humans they work alongside (to varying degrees of success). They usually have a synthetic skin that covers their metal and plastic interiors. Their internal fluids (if any) are milky white. Think Ash from <em>Alien</em> or the T-800 from <em>Terminator</em>.</div>
        </div>
        <div style="margin-bottom:4px">
          <div style="font-weight:bold;margin-bottom:3px">Cyberized Human</div>
          <div>The Cyberized Human was born human but their consciousness was at some point transferred to a cybernetic brain and encased in a robotic body. It's not unheard of for cyber-brains to be transferred between bodies, but this is a complicated and time-consuming procedure. Think Major Kusanagi or Batou from <em>Ghost in the Shell</em>.</div>
        </div>
      </div>`,
      buttons: {
        bioroid:   { label: "Bioroid",         callback: () => resolve("bioroid")   },
        synthetic: { label: "Synthetic",       callback: () => resolve("synthetic") },
        cyberized: { label: "Cyberized Human", callback: () => resolve("cyberized") },
      },
      close: () => resolve(null),
    }).render(true);
  });
}

async function _showCyberizedBaseClassDialog() {
  return new Promise(resolve => {
    const options = CYBERIZED_BASE_CLASSES
      .map((c, i) => `<option value="${i}">${c.name}${c.source === "rwc" ? " (RWC)" : ""}</option>`)
      .join("");
    new Dialog({
      title: "Cyberized Human — Base Class",
      content: `<div style="font-size:0.88em">
        <p style="margin:0 0 8px">Your consciousness was once human. Choose the class that represents your prior life — this determines your saves and skills.</p>
        <label><strong>Base Class:</strong>
          <select id="cyberized-base-class" style="margin-left:8px;font-size:1em">${options}</select>
        </label>
      </div>`,
      buttons: {
        confirm: { label: "Confirm", callback: html => resolve(CYBERIZED_BASE_CLASSES[parseInt(html.find("#cyberized-base-class").val())]) },
        cancel:  { label: "Cancel",  callback: () => resolve(null) },
      },
      default: "confirm",
      close: () => resolve(null),
    }).render(true);
  });
}

async function _applyCyberizedHumanStats(actor, baseClass) {
  const STATS = ["strength", "speed", "intellect", "combat", "sanity", "fear", "body"];
  const updates = {};
  for (const stat of STATS) {
    const delta = (baseClass.adj[stat] ?? 0) - (_ANDROID_BASE_ADJ[stat] ?? 0);
    if (delta === 0) continue;
    const current = foundry.utils.getProperty(actor, `system.stats.${stat}.value`) ?? 0;
    updates[`system.stats.${stat}.value`] = current + delta;
  }
  const woundDelta = (baseClass.adj.max_wounds ?? 0) - (_ANDROID_BASE_ADJ.max_wounds ?? 0);
  if (woundDelta !== 0) {
    updates["system.hits.max"] = (foundry.utils.getProperty(actor, "system.hits.max") ?? 2) + woundDelta;
  }
  if (Object.keys(updates).length) await actor.update(updates);
}

async function _applyCyberizedHumanSkills(actor, baseClass) {
  // Remove Android's granted skills
  const androidSkillIds = new Set(_ANDROID_SKILLS_GRANTED.map(u => u.split(".").pop()));
  const toRemove = actor.items.filter(i => i.type === "skill" && androidSkillIds.has(i.flags?.core?.sourceId?.split?.(".")?.pop?.() ?? "") );
  if (toRemove.length) {
    await actor.deleteEmbeddedDocuments("Item", toRemove.map(i => i.id));
  }
  // Grant base class skills
  for (const skillUuid of (baseClass.skills ?? [])) {
    try {
      const item = await fromUuid(skillUuid);
      if (item) await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    } catch(e) {
      console.warn(`${MODULE_ID} | Could not grant skill ${skillUuid}:`, e);
    }
  }
}

async function _promptAndroidSubtype(actor) {
  if (actor.getFlag(MODULE_ID, "androidSubtype") != null) return;
  if (!actor.system.class.value.startsWith("Android")) return;

  const subtype = await _showAndroidSubtypeDialog();
  if (!subtype) return;

  let baseClass = null;
  if (subtype === "cyberized") {
    baseClass = await _showCyberizedBaseClassDialog();
    if (!baseClass) return;
    await _applyCyberizedHumanStats(actor, baseClass);
    await _applyCyberizedHumanSkills(actor, baseClass);
  }

  // Roll roleplay table
  const tableId = ANDROID_SUBTYPE_TABLES[subtype];
  const tableUuid = `Compendium.${MODULE_ID}.rolltables_traaash_1e.RollTable.${tableId}`;
  let featureText = "";
  try {
    const table = await fromUuid(tableUuid);
    if (table) {
      const roll = await table.roll();
      featureText = roll.results[0]?.text ?? "";
    }
  } catch(e) {
    console.warn(`${MODULE_ID} | Could not roll Android subtype table:`, e);
  }

  // Store flags
  await actor.setFlag(MODULE_ID, "androidSubtype", subtype);
  await actor.setFlag(MODULE_ID, "androidSubtypeFeature", featureText);
  if (baseClass) await actor.setFlag(MODULE_ID, "androidBaseClass", baseClass.name);

  // Update class name to include subtype in sheet header
  const subtypeLabel = { bioroid: "Bioroid", synthetic: "Synthetic", cyberized: "Cyberized Human" }[subtype];
  const className = baseClass
    ? `Android (${subtypeLabel} / ${baseClass.name})`
    : `Android (${subtypeLabel})`;
  await actor.update({ "system.class.value": className });

  // Post to chat
  _androidSubtypeChatMsg(actor, subtypeLabel, featureText, baseClass?.name);

  // Re-render any open sheets
  for (const app of Object.values(ui.windows)) {
    if (app.actor?.id === actor.id) app.render(false);
  }
}

function _androidSubtypeChatMsg(actor, subtypeLabel, featureText, baseClassName) {
  const BORDER = { Bioroid: "#1a4a2a", Synthetic: "#1a2a4a", "Cyberized Human": "#3a1a4a" };
  const border = BORDER[subtypeLabel] ?? "#2a2a2a";
  let content = `<div style="border:1px solid ${border};padding:6px 10px;border-radius:3px;font-family:inherit">
    <div style="font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:0.82em;margin-bottom:4px">Android Subtype — ${subtypeLabel}</div>`;
  if (baseClassName) {
    content += `<div style="font-size:0.88em;margin-bottom:4px"><em>Base class:</em> ${baseClassName}</div>`;
  }
  if (featureText) {
    content += `<div style="font-style:italic;font-size:0.88em">${featureText}</div>`;
  }
  content += `</div>`;
  ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

function _buildAndroidSubtypeSection(actor, subtype) {
  const subtypeLabel = { bioroid: "Bioroid", synthetic: "Synthetic", cyberized: "Cyberized Human" }[subtype] ?? subtype;
  const feature = actor.getFlag(MODULE_ID, "androidSubtypeFeature") ?? "";
  const baseClass = actor.getFlag(MODULE_ID, "androidBaseClass") ?? null;
  const COLORS = { bioroid: "rgba(26,74,42,0.4)", synthetic: "rgba(26,42,74,0.4)", cyberized: "rgba(58,26,74,0.4)" };
  const borderColor = COLORS[subtype] ?? "rgba(40,40,40,0.35)";
  const DESCRIPTIONS = {
    bioroid:   "Bioroids aren't exactly robots, but they're not fully human, either. They're biological constructs, built instead of born, and designed for specific purposes. Many kinds of bioroid are quite difficult to distinguish from humans without careful testing.",
    synthetic: "Synthetics are completely mechanical beings, designed to look and act like the humans they work alongside (to varying degrees of success). They usually have a synthetic skin that covers their metal and plastic interiors. Their internal fluids (if any) are milky white.",
    cyberized: "The Cyberized Human was born human but their consciousness was at some point transferred to a cybernetic brain and encased in a robotic body. It's not unheard of for cyber-brains to be transferred between bodies, but this is a complicated and time-consuming procedure.",
  };
  const RULES = {
    bioroid: [
      "Biological: Functions as a human, including cryo for hyperspace jumps.",
      "Detection: Cybernetic Diagnostic Scanner won't work (crit success exposes them). Medscanner works but exposes them on a crit success.",
    ],
    synthetic: [
      "Synthetic: Doesn't sleep, breathe, eat, or age. Cannot be healed normally. Immune to poison and disease. Vulnerable to EMPs.",
      "Charging: Must charge for 6 hours once per week or shut down.",
      "Repair: Intelligence (+Mechanical Repair / Engineering / Robotics / Jury Rigging), 1 hour, 1 Scrap. Success heals HP equal to roll; crit success doubles; crit fail loses 1d10 HP.",
      "Panic: Roll on the Android Panic Table instead of the standard table.",
    ],
    cyberized: [
      `Human on the Inside: Base class — ${baseClass ?? "chosen class"}. Android Fear rules apply.`,
      "The Shell: Uses Synthetic and Charging rules. Can use Cybernetics skill to heal.",
      "Cyberbrain Transfer: Cyberbrain can be removed and transferred to another compatible body. Takes 1d10 hours.",
    ],
  };
  const desc = DESCRIPTIONS[subtype] ?? "";
  const rules = RULES[subtype] ?? [];
  const rulesHtml = rules.map(r => `<li style="margin-bottom:2px">${r}</li>`).join("");
  const featureHtml = feature
    ? `<p style="margin:6px 0 0;font-size:0.88em;font-style:italic">Roleplay feature: ${feature}</p>`
    : "";
  return $(`<div class="traaash-android-subtype-section" style="border:1px solid ${borderColor};border-radius:3px;padding:8px 10px;margin-bottom:12px">
    <div style="margin-bottom:4px">
      <span style="font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:0.78em">Android Subtype — ${subtypeLabel}</span>
    </div>
    ${desc ? `<p style="margin:0 0 6px;font-size:0.82em;color:#555;font-style:italic">${desc}</p>` : ""}
    <ul style="margin:0 0 2px;padding-left:16px;font-size:0.82em;color:#555;line-height:1.5">${rulesHtml}</ul>
    ${featureHtml}
  </div>`);
}

Hooks.on("renderActorSheet", (app, html, _data) => {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  const $html = html.jquery ? html : $(html);
  const $bioTab = $html.find('.tab[data-tab="description"]').first();
  if (!$bioTab.length) return;

  // Android Subtype block — prepend first so Company ends up above it
  if (game.settings.get(MODULE_ID, "enableAndroidSubtype")) {
    const subtype = actor.getFlag(MODULE_ID, "androidSubtype");
    if (subtype) $bioTab.prepend(_buildAndroidSubtypeSection(actor, subtype));
  }

  // The Company block — prepend last so it appears at the very top
  if (game.settings.get(MODULE_ID, "enableCompany")) {
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
  }
});

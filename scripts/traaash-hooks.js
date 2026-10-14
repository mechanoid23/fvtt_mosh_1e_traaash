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
  { id: "Ex2MilitaryTrng0", name: "Military Training",  rank: "expert",  prereqs: ["Tr2ToothAndClaw0"] },
  { id: "Ex3HuntingPet000", name: "Hunting",            rank: "expert",  prereqs: ["Tr3TrackingPet00"] },
  { id: "Ex4DetectPet0000", name: "Detect",             rank: "expert",  prereqs: ["Tr3TrackingPet00"] },
  { id: "Ex5ZeroGTraining", name: "Zero-G Training",    rank: "expert",  prereqs: ["Tr7AthleticsPet0"] },
  { id: "Ms1PanicTraining", name: "Panic Training",     rank: "master",  prereqs: ["Ex1CompanionTrng"] },
  { id: "Ms2XenoTracking0", name: "Xeno Tracking",      rank: "master",  prereqs: ["Ex2MilitaryTrng0"] },
  { id: "Ms3SearchRescue0", name: "Search & Rescue",    rank: "master",  prereqs: ["Ex3HuntingPet000"] },
  { id: "Ms4DetectSubst00", name: "Detect Substance",   rank: "master",  prereqs: ["Ex4DetectPet0000"] },
  { id: "Ms5DetectDisease", name: "Detect Disease",     rank: "master",  prereqs: ["Ex4DetectPet0000"] },
];

function _removePetSkillDependents(skillId, current) {
  PET_SKILLS.forEach(s => {
    if (s.prereqs.includes(skillId) && current.has(s.id)) {
      current.delete(s.id);
      _removePetSkillDependents(s.id, current);
    }
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
      const hasPrereqs = s.prereqs.every(p => owned.has(p));
      const isOwned = owned.has(s.id);
      const disabled = !hasPrereqs && !isOwned ? "disabled" : "";
      const checked = isOwned ? "checked" : "";
      const dim = disabled ? "opacity:0.4;" : "";
      const prereqNames = s.prereqs.map(p => PET_SKILLS.find(x => x.id === p)?.name ?? p).join(", ");
      const title = prereqNames ? `title="Requires: ${prereqNames}"` : "";
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

const SYNTHETIC_KEYWORDS = /\bsynthetic\b/i;

async function _showPetSkillPicker(item) {
  const isSynthetic = SYNTHETIC_KEYWORDS.test(item.name);
  const trainedSkills = PET_SKILLS.filter(s => s.rank === "trained");
  const expertSkills  = PET_SKILLS.filter(s => s.rank === "expert");

  function _row(s, note = "") {
    const noteHtml = note ? `<span style="color:#999;font-size:0.82em"> ${note}</span>` : "";
    return `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:2px 0">
      <input type="checkbox" class="pet-pick" data-id="${s.id}" style="margin:0;cursor:inherit">
      <span style="font-size:0.88em">${s.name}${noteHtml}</span>
    </label>`;
  }

  const trainedBlock = `<div id="petTrainedWrap">
    <div style="font-size:0.72em;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Trained <span style="color:#bbb">+10%</span></div>
    <div id="petTrainedPool">${trainedSkills.map(s => _row(s)).join("")}</div>
  </div>`;

  const expertBlock = `<div id="petExpertWrap" style="display:none">
    <div style="font-size:0.72em;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Expert <span style="color:#bbb">+15%</span></div>
    <div id="petExpertPool">${expertSkills.map(s => {
      const pre = PET_SKILLS.find(p => s.prereqs.includes(p.id));
      return _row(s, pre ? `(grants: ${pre.name})` : "");
    }).join("")}</div>
  </div>`;

  let content;
  if (!isSynthetic) {
    content = `<form style="padding:4px 0">
      <p style="margin:0 0 10px;font-size:0.88em">Organic pet: pick <strong>1 Trained</strong> skill.</p>
      ${trainedBlock}
      <p style="margin:8px 0 0;font-size:0.82em;color:#888">Remaining: <span id="petPickRem">1</span></p>
    </form>`;
  } else {
    content = `<form style="padding:4px 0">
      <p style="margin:0 0 8px;font-size:0.88em">Synthetic pet: pick <strong>2 Trained</strong> or <strong>1 Expert</strong>.</p>
      <div style="margin-bottom:10px">
        <label style="margin-right:16px;cursor:pointer"><input type="radio" name="petMode" value="trained" checked> 2 Trained</label>
        <label style="cursor:pointer"><input type="radio" name="petMode" value="expert"> 1 Expert</label>
      </div>
      ${trainedBlock}
      ${expertBlock}
      <p style="margin:8px 0 0;font-size:0.82em;color:#888">Remaining: <span id="petPickRem">2</span></p>
    </form>`;
  }

  return new Promise(resolve => {
    new Dialog({
      title: `Pet Skills — ${item.name}`,
      content,
      buttons: {
        ok: {
          label: "Confirm",
          callback: html => {
            const $h = $(html);
            const chosen = [];
            $h.find(".pet-pick:checked").each((_, el) => chosen.push(el.dataset.id));

            if (isSynthetic && $h.find("[name=petMode]:checked").val() === "expert") {
              for (const id of [...chosen]) {
                const skill = PET_SKILLS.find(s => s.id === id);
                for (const pid of skill?.prereqs ?? []) {
                  if (!chosen.includes(pid)) chosen.push(pid);
                }
              }
            }
            resolve(chosen);
          },
        },
        cancel: { label: "Cancel", callback: () => resolve(null) },
      },
      default: "ok",
      close: () => resolve(null),
      render: html => {
        const $h = $(html);
        const $confirm = $h.find(".dialog-button.ok");
        $confirm.prop("disabled", true);
        let limit = isSynthetic ? 2 : 1;

        function refresh($pool) {
          const n = $pool.find(".pet-pick:checked").length;
          $h.find("#petPickRem").text(Math.max(0, limit - n));
          $pool.find(".pet-pick:not(:checked)").prop("disabled", n >= limit);
          $pool.find(".pet-pick:checked").prop("disabled", false);
          $confirm.prop("disabled", n !== limit);
        }

        if (isSynthetic) {
          const $trW = $h.find("#petTrainedWrap");
          const $exW = $h.find("#petExpertWrap");
          const $tr  = $h.find("#petTrainedPool");
          const $ex  = $h.find("#petExpertPool");

          $h.find("[name=petMode]").on("change", function() {
            const expert = this.value === "expert";
            limit = expert ? 1 : 2;
            $trW.toggle(!expert);
            $exW.toggle(expert);
            $tr.find(".pet-pick").prop({ checked: false, disabled: false });
            $ex.find(".pet-pick").prop({ checked: false, disabled: false });
            $h.find("#petPickRem").text(limit);
            $confirm.prop("disabled", true);
          });

          $tr.on("change", ".pet-pick", () => refresh($tr));
          $ex.on("change", ".pet-pick", () => refresh($ex));
          refresh($tr);
        } else {
          $h.on("change", ".pet-pick", () => refresh($h));
          refresh($h);
        }
      },
    }, { width: 380 }).render(true);
  });
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

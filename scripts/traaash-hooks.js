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
    hint: "Enables the Pet Skill Tree compendium pack (17 skills across Trained / Expert / Master tiers with a prerequisite tree). Requires a world reload to take effect.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

// ---- Ready ----

Hooks.once("ready", () => {
  game.traaash = { rollCompanyMotivation };
  console.log("fvtt_mosh_1e_traaash | ready");
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

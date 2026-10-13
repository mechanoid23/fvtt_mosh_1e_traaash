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
  let companyTitle = mainText;

  if (rollTotal === 6) {
    const jubRoll = await new Roll("1d10").evaluate();
    const jubEntry = lookupEntry(JUBILEE_RESULTS, jubRoll.total);
    jubileeText = jubEntry?.text ?? "Unknown";
    companyTitle = `Jubilee (${jubileeText})`;
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
    companyTitle = `Mole (rival: ${moleEntry?.text ?? "Unknown"})`;
    await actor.setFlag(MODULE_ID, "company_mole_reason", moleEntry?.text ?? "Unknown");
  }

  await actor.setFlag(MODULE_ID, "company_roll", rollTotal);
  await actor.setFlag(MODULE_ID, "company", companyTitle);

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

Hooks.once("ready", () => {
  game.traaash = { rollCompanyMotivation };
});

// Fire when a class is assigned for the first time — covers the Character Generator flow.
Hooks.on("updateActor", async (actor, changes, _options, userId) => {
  if (userId !== game.user.id) return;
  if (actor.type !== "character") return;
  const newClass = changes?.system?.class?.value;
  if (!newClass) return;
  if (actor.getFlag(MODULE_ID, "company_roll") != null) return;
  setTimeout(async () => {
    const roll = await foundry.applications.api.DialogV2.confirm({
      window: { title: "The Company" },
      content: `<p>Roll <strong>The Company</strong> for <strong>${actor.name}</strong>?</p><p style="font-size:0.85em;color:#888">Find out why they're in the corporation's pocket.</p>`,
    });
    if (roll) await rollCompanyMotivation(actor);
  }, 500);
});

Hooks.on("renderActorSheet", (app, html, _data) => {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  const company = actor.getFlag(MODULE_ID, "company");
  const valueHtml = company
    ? `<span>${company}</span>`
    : `<span style="color:#888;font-style:italic">Not yet rolled</span>`;

  const $banner = $(`<div class="traaash-company-banner" style="display:flex;align-items:center;gap:6px;padding:3px 10px;background:rgba(139,26,26,0.06);border-bottom:1px solid rgba(139,26,26,0.18);font-size:0.8em;flex-wrap:wrap">
    <span style="text-transform:uppercase;letter-spacing:1px;color:#8b1a1a;font-weight:bold;font-size:0.85em;white-space:nowrap">The Company:</span>
    ${valueHtml}
    <button type="button" class="traaash-reroll-btn" style="margin-left:auto;padding:0 6px;font-size:0.78em;line-height:1.5;border-radius:2px;flex-shrink:0" title="Roll The Company">&#x21bb;</button>
  </div>`);

  const $html = html.jquery ? html : $(html);
  $html.find("nav.mosh.sheet-tabs").first().before($banner);

  $banner.find(".traaash-reroll-btn").on("click", async (evt) => {
    evt.preventDefault();
    await rollCompanyMotivation(actor);
  });
});

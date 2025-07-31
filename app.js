// 1) 公開された CSV の URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTR6jKMZbNrP-PYxWGpeZ9ljleye-p3whJyUfTuR16IawSYl0FR_Yma-osDbqvoO_GwBfEt3-E4Jaoj/pub?gid=344502602&single=true&output=csv";
// 最大何人まで選択するか
const MAX_SELECT = 4;

let characters = [];  // 読み込んだ全キャラ情報

document.addEventListener("DOMContentLoaded", () => {
  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: results => {
      characters = results.data.map(parseCharacter);
      initSelects();
      bindHideResetButtons();
    },
    error: err => console.error(err)
  });
});

// CSV → オブジェクト
function parseCharacter(r) {
  const name    = (r.name    || "").trim();
  const country = (r.country || "").trim();
  const typ     = (r.type    || "").trim();
  const factions = (r.faction || "")
    .split(/[,、]/).map(s=>s.trim()).filter(s=>s);
  const types  = (r.skill_type   || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);
  const values = (r.skill_value  || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);
  const nums   = (r.skill_number || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);
  const skills = types.map((t,i)=>({ type:t, value:values[i]||"", number:nums[i]||"" }));
  return { name, country, type: typ, factions, skills };
}

// <select> を作成
function initSelects() {
  for (let i = 1; i <= MAX_SELECT; i++) {
    const sel = document.getElementById(`charSelect${i}`);
    characters.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.name;
      opt.textContent = ch.name;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", onSelectionChange);
  }
}

// 「非表示」「リセット」ボタンに動作をバインド
function bindHideResetButtons() {
  const hideBtn  = document.getElementById("hideBtn");
  const resetBtn = document.getElementById("resetBtn");

  hideBtn.addEventListener("click", () => {
    document.querySelectorAll("#resultList li").forEach(li => {
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb && cb.checked) {
        li.style.display = "none";
        cb.checked = false;
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    document.querySelectorAll("#resultList li").forEach(li => {
      li.style.display = "";
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = false;
    });
  });
}

// 絞り込み → 描画
function onSelectionChange() {
  const selectedNames = [];
  for (let i = 1; i <= MAX_SELECT; i++) {
    const v = document.getElementById(`charSelect${i}`).value;
    if (v) selectedNames.push(v);
  }

  const ul = document.getElementById("resultList");
  ul.innerHTML = "";

  if (selectedNames.length === 0) return;

  const bases = selectedNames
    .map(n => characters.find(c=>c.name===n))
    .filter(c=>c);

  const candidates = characters.reduce((acc, c) => {
    if (selectedNames.includes(c.name)) return acc;
    const hit = c.skills.filter(sk =>
      bases.some(b => (
        (sk.type==="country" && sk.value===b.country) ||
        (sk.type==="faction" && b.factions.includes(sk.value)) ||
        (sk.type==="type"    && sk.value===b.type)
      ))
    ).map(sk=>sk.number).filter(n=>n);
    if (hit.length) acc.push({ name:c.name, numbers:Array.from(new Set(hit)) });
    return acc;
  }, []);

  if (!candidates.length) {
    ul.innerHTML = "<li>該当するキャラクターはいません。</li>";
    return;
  }

  // チェック付きで描画
  candidates.forEach((cand, idx) => {
    const li = document.createElement("li");

    // チェックボックス
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id   = `chk_${idx}`;
    li.appendChild(cb);

    // テキストノード
    const txt = document.createTextNode(` ${cand.name} ： ${cand.numbers.join("、")}`);
    li.appendChild(txt);

    ul.appendChild(li);
  });
}
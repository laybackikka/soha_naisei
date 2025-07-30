// app.js
 
// 1) 公開された CSV の URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTR6jKMZbNrP-PYxWGpeZ9ljleye-p3whJyUfTuR16IawSYl0FR_Yma-osDbqvoO_GwBfEt3-E4Jaoj/pub?gid=344502602&single=true&output=csv";
let characters = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded: CSV読み込み開始");
  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    complete: results => {
      console.log("CSV parse complete:", results.data.length, "rows");
      characters = results.data.map(r => {
        // skill_type, skill_value, skill_number をカンマ区切りで配列化
        const types   = (r.skill_type   || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);
        const values  = (r.skill_value  || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);
        const numbers = (r.skill_number || "").split(/[,、]/).map(s=>s.trim()).filter(s=>s);

        // スキルオブジェクト配列を作成
        const skills = types.map((t, i) => ({
          type:   t,
          value:  values[i]  || "",
          number: numbers[i] || ""
        }));

        // faction（csv上の列）が複数なら配列に
        const factions = (r.faction || "")
          .split(/[,、]/)
          .map(s => s.trim())
          .filter(s => s);

        return {
          name:     (r.name    || "").trim(),
          country:  (r.country || "").trim(),
          factions: factions,
          skills:   skills
        };
      });

      console.log("Parsed characters:", characters);
      initSelects();
    },
    error: err => {
      console.error("CSV parse error:", err);
    }
  });
});

function initSelects() {
  console.log("initSelects()");
  const selectIds = ["charSelect1","charSelect2","charSelect3","charSelect4"];

  selectIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) {
      console.error(`★ select not found: #${id}`);
      return;
    }
    // 先頭の「──選択──」は残しつつ、その後にキャラ名を追加
    characters.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.name;
      opt.textContent = ch.name;
      sel.appendChild(opt);
    });
    // 値が変わったら onSelectionChange を呼ぶ
    sel.addEventListener("change", onSelectionChange);
  });
}

function onSelectionChange() {
  console.log("onSelectionChange()");
  const selectIds = ["charSelect1","charSelect2","charSelect3","charSelect4"];

  // 選択されたキャラ名を取得（空文字は除く）
  const selectedNames = selectIds
    .map(id => document.getElementById(id).value)
    .filter(v => v);

  console.log("selectedNames =", selectedNames);

  const resultUl = document.getElementById("resultList");
  resultUl.innerHTML = "";
  if (selectedNames.length === 0) {
    console.log("未選択なので何もしない");
    return;
  }

  // 選択したキャラ情報を取得
  const bases = selectedNames
    .map(n => characters.find(c => c.name === n))
    .filter(c => c);

  // 全キャラから「選択キャラではない」かつ「いずれかのスキルが選択キャラの country or faction に合致するキャラ」を探す
  const candidates = characters.reduce((acc, c) => {
    if (selectedNames.includes(c.name)) return acc;

    const matchedNums = c.skills
      .filter(sk => {
        return bases.some(base => {
          // country 強化スキルが match
          if (sk.type === "country" && sk.value === base.country) {
            return true;
          }
          // faction 強化スキルが match
          if (sk.type === "faction" && base.factions.includes(sk.value)) {
            return true;
          }
          return false;
        });
      })
      .map(sk => sk.number)
      .filter(n => n);

    if (matchedNums.length > 0) {
      const uniq = Array.from(new Set(matchedNums));
      acc.push({ name: c.name, numbers: uniq });
    }
    return acc;
  }, []);

  console.log("candidates =", candidates);

  if (candidates.length === 0) {
    resultUl.innerHTML = "<li>該当するキャラクターはいません。</li>";
    return;
  }

  // 結果をリストに追加
  candidates.forEach(cand => {
    const li = document.createElement("li");
    li.textContent = `${cand.name} ： ${cand.numbers.join(", ")}`;
    resultUl.appendChild(li);
  });
}
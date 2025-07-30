// app.js
 
// 1) 公開された CSV の URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTR6jKMZbNrP-PYxWGpeZ9ljleye-p3whJyUfTuR16IawSYl0FR_Yma-osDbqvoO_GwBfEt3-E4Jaoj/pub?gid=344502602&single=true&output=csv";
// 最大何人まで選択するか
const MAX_SELECT = 4;
 
// ===== 内部変数 =====
let characters = [];  // 読み込んだ全キャラ情報
 
// ===== ページロード後に CSV をフェッチ＆パース =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("▶ DOMContentLoaded: CSV取得開始");
  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header:   true,
    skipEmptyLines: true,
    complete: results => {
      console.log("▶ CSV parse 完了:", results.data.length, "行");
      characters = results.data.map(row => parseCharacter(row));
      console.log("▶ characters:", characters);
      initSelects();
    },
    error: err => {
      console.error("✖ CSV parse error:", err);
    }
  });
});
 
// ===== CSV 1行分を JS オブジェクトに変換する関数 =====
function parseCharacter(r) {
  // name, country, type は必須１つ
  const name    = (r.name    || "").trim();
  const country = (r.country || "").trim();
  const typ     = (r.type    || "").trim();
 
  // faction は 0～複数 → 空文字 or カンマ区切り
  const factions = (r.faction || "")
    .split(/[,、]/)
    .map(s => s.trim())
    .filter(s => s);
 
  // skill_type, skill_value, skill_number は同数の要素がカンマ区切り
  const skillTypes   = (r.skill_type   || "")
    .split(/[,、]/).map(s => s.trim()).filter(s => s);
  const skillValues  = (r.skill_value  || "")
    .split(/[,、]/).map(s => s.trim()).filter(s => s);
  const skillNumbers = (r.skill_number || "")
    .split(/[,、]/).map(s => s.trim()).filter(s => s);
 
  // スキルオブジェクト配列を作成
  const skills = skillTypes.map((t, i) => ({
    type:   t,                       // "country" | "faction" | "type"
    value:  skillValues[i]  || "",   // 例："騎"、"趙国"、"桓騎軍"
    number: skillNumbers[i] || ""    // 例："表⑤"、"裏⑥"
  }));
 
  return { name, country, type: typ, factions, skills };
}
 
// ===== <select> を生成 =====
function initSelects() {
  console.log("▶ initSelects()");
  for (let i = 1; i <= MAX_SELECT; i++) {
    const sel = document.getElementById(`charSelect${i}`);
    if (!sel) {
      console.error(`✖ セレクト要素が見つかりません: #charSelect${i}`);
      continue;
    }
    // 既存の「──選択──」を保持して、以降にキャラ候補を追加
    characters.forEach(ch => {
      const opt = document.createElement("option");
      opt.value       = ch.name;
      opt.textContent = ch.name;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", onSelectionChange);
  }
}
 
// ===== 選択が変わったときの絞り込み処理 =====
function onSelectionChange() {
  console.log("▶ onSelectionChange()");
  // 選択された名前を取得（空文字は除外）
  const selectedNames = [];
  for (let i = 1; i <= MAX_SELECT; i++) {
    const v = document.getElementById(`charSelect${i}`).value;
    if (v) selectedNames.push(v);
  }
  console.log(" selectedNames =", selectedNames);
 
  const resultUl = document.getElementById("resultList");
  resultUl.innerHTML = "";
 
  if (selectedNames.length === 0) {
    // 何も選ばれていなければリセットだけ
    return;
  }
 
  // 選択されたキャラ情報配列
  const bases = selectedNames
    .map(n => characters.find(c => c.name === n))
    .filter(c => c);
 
  console.log(" bases =", bases);
 
  // 全キャラから “自分自身を除く” ＆ “いずれかのスキルが選択キャラの属性にマッチ” を探す
  const candidates = characters.reduce((acc, c) => {
    if (selectedNames.includes(c.name)) return acc;
 
    // このキャラの各スキルが、どの base にヒットするか？
    const hitNumbers = c.skills
      .filter(sk => {
        // 各選択 base と比較
        return bases.some(base => {
          // country スキル
          if (sk.type === "country" && sk.value === base.country) return true;
          // faction スキル
          if (sk.type === "faction" && base.factions.includes(sk.value)) return true;
          // type スキル
          if (sk.type === "type" && sk.value === base.type) return true;
          return false;
        });
      })
      .map(sk => sk.number)
      .filter(n => n);  // 空文字は除く
 
    if (hitNumbers.length > 0) {
      // 重複を除いて
      const uniq = Array.from(new Set(hitNumbers));
      acc.push({ name: c.name, numbers: uniq });
    }
    return acc;
  }, []);
 
  console.log(" candidates =", candidates);
 
  if (candidates.length === 0) {
    resultUl.innerHTML = "<li>該当するキャラクターはいません。</li>";
    return;
  }
 
  // 結果をリスト表示
  candidates.forEach(cand => {
    const li = document.createElement("li");
    li.textContent = `${cand.name} ： ${cand.numbers.join("、")}`;
    resultUl.appendChild(li);
  });
}
 
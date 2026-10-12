const KEY = "price-list-v8";
const THEME_KEY = "app-theme-v2";
const NOFIRM = "Без фирмы";

function uid(){ return Math.random().toString(36).slice(2,10); }

function compareNatural(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "ru", { numeric: true, sensitivity: "base" });
}

function getSeedList() {
  if (typeof SEED === "undefined" || !Array.isArray(SEED)) return [];
  let list = SEED;
  while (list.length === 1 && Array.isArray(list[0]) && Array.isArray(list[0][0])) {
    list = list[0];
  }
  return list;
}

function seed(){
  const raw = getSeedList();
  return raw.map(r => {
    if (!Array.isArray(r)) return null;
    if (r.length >= 8) {
      return {
        id: String(r[0] || uid()).trim(),
        firm: String(r[1] || "").trim() || NOFIRM,
        name: String(r[2] || "").trim(),
        cat: String(r[3] || "").trim(),
        p1: Number(r[4]) || 0,
        p2: Number(r[5]) || 0,
        p3: Number(r[6]) || 0,
        note: String(r[7] || "").trim()
      };
    }
    return {
      id: uid(),
      firm: String(r[0] || "").trim() || NOFIRM,
      name: String(r[1] || "").trim(),
      cat: String(r[2] || "").trim(),
      p1: Number(r[3]) || 0,
      p2: Number(r[4]) || 0,
      p3: Number(r[5]) || 0,
      note: String(r[6] || "").trim()
    };
  }).filter(Boolean);
}

function load(){
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(d) && d.length > 0) return d;
  } catch(e){}
  return seed();
}

function save(){
  try { localStorage.setItem(KEY, JSON.stringify(items)); }
  catch(e){ toast("Не удалось сохранить"); }
}

let items = load();
let sortKey = "id", sortDir = 1;
let editMode = false;

const $ = id => document.getElementById(id);
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function toast(t){ const el=$("toast"); if(!el) return; el.textContent=t; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),1800); }
function fmt(n){ return Number(n).toLocaleString("ru-RU"); }
function firmOf(p){ return (p.firm || "").trim() || NOFIRM; }
function markup(p){ return p.p1>0 ? (p.p3-p.p1)/p.p1*100 : 0; }
function problem(p){
  if (p.p2 < p.p1) return "Опт ниже закупки";
  if (p.p3 < p.p2) return "Розница ниже опта";
  return "";
}

/* =========================================================
   ТЕМЫ
========================================================= */
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "emerald";
  setTheme(savedTheme);

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setTheme(btn.dataset.theme);
    });
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll(".theme-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.theme === theme);
  });
}
initTheme();

function minIdOfFirm(firmName) {
  const firmItems = items.filter(p => firmOf(p) === firmName);
  if (!firmItems.length) return "9999";
  let min = firmItems[0].id;
  for (let i = 1; i < firmItems.length; i++) {
    if (compareNatural(firmItems[i].id, min) < 0) min = firmItems[i].id;
  }
  return min;
}

function allFirms(){
  const set = [...new Set(items.map(firmOf))];
  return set.sort((a, b) => {
    if (a === NOFIRM) return 1;
    if (b === NOFIRM) return -1;
    const minA = minIdOfFirm(a);
    const minB = minIdOfFirm(b);
    const cmp = compareNatural(minA, minB);
    if (cmp !== 0) return cmp;
    return a.localeCompare(b, "ru");
  });
}

function filtered(){
  const qVal = $("q") ? $("q").value : "";
  const words = qVal.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cat = $("cat") ? $("cat").value : "";
  const bad = $("badOnly") ? $("badOnly").checked : false;

  return items.filter(p=>{
    if (cat && p.cat !== cat) return false;
    if (bad && !problem(p)) return false;
    const hay = (p.id + " " + firmOf(p) + " " + p.name + " " + p.cat + " " + p.note).toLowerCase();
    return words.every(w=>hay.includes(w));
  }).sort((a,b)=>{
    if (sortKey === "id") return compareNatural(a.id, b.id) * sortDir;
    const x = sortKey==="m" ? markup(a) : a[sortKey];
    const y = sortKey==="m" ? markup(b) : b[sortKey];
    if (typeof x === "number" && typeof y === "number") return (x - y) * sortDir;
    return compareNatural(x, y) * sortDir;
  });
}

function hl(text){
  let out = esc(text);
  const qVal = $("q") ? $("q").value : "";
  qVal.trim().split(/\s+/).filter(Boolean).forEach(w=>{
    const re = new RegExp("("+esc(w).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","gi");
    out = out.replace(re,"<mark>$1</mark>");
  });
  return out;
}

function renderCats(){
  const sel=$("cat"); if(!sel) return;
  const cur=sel.value;
  const cats=[...new Set(items.map(p=>p.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  sel.innerHTML='<option value="">Все категории</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  sel.value = cats.includes(cur) ? cur : "";
  if($("firms")) $("firms").innerHTML = allFirms().map(f=>`<option value="${esc(f)}">`).join("");
}

// Рендер строки (включает мобильный блок цен m-prices-block)
function rowHTML(p){
  const pr = problem(p);

  const nameCol = `<td class="name">
    <div class="name-content">
      ${pr?`<span class="flag" title="${pr}">⚠</span>`:""}<b>${hl(p.name)}</b>
      <div class="sub2" style="font-size:0.8rem;color:var(--muted);margin-top:2px;">
        <span class="cat">${hl(p.cat)}</span>
        ${editMode 
          ? `<input class="note" data-f="note" value="${esc(p.note)}" placeholder="примечание">`
          : (p.note ? `<span class="note-text" style="font-style:italic"> · ${esc(p.note)}</span>` : "")}
      </div>
    </div>
  </td>`;

  // Десктопные колонки цен
  const pricesCol = editMode
    ? `<td class="num col-p1"><input class="p" data-f="p1" type="number" min="0" step="any" value="${p.p1}"></td>
       <td class="num col-p2"><input class="p" data-f="p2" type="number" min="0" step="any" value="${p.p2}"></td>
       <td class="num col-p3"><input class="p" data-f="p3" type="number" min="0" step="any" value="${p.p3}"></td>`
    : `<td class="num col-p1"><span class="price-val">${fmt(p.p1)}</span></td>
       <td class="num col-p2"><span class="price-val">${fmt(p.p2)}</span></td>
       <td class="num col-p3"><span class="price-val bold">${fmt(p.p3)}</span></td>`;

  // Мобильный блок цен для отображения карточкой
  const mobilePrices = `<div class="m-prices-block">
    <div class="m-price-item"><span>Закупка</span><b>${fmt(p.p1)}</b></div>
    <div class="m-price-item"><span>Опт</span><b>${fmt(p.p2)}</b></div>
    <div class="m-price-item retail"><span>Розница</span><b>${fmt(p.p3)} ₸</b></div>
  </div>`;

  const actCol = `<td class="act">
    <button class="primary btn-add" data-add>+ В чек</button>
    ${editMode ? `<button class="danger btn-del" data-del title="Удалить">✕</button>` : ""}
  </td>`;

  return `<tr data-id="${esc(p.id)}" class="${pr?"bad":""}">
    <td class="col-id"><span class="pid">${hl(p.id)}</span></td>
    ${nameCol}
    ${pricesCol}
    <td class="num col-markup">${p.p1>0?Math.round(markup(p))+"%":"—"}</td>
    ${mobilePrices}
    ${actCol}
  </tr>`;
}

function render(){
  const list = filtered();
  const groups = new Map();
  list.forEach(p=>{ const f=firmOf(p); if(!groups.has(f)) groups.set(f,[]); groups.get(f).push(p); });
  const firms = allFirms();

  if($("navlist")) {
    $("navlist").innerHTML = firms.map(f=>{
      const n = groups.has(f) ? groups.get(f).length : 0;
      return `<li><button data-firm="${esc(f)}" ${n?"":"disabled"}><span>${esc(f)}</span><span class="cnt">${n}</span></button></li>`;
    }).join("");
  }

  if($("list")) {
    $("list").innerHTML = firms.filter(f=>groups.has(f)).map(f=>{
      const g = groups.get(f);
      return `<section class="firm" data-firm="${esc(f)}">
        <h2>${esc(f)} <span class="gc">${g.length}</span></h2>
        <div class="tablebox"><table>
          <thead><tr>
            <th data-k="id" class="col-id-th">ID</th>
            <th data-k="name">Название</th>
            <th data-k="p1" class="num col-price-th">Закупка</th>
            <th data-k="p2" class="num col-price-th">Опт</th>
            <th data-k="p3" class="num col-price-th">Розница</th>
            <th data-k="m" class="num col-markup-th">Наценка</th>
            <th class="col-act"></th>
          </tr></thead>
          <tbody>${g.map(rowHTML).join("")}</tbody>
        </table></div>
      </section>`;
    }).join("");
  }

  if($("empty")) $("empty").hidden = list.length > 0;
  const bad = items.filter(problem).length;
  if($("count")) {
    $("count").textContent = `Показано ${list.length} из ${items.length} · фирм: ${groups.size}` + (bad ? ` · подозрительных цен: ${bad}` : "");
  }
  updateActive();
}

function updateActive(){
  const secs = [...document.querySelectorAll("#list section")];
  let cur = secs.length ? secs[0].dataset.firm : null;
  secs.forEach(s=>{ if (s.getBoundingClientRect().top <= 140) cur = s.dataset.firm; });
  document.querySelectorAll("#navlist button").forEach(b=>b.classList.toggle("active", b.dataset.firm===cur));
}

window.addEventListener("scroll", updateActive, {passive:true});

// Режим редактора
if($("editModeBtn")) {
  $("editModeBtn").addEventListener("click", ()=>{
    editMode = !editMode;
    $("editModeBtn").classList.toggle("active", editMode);
    $("editModeBtn").textContent = editMode ? "✏️ Редактор: ВКЛ" : "🔒 Редактор: ВЫКЛ";
    toast(editMode ? "Редактор включён" : "Редактор выключен");
    render();
  });
}

if($("navlist")) {
  $("navlist").addEventListener("click", e=>{
    const b = e.target.closest("button[data-firm]");
    if (!b || b.disabled) return;
    const sec = [...document.querySelectorAll("#list section")].find(s=>s.dataset.firm===b.dataset.firm);
    if (sec) sec.scrollIntoView({behavior:"smooth", block:"start"});
  });
}

if($("list")) {
  $("list").addEventListener("change", e=>{
    const f = e.target.dataset.f; if(!f) return;
    const tr = e.target.closest("tr"); if(!tr) return;
    const p = items.find(x=>x.id===tr.dataset.id); if(!p) return;
    if (f === "note"){ p.note = e.target.value.trim(); save(); toast("Сохранено"); return; }
    const v = Number(e.target.value);
    if (e.target.value==="" || !isFinite(v) || v < 0){ toast("Введите число ≥ 0"); render(); return; }
    p[f] = v; save(); toast("Сохранено"); render();
  });

  $("list").addEventListener("click", e=>{
    const th = e.target.closest("th[data-k]");
    if (th){ const k=th.dataset.k; sortDir = sortKey===k ? -sortDir : 1; sortKey=k; render(); return; }
    if(e.target.matches("[data-add]")){ addToCart(e.target.closest("tr").dataset.id); return; }
    if(!e.target.matches("[data-del]")) return;
    const id = e.target.closest("tr").dataset.id;
    const p = items.find(x=>x.id===id);
    if(confirm(`Удалить «${p.name}» (ID: ${p.id})?`)){ items = items.filter(x=>x.id!==id); save(); renderCats(); render(); }
  });
}

["q","cat","badOnly"].forEach(id=>{ if($(id)) $(id).addEventListener("input",render); });

if($("add")) {
  $("add").addEventListener("click",()=>{
    const name=$("n_name").value.trim();
    const p1=$("n_p1").value, p2=$("n_p2").value, p3=$("n_p3").value;
    if(!name || p1===""||p2===""||p3===""){ toast("Нужны название и все три цены"); return; }
    const id = $("n_id").value.trim() || uid();
    items.push({
      id,
      firm:$("n_firm").value.trim()||NOFIRM,
      name,
      cat:$("n_cat").value.trim(),
      p1:Number(p1)||0,
      p2:Number(p2)||0,
      p3:Number(p3)||0,
      note:$("n_note").value.trim()
    });
    ["n_id","n_firm","n_name","n_cat","n_p1","n_p2","n_p3","n_note"].forEach(i=>{ if($(i)) $(i).value=""; });
    save(); renderCats(); render(); toast("Товар добавлен");
  });
}

if($("reset")) {
  $("reset").addEventListener("click",()=>{
    if(confirm("Вернуть исходный прайс из data.js? Ваши правки будут потеряны.")){
      items=seed(); save(); renderCats(); render(); toast("Исходный прайс загружен");
    }
  });
}

if($("clear")) {
  $("clear").addEventListener("click",()=>{
    if(confirm("Удалить все товары?")){ items=[]; save(); renderCats(); render(); }
  });
}

/* =========================================================
   ЧЕК И КОРЗИНА
========================================================= */
const CKEY = "receipt-v12";
const TKEY = "receipt-time-v12";
const CLIENT_KEY = "receipt-client-v12";

let tier = "p3";

let clientInfo = (function(){
  try { return JSON.parse(localStorage.getItem(CLIENT_KEY)) || { name: "", phone: "" }; } catch(e){ return { name: "", phone: "" }; }
})();

let cart = (function(){
  try { 
    const d = JSON.parse(localStorage.getItem(CKEY)); 
    if (Array.isArray(d)) return d.map(item => ({ ...item, done: Boolean(item.done) }));
  } catch(e){}
  return [];
})();

let cartTime = 0;
try { cartTime = Number(localStorage.getItem(TKEY)) || 0; } catch(e){}

function fmtTime(ms){
  return new Date(ms).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function saveCart(){
  if (!cart.length) cartTime = 0;
  else if (!cartTime) cartTime = Date.now();
  try {
    localStorage.setItem(CKEY, JSON.stringify(cart));
    localStorage.setItem(TKEY, String(cartTime));
    localStorage.setItem(CLIENT_KEY, JSON.stringify(clientInfo));
  } catch(e){}
}

const r2 = n => Math.round(n*100)/100;
function lineSum(c){ return r2(c.price*c.qty); }
function cartTotal(){ return r2(cart.reduce((s,c)=>s+lineSum(c),0)); }
function listPrice(c){ const p = items.find(x=>x.id===c.pid); return p ? p[tier] : null; }

function renderCart(){
  const rec = $("receipt");
  if (!rec) return;

  if (!cart.length) {
    rec.hidden = true;
    return;
  }
  rec.hidden = false;

  if($("rtier")) $("rtier").value = tier;
  if($("rtime")) $("rtime").textContent = cartTime ? fmtTime(cartTime) : "";
  if($("rClientName")) $("rClientName").value = clientInfo.name || "";
  if($("rClientPhone")) $("rClientPhone").value = clientInfo.phone || "";

  if($("rrows")) {
    $("rrows").innerHTML = cart.map(c=>{
      return `<div class="cl" data-cid="${c.cid}">
        <div class="cl-top">
          <div class="item-title">
            <span class="pid">#${esc(c.pid)}</span>
            ${c.firm?`<span class="cf">${esc(c.firm)}</span>`:""}
            <b>${esc(c.name)}</b>
          </div>
          <button class="danger btn-del-cart" data-cdel title="Удалить" aria-label="Удалить">✕</button>
        </div>
        <div class="cr">
          <div class="cr-block">
            <span class="cr-label">Цена:</span>
            <input class="p" data-cf="price" type="number" min="0" step="any" value="${c.price}">
          </div>

          <div class="cr-block">
            <span class="cr-label">Кол-во:</span>
            <div class="qty-stepper">
              <button type="button" class="btn-step" data-step="-1">−</button>
              <input class="q" data-cf="qty" type="number" min="1" step="any" value="${c.qty}">
              <button type="button" class="btn-step" data-step="1">+</button>
            </div>
          </div>

          <div class="cr-sum">
            <b data-sum>${fmt(lineSum(c))} ₸</b>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  if($("rtotal")) $("rtotal").textContent = fmt(cartTotal()) + " ₸";
}

function addToCart(id){
  const p = items.find(x=>x.id===id); if(!p) return;
  const ex = cart.find(c=>c.pid===id);
  if (ex) ex.qty += 1;
  else cart.push({cid:uid(), pid:id, firm:firmOf(p), name:p.name, price:p[tier], qty:1, done:false});
  saveCart(); renderCart(); toast("Добавлено в чек");
}

if($("rClientName")) $("rClientName").addEventListener("input", e=>{ clientInfo.name = e.target.value.trim(); saveCart(); });
if($("rClientPhone")) $("rClientPhone").addEventListener("input", e=>{ clientInfo.phone = e.target.value.trim(); saveCart(); });

// Клики в чеке: удаление и кнопки плюс/минус
if($("rrows")) {
  $("rrows").addEventListener("click", e=>{
    const row = e.target.closest(".cl"); if(!row) return;
    const c = cart.find(x=>x.cid===row.dataset.cid); if(!c) return;

    if (e.target.matches("[data-cdel]")) {
      cart = cart.filter(x=>x.cid!==row.dataset.cid); saveCart(); renderCart(); return;
    }

    if (e.target.matches("[data-step]")) {
      const step = Number(e.target.dataset.step);
      c.qty = Math.max(1, r2(c.qty + step));
      saveCart(); renderCart();
    }
  });

  $("rrows").addEventListener("input", e=>{
    const f = e.target.dataset.cf; if(!f) return;
    const row = e.target.closest(".cl"); if(!row) return;
    const c = cart.find(x=>x.cid===row.dataset.cid); if(!c) return;
    const v = Number(e.target.value);
    if (e.target.value==="" || !isFinite(v) || v < 0) return;
    c[f] = v;
    const sumEl = row.querySelector("[data-sum]");
    if (sumEl) sumEl.textContent = fmt(lineSum(c)) + " ₸";
    if($("rtotal")) $("rtotal").textContent = fmt(cartTotal()) + " ₸";
    saveCart();
  });
}

if($("rtier")) {
  $("rtier").addEventListener("change", e=>{
    tier = e.target.value;
    cart.forEach(c=>{ const p = items.find(x=>x.id===c.pid); if(p) c.price = p[tier]; });
    saveCart(); renderCart(); toast("Цены пересчитаны");
  });
}

if($("rclear")) {
  $("rclear").addEventListener("click", ()=>{
    if(confirm("Очистить чек?")){ 
      cart = []; clientInfo = { name: "", phone: "" };
      saveCart(); renderCart(); 
    }
  });
}

/* =========================================================
   МОДАЛКА: НАКЛАДНАЯ
========================================================= */
function showReceipt(){
  if($("vtime")) $("vtime").textContent = cartTime ? fmtTime(cartTime) : fmtTime(Date.now());
  const hasClient = clientInfo.name || clientInfo.phone;
  if($("vClientInfo")) $("vClientInfo").hidden = !hasClient;
  if($("vClientNameRow")) $("vClientNameRow").hidden = !clientInfo.name;
  if($("vClientName")) $("vClientName").textContent = clientInfo.name;
  if($("vClientPhoneRow")) $("vClientPhoneRow").hidden = !clientInfo.phone;
  if($("vClientPhone")) $("vClientPhone").textContent = clientInfo.phone;

  if($("vrows")) {
    $("vrows").innerHTML = cart.map(c=>`<tr>
      <td><span class="pid">#${esc(c.pid)}</span> ${esc(c.name)}</td>
      <td style="text-align:right">${c.qty} × ${fmt(c.price)}</td>
      <td style="text-align:right"><b>${fmt(lineSum(c))} ₸</b></td></tr>`).join("");
  }
  if($("vtotal")) $("vtotal").textContent = fmt(cartTotal()) + " ₸";
  if($("viewer")) $("viewer").hidden = false;
}
function closeReceipt(){ if($("viewer")) $("viewer").hidden = true; }
if($("rshow")) $("rshow").addEventListener("click", showReceipt);
if($("vclose")) $("vclose").addEventListener("click", closeReceipt);
if($("viewer")) $("viewer").addEventListener("click", e=>{ if(e.target === $("viewer")) closeReceipt(); });

/* =========================================================
   МОДАЛКА: ЧЕК-ЛИСТ СБОРКИ (TODO С ПЕРЕНОСОМ ВНИЗ)
========================================================= */
function updateTodoViewStats(){
  const doneCount = cart.filter(c => c.done).length;
  if($("todoStats")) $("todoStats").textContent = `${doneCount} из ${cart.length}`;
}

function renderTodoModal(){
  const hasClient = clientInfo.name || clientInfo.phone;
  if($("todoClientInfo")) $("todoClientInfo").hidden = !hasClient;
  if($("todoClientNameRow")) $("todoClientNameRow").hidden = !clientInfo.name;
  if($("todoClientName")) $("todoClientName").textContent = clientInfo.name;
  if($("todoClientPhoneRow")) $("todoClientPhoneRow").hidden = !clientInfo.phone;
  if($("todoClientPhone")) $("todoClientPhone").textContent = clientInfo.phone;

  updateTodoViewStats();

  if($("todoRows")) {
    if(!cart.length){
      $("todoRows").innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">Чек пуст</div>`;
      return;
    }

    // СОРТИРОВКА: Несобранное (done: false) сверху, собранное (done: true) снизу!
    const sorted = [...cart].sort((a, b) => {
      if (a.done === b.done) return 0;
      return a.done ? 1 : -1;
    });

    $("todoRows").innerHTML = sorted.map(c => `
      <div class="todo-item ${c.done ? "done" : ""}" data-tcid="${c.cid}">
        <div class="todo-item-left">
          <span class="todo-check-icon">${c.done ? "✓" : ""}</span>
          <div class="todo-item-name">
            <span class="pid">#${esc(c.pid)}</span>
            <b>${esc(c.name)}</b>
          </div>
        </div>
        <div class="todo-item-qty">${c.qty} шт</div>
      </div>
    `).join("");
  }
}

function openTodoModal(){ renderTodoModal(); if($("todoModal")) $("todoModal").hidden = false; }
function closeTodoModal(){ if($("todoModal")) $("todoModal").hidden = true; }

if($("rOpenTodo")) $("rOpenTodo").addEventListener("click", openTodoModal);
if($("todoCloseBtn")) $("todoCloseBtn").addEventListener("click", closeTodoModal);
if($("todoModal")) $("todoModal").addEventListener("click", e=>{ if(e.target === $("todoModal")) closeTodoModal(); });

// Клик по элементу чек-листа: переключает галочку и сразу перемещает вниз
if($("todoRows")) {
  $("todoRows").addEventListener("click", e=>{
    const item = e.target.closest(".todo-item");
    if (!item) return;
    const cid = item.dataset.tcid;
    const c = cart.find(x => x.cid === cid);
    if (c) {
      c.done = !c.done;
      saveCart();
      renderTodoModal(); // Мгновенный перерендер с сортировкой
    }
  });
}

// Сброс всех галочек
if($("todoResetBtn")) {
  $("todoResetBtn").addEventListener("click", ()=>{
    cart.forEach(c => c.done = false);
    saveCart();
    renderTodoModal();
    toast("Отметки сброшены");
  });
}

document.addEventListener("keydown", e=>{ 
  if(e.key === "Escape") { closeReceipt(); closeTodoModal(); }
});

if($("rcopy")) {
  $("rcopy").addEventListener("click", async ()=>{
    const headerInfo = [`Чек от ${fmtTime(cartTime || Date.now())}`];
    if (clientInfo.name) headerInfo.push(`Клиент: ${clientInfo.name}`);
    if (clientInfo.phone) headerInfo.push(`Телефон: ${clientInfo.phone}`);

    const lines = cart.map(c=>`[${c.pid}] ${c.name} — ${c.qty} × ${fmt(c.price)} = ${fmt(lineSum(c))} ₸`);
    const text = `${headerInfo.join("\n")}\n\n${lines.join("\n")}\n\nИтого: ${fmt(cartTotal())} ₸`;
    try { await navigator.clipboard.writeText(text); toast("Чек скопирован"); }
    catch(e){ toast("Не удалось скопировать"); }
  });
}

// Запуск
save();
saveCart();
renderCats();
render();
renderCart();
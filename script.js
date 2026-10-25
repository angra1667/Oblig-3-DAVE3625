// ---------- State ----------
const COLORS = ["#f48fb1","#b39ddb","#80cbc4","#ffcc80","#90caf9","#a5d6a7"];
const KEY = "studyPlanner.v1";
let state = { courses: [], tasks: [], lectures: [], lectureNotes: {} };
let filter = null;        // course id or null = all
let color = COLORS[0];

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.courses) && Array.isArray(s.tasks)) { state = s; if (!Array.isArray(s.lectures)) s.lectures = []; if (!s.lectureNotes || typeof s.lectureNotes !== "object") s.lectureNotes = {}; } }
  } catch (e) { /* storage unavailable: run in memory */ }
}
function save(){
  pruneNotes();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ---------- Dates ----------
function parseDate(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function today(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function daysUntil(s){ return Math.round((parseDate(s) - today()) / 86400000); }
function relLabel(n){
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return "1 day overdue";
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n <= 7) return `In ${n} days`;
  return "";
}

// ---------- Render ----------
function render(){
  renderSwatches(); renderCourses(); renderSelect(); renderList(); renderLectures(); renderCalendar();
}
function renderSwatches(){
  $("swatches").innerHTML = COLORS.map((c,i) =>
    `<input type="radio" name="col" id="col${i}" value="${c}" ${c===color?"checked":""}>
     <label for="col${i}" style="--c:${c}" title="${c}"></label>`).join("");
  $("swatches").querySelectorAll("input").forEach(r => r.onchange = () => { color = r.value; });
}
function renderCourses(){
  const box = $("courses");
  if (!state.courses.length){ box.innerHTML = `<p class="empty" style="padding:8px 0;text-align:left">No courses yet. Add your first one below.</p>`; return; }
  const all = `<button class="course" data-id="" aria-pressed="${filter===null}"><span class="n">All courses</span><span class="x">${state.tasks.length}</span></button>`;
  box.innerHTML = all + state.courses.map(c => {
    const n = state.tasks.filter(t => t.course === c.id).length;
    return `<div style="display:flex;align-items:center;gap:4px">
      <button class="course" data-id="${c.id}" aria-pressed="${filter===c.id}" style="--c:${c.color}">
        <span class="dot"></span><span class="n">${esc(c.name)}</span><span class="x">${n}</span></button>
      <button class="btn ghost" data-del="${c.id}" aria-label="Delete ${esc(c.name)}">Delete</button></div>`;
  }).join("");
  box.querySelectorAll("[data-id]").forEach(b => b.onclick = () => { filter = b.dataset.id || null; renderCourses(); renderList(); });
  box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => deleteCourse(b.dataset.del));
}
function renderSelect(){
  const sel = $("tcourse"), prev = sel.value;
  sel.innerHTML = state.courses.length
    ? state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")
    : `<option value="">Add a course first</option>`;
  if (state.courses.some(c => c.id === prev)) sel.value = prev;
}
function renderList(){
  const hide = $("hideDone").checked;
  const course = state.courses.find(c => c.id === filter);
  $("listTitle").textContent = course ? `Deadlines: ${course.name}` : "All deadlines";
  let items = state.tasks.filter(t => (!filter || t.course === filter) && (!hide || !t.done));
  items.sort((a,b) => a.date.localeCompare(b.date) || (a.time || "23:59").localeCompare(b.time || "23:59") || a.title.localeCompare(b.title));

  const open = state.tasks.filter(t => !t.done);
  const late = open.filter(t => daysUntil(t.date) < 0).length;
  $("summary").textContent = state.tasks.length
    ? `${open.length} open · ${late} overdue` : "Plan your semester, one deadline at a time";

  if (!items.length){
    $("list").innerHTML = `<p class="empty">${state.tasks.length ? "Nothing to show with this filter." : "No deadlines yet. Add one above and it will appear here, sorted by date."}</p>`;
    return;
  }
  const mon = {month:"short"}, wd = {weekday:"short"};
  $("list").innerHTML = items.map(t => {
    const c = state.courses.find(x => x.id === t.course) || {name:"Unknown", color:"#888"};
    const d = parseDate(t.date), n = daysUntil(t.date);
    const cls = t.done ? "done" : n < 0 ? "over" : n <= 2 ? "soon" : "";
    let lab = t.done ? "" : relLabel(n);
    if (lab && t.time && n >= 0 && n <= 1) lab += " at " + t.time;
    return `<div class="task ${cls}">
      <div class="date"><b>${d.getDate()}</b><span>${d.toLocaleDateString("en-GB", mon)} ${d.getFullYear() !== today().getFullYear() ? d.getFullYear() : ""}</span></div>
      <div>
        <div class="title">${esc(t.title)}</div>
        ${t.note ? `<div class="meta">${esc(t.note)}</div>` : ""}
        <div class="meta"><span style="--c:${c.color}"><span class="dot"></span>${esc(c.name)}</span>
          <span>${esc(t.type)}</span>${t.time ? `<span>by ${t.time}</span>` : ""}<span>${d.toLocaleDateString("en-GB", wd)}</span>
          ${lab ? `<span class="flag">${lab}</span>` : ""}</div>
      </div>
      <div class="actions">
        <input type="checkbox" data-done="${t.id}" ${t.done?"checked":""} aria-label="Mark ${esc(t.title)} as done">
        <button class="btn ghost" data-rm="${t.id}" aria-label="Delete ${esc(t.title)}">Delete</button>
      </div></div>`;
  }).join("");
  $("list").querySelectorAll("[data-done]").forEach(b => b.onchange = () => {
    const t = state.tasks.find(x => x.id === b.dataset.done); t.done = b.checked; save(); render();
  });
  $("list").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
    state.tasks = state.tasks.filter(x => x.id !== b.dataset.rm); save(); render();
  });
}

// ---------- Actions ----------
function deleteCourse(id){
  const c = state.courses.find(x => x.id === id);
  const n = state.tasks.filter(t => t.course === id).length;
  askConfirm(`Delete "${c.name}"${n ? ` and its ${n} deadline${n>1?"s":""}` : ""}?`, () => doDeleteCourse(id));
}
function doDeleteCourse(id){
  state.courses = state.courses.filter(x => x.id !== id);
  state.tasks = state.tasks.filter(t => t.course !== id);
  state.lectures = state.lectures.filter(l => l.course !== id);
  if (filter === id) filter = null;
  save(); render();
}

$("courseForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("cname").value.trim();
  if (!name){ $("cerr").textContent = "Enter a course name."; return; }
  if (state.courses.some(c => c.name.toLowerCase() === name.toLowerCase())){ $("cerr").textContent = "You already have a course with that name."; return; }
  state.courses.push({ id: uid(), name, color });
  $("cname").value = ""; $("cerr").textContent = "";
  save(); render();
});

$("taskForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("ttitle").value.trim(), course = $("tcourse").value;
  const date = $("tdate").value, time = $("ttime").value;
  let msg = "";
  if (!state.courses.length) msg = "Add a course first.";
  else if (!title) msg = "Enter a title.";
  else if (!date) msg = "Choose a due date.";
  else if (!time) msg = "Choose a due time.";
  $("terr").textContent = msg;
  if (msg) return;
  state.tasks.push({ id: uid(), title, course, type: $("ttype").value, date, time, done: false, note: $("tnote").value.trim() });
  $("ttitle").value = ""; $("tnote").value = ""; save(); render();
});

$("hideDone").addEventListener("change", renderList);

// ---------- Lectures ----------
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const cOf = id => state.courses.find(c => c.id === id) || {name:"Unknown", color:"#888"};

function renderLectures(){
  const sel = $("lcourse"), prev = sel.value;
  sel.innerHTML = state.courses.length
    ? state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")
    : `<option value="">Add a course first</option>`;
  if (state.courses.some(c => c.id === prev)) sel.value = prev;
  const list = [...state.lectures].sort((a,b) => a.day - b.day || a.start.localeCompare(b.start));
  $("lectures").innerHTML = list.length ? list.map(l => `<div class="lec" style="--c:${cOf(l.course).color}">
      <span><span class="dot" style="display:inline-block;margin-right:6px"></span><b>${DAYS[l.day].slice(0,3)}</b> ${l.start}–${l.end}<br>
        <span style="color:var(--muted);font-size:13px">${esc(cOf(l.course).name)}${l.room ? ", " + esc(l.room) : ""}</span></span>
      <button class="btn ghost" data-lrm="${l.id}" aria-label="Delete lecture">Delete</button></div>`).join("")
    : `<p class="empty" style="padding:4px 0;text-align:left">No lectures yet. They repeat every week on the calendar.</p>`;
  $("lectures").querySelectorAll("[data-lrm]").forEach(b => b.onclick = () => {
    state.lectures = state.lectures.filter(l => l.id !== b.dataset.lrm); save(); render();
  });
}
$("lectureForm").addEventListener("submit", e => {
  e.preventDefault();
  const course = $("lcourse").value, day = Number($("lday").value);
  const start = $("lstart").value, end = $("lend").value, room = $("lroom").value.trim();
  let msg = "";
  if (!state.courses.length) msg = "Add a course first.";
  else if (!start || !end) msg = "Choose a start and end time.";
  else if (end <= start) msg = "End time must be after the start time.";
  $("lerr").textContent = msg;
  if (msg) return;
  state.lectures.push({ id: uid(), course, day, start, end, room });
  $("lroom").value = ""; save(); render();
});

// ---------- Calendar ----------
let calMonth = new Date(today().getFullYear(), today().getMonth(), 1);
let selDay = null;
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function eventsOn(d){
  const key = iso(d), wd = (d.getDay() + 6) % 7, ev = [];
  state.tasks.forEach(t => {
    if (t.date === key && (!filter || t.course === filter))
      ev.push({ kind: t.type === "Exam" ? "exam" : "deadline", label: t.title, type: t.type, course: t.course, done: t.done, time: t.time || "", note: t.note || "" });
  });
  state.lectures.forEach(l => {
    if (l.day === wd && (!filter || l.course === filter))
      ev.push({ kind: "lecture", label: l.start + " " + cOf(l.course).name, type: "Lecture", course: l.course, room: l.room, time: l.start, end: l.end, id: l.id, note: state.lectureNotes[l.id + ":" + key] || "" });
  });
  ev.sort((a,b) => (a.kind === "lecture") - (b.kind === "lecture") || a.time.localeCompare(b.time));
  return ev;
}

function renderCalendar(){
  if (!selDay) selDay = iso(today());
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  $("calTitle").textContent = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const offset = (calMonth.getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const weeks = Math.ceil((offset + total) / 7);
  let html = DAYS.map(d => `<div class="cal-h">${d.slice(0,3)}</div>`).join("");
  for (let i = 0; i < weeks * 7; i++){
    const d = new Date(y, m, 1 - offset + i), key = iso(d), ev = eventsOn(d);
    const cls = ["cell", d.getMonth() !== m ? "out" : "", key === iso(today()) ? "today" : "", key === selDay ? "sel" : ""].join(" ");
    const chips = ev.slice(0, 3).map(e =>
      `<span class="chip ${e.kind} ${e.done ? "done" : ""}" style="--c:${cOf(e.course).color}">${e.kind !== "lecture" && e.time ? e.time + " " : ""}${esc(e.label)}${e.note ? " \u270E" : ""}</span>`).join("");
    const more = ev.length > 3 ? `<span class="more">+${ev.length - 3} more</span>` : "";
    html += `<button class="${cls}" data-day="${key}" aria-label="${d.toDateString()}, ${ev.length} events"><span class="num">${d.getDate()}</span>${chips}${more}</button>`;
  }
  $("cal").innerHTML = html;

  const d = parseDate(selDay), ev = eventsOn(d);
  $("dayDetail").innerHTML = `<h2>${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</h2>` +
    (ev.length ? ev.map(e => `<div class="ev" style="--c:${cOf(e.course).color}">
      <span class="tm">${e.kind === "lecture" ? e.time + "–" + e.end : "Due" + (e.time ? " " + e.time : "")}</span>
      <span><span class="dot" style="display:inline-block;margin-right:6px"></span><b>${e.kind === "lecture" ? "Lecture" : esc(e.label)}</b>
        <span style="color:var(--muted);font-size:13px"><br>${e.kind === "lecture" ? "" : esc(e.type) + ", "}${esc(cOf(e.course).name)}${e.room ? ", " + esc(e.room) : ""}${e.done ? ", done" : ""}</span>${e.kind === "lecture" ? (e.note ? `<div class="note">${esc(e.note)}</div><div class="noteform"><button class="btn ghost" data-delnote="${e.id}">Delete comment</button>${savedNote === e.id + ":" + selDay ? `<span class="saved">Saved \u2713</span>` : ""}</div>` : `<div class="noteform"><input type="text" maxlength="200" data-lid="${e.id}" placeholder="Add a comment for this day only" aria-label="Comment for this lecture on this date"><button class="btn ghost" data-savenote="${e.id}">Save</button></div>`) : (e.note ? `<div class="note">${esc(e.note)}</div>` : "")}</span></div>`).join("")
      : `<p class="empty" style="padding:8px 0;text-align:left">Nothing scheduled this day.</p>`);
}
$("cal").addEventListener("click", e => {
  const b = e.target.closest("[data-day]"); if (!b) return;
  selDay = b.dataset.day; savedNote = null;
  const d = parseDate(selDay);
  if (d.getMonth() !== calMonth.getMonth()) calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderCalendar();
});
$("calPrev").onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); };
$("calNext").onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); };
$("calToday").onclick = () => { calMonth = new Date(today().getFullYear(), today().getMonth(), 1); selDay = iso(today()); renderCalendar(); };

// ---------- In-page confirm dialog ----------
// (the browser's confirm() is blocked on some pages, so we draw our own)
function askConfirm(message, onYes){
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = '<div class="dialog" role="alertdialog" aria-modal="true"><p></p><div class="noteform"><button class="btn" data-y>Delete</button><button class="btn ghost" data-n>Cancel</button></div></div>';
  o.querySelector("p").textContent = message;
  const close = () => o.remove();
  o.querySelector("[data-y]").onclick = () => { close(); onYes(); };
  o.querySelector("[data-n]").onclick = close;
  o.addEventListener("click", e => { if (e.target === o) close(); });
  o.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  document.body.appendChild(o);
  o.querySelector("[data-n]").focus();
}

// ---------- Per-date lecture comments ----------
let savedNote = null;   // which comment was just saved (for the "Saved" tick)
function saveLectureNote(id, text){
  const key = id + ":" + selDay;
  text = text.trim();
  if (text) state.lectureNotes[key] = text; else delete state.lectureNotes[key];
  savedNote = key;
  save(); renderCalendar();
}
// Remove comments belonging to lectures that no longer exist
function pruneNotes(){
  const ids = new Set(state.lectures.map(l => l.id));
  for (const k in state.lectureNotes) if (!ids.has(k.split(":")[0])) delete state.lectureNotes[k];
}
$("dayDetail").addEventListener("click", e => {
  const del = e.target.closest("[data-delnote]");
  if (del){
    const key = del.dataset.delnote + ":" + selDay;
    askConfirm("Delete this comment?", () => {
      delete state.lectureNotes[key]; savedNote = null; save(); renderCalendar();
    });
    return;
  }
  const b = e.target.closest("[data-savenote]"); if (!b) return;
  saveLectureNote(b.dataset.savenote, b.parentElement.querySelector("input").value);
});
$("dayDetail").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches("[data-lid]")){ e.preventDefault(); saveLectureNote(e.target.dataset.lid, e.target.value); }
});

load(); render();

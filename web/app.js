import { drafts, tracks } from "./demo.js";

const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const paths = {
  upload: "M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5",
  download: "M12 3v13m-4-4 4 4 4-4M4 16v5h16v-5",
  undo: "M9 6 4 11l5 5m-5-5h10a5 5 0 0 1 0 10",
  spark: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
  info: "M12 11v5m0-8v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  plus: "M12 5v14M5 12h14",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
  sliders: "M4 7h16M4 17h16M8 4v6m8 4v6",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  close: "M6 6l12 12M18 6 6 18",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  grip: "M7 5h10M7 12h10M7 19h10",
  check: "m5 12 4 4L19 6"
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}

function control(name, label, attrs = "") {
  return `<button type="button" class="icon-button" title="${label}" aria-label="${label}" ${attrs}>${icon(name)}</button>`;
}

for (const node of all("[data-icon]")) node.insertAdjacentHTML("afterbegin", icon(node.dataset.icon));
for (const button of all("[data-close]")) button.onclick = () => button.closest("dialog").close();

let order = drafts[0].slice(0, 12);
let locks = { 0: 0, 6: 6 };
let variation = 0;
let metric = "bpm";
let format = "csv";
let sort = { field: "", direction: 1 };
let checkpoints = [];
const history = [];
let noticeTimeout;

function announce(message) {
  $("#notice").textContent = message;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => { $("#notice").textContent = ""; }, 3500);
}

function remember() {
  history.push({ order: [...order], locks: { ...locks }, variation, length: $("#length").value });
  if (history.length > 50) history.shift();
}

function trackLabel(track, transition = false) {
  const tempo = transition ? `<button type="button" class="bpm transition" data-action="transition" title="Compare with previous track" aria-label="Compare with previous track">${track.bpm ?? "—"}</button>` : `<span class="bpm">${track.bpm ?? "—"}</span>`;
  return `<div class="track"><strong>${track.title}</strong><small>${track.artist}</small></div>
    ${tempo}<span class="key ${track.key?.endsWith("B") ? "major" : track.key ? "" : "missing"}">${track.key ?? "—"}</span>`;
}

function hasLock(index) {
  return Object.hasOwn(locks, index);
}

function renderOrder() {
  $("#order-count").textContent = order.length;
  $("#sequence").innerHTML = order.map((id, index) => {
    const locked = hasLock(index);
    return `<li class="order-row ${locked ? "locked" : ""}" data-row="${index}">
      <span class="handle" data-handle="${index}" title="${locked ? "Locked position" : "Drag to move"}">${locked ? icon("lock") : icon("grip")}${String(index + 1).padStart(2, "0")}</span>
      ${trackLabel(tracks[id], index > 0)}
      <div class="order-tools">
        ${control("up", "Move up", `data-action="up" ${!canMove(index, nextOpenSlot(index, -1)) ? "disabled" : ""}`)}
        ${control("down", "Move down", `data-action="down" ${!canMove(index, nextOpenSlot(index, 1)) ? "disabled" : ""}`)}
        ${control("lock", locked ? "Unlock position" : "Lock position", `data-action="lock" aria-pressed="${locked}"`)}
        ${control("close", "Remove track", `data-action="remove" ${locked || order.length === 1 || Object.keys(locks).some(slot => Number(slot) > index) ? "disabled" : ""}`)}
      </div></li>`;
  }).join("");
  $("#lock-count").textContent = Object.keys(locks).length;
  $("#anchors").innerHTML = Object.entries(locks).map(([slot, id]) =>
    `<div class="anchor-pill"><span><b>${Number(slot) + 1}</b>${tracks[id].title}</span>${control("close", "Remove anchor", `data-unlock="${slot}"`)}</div>`
  ).join("");
}

function renderCrate() {
  const query = $("#search").value.trim().toLowerCase();
  const genre = $("#genre").value;
  const filtered = tracks.filter(track => (!genre || genre === track.genre) &&
    [track.title, track.artist, track.key].some(value => value?.toLowerCase().includes(query)));
  if (sort.field) {
    filtered.sort((a, b) => {
      const first = a[sort.field];
      const second = b[sort.field];
      if (first == null || second == null) return Number(first == null) - Number(second == null);
      return sort.direction * (typeof first === "number" ? first - second : first.localeCompare(second, undefined, { numeric: true }));
    });
  }
  $("#crate").innerHTML = filtered.map(track => {
    const inSet = order.includes(track.id);
    return `<li class="crate-row">${trackLabel(track)}${control(inSet ? "check" : "plus", inSet ? "In draft" : "Add to draft", `data-add="${track.id}" ${inSet ? "disabled" : ""}`)}</li>`;
  }).join("") || '<li class="empty">No matching tracks</li>';
  for (const button of all("[data-sort]")) {
    const active = button.dataset.sort === sort.field;
    button.setAttribute("aria-pressed", active);
    button.textContent = button.dataset.sort.toUpperCase() + (active ? sort.direction === 1 ? " ↑" : " ↓" : "");
  }
}

function targetPoints() {
  const count = Number($("#length").value);
  const start = Number($("#start").value);
  const end = Number($("#end").value);
  if (!Number.isInteger(count) || count < 1 || count > tracks.length || start < 1 || start > 300 || end < 1 || end > 300) return [];
  const middle = checkpoints.filter(point => point.slot > 1 && point.slot < count && point.bpm > 0 && point.bpm <= 300);
  return [{ slot: 1, bpm: start }, ...middle.sort((a, b) => a.slot - b.slot), ...(count === 1 ? [] : [{ slot: count, bpm: end }])];
}

function renderChart() {
  const values = order.map(id => tracks[id][metric]);
  const targets = metric === "bpm" ? targetPoints() : [];
  const count = Math.max(order.length, ...targets.map(point => point.slot));
  const data = [...values.filter(value => value != null), ...targets.map(point => point.bpm)];
  if (!data.length) data.push(120);
  const step = metric === "bpm" ? Math.max(4, Math.ceil((Math.max(...data) - Math.min(...data) + 2) / 4)) : 2;
  const low = metric === "bpm" ? Math.floor((Math.min(...data) - 1) / step) * step : 0;
  const high = metric === "bpm" ? Math.ceil((Math.max(...data) + 1) / step) * step : 10;
  const x = (index) => 48 + index * 686 / Math.max(1, count - 1);
  const y = (value) => 172 - (value - low) * 151 / (high - low);
  const points = values.map((value, index) => value == null ? null : [x(index), y(value)]);
  const line = points.map((point, index) => point ? `${points[index - 1] ? "L" : "M"}${point.join(",")}` : "").join(" ");
  const target = targets.map(point => `${x(point.slot - 1)},${y(point.bpm)}`).join(" ");
  let grid = "";
  for (let value = low; value <= high; value += step) {
    grid += `<path d="M48 ${y(value)}H734" stroke="#3b3b53"/><text x="38" y="${y(value) + 4}" text-anchor="end">${value}</text>`;
  }
  const ticks = [...new Set([0, Math.round((count - 1) / 3), Math.round((count - 1) * 2 / 3), count - 1])];
  $("#chart").innerHTML = `<svg class="chart-enter" viewBox="0 0 754 200" role="img" aria-label="${metric === "bpm" ? "Tempo" : "Energy"} by set position">
    <g fill="#b0afc7" font-size="11">${grid}${ticks.map(index => `<text x="${x(index)}" y="192" text-anchor="middle">${String(index + 1).padStart(2, "0")}</text>`).join("")}</g>
    <polyline points="${target}" fill="none" stroke="#9491b5" stroke-width="1.5" stroke-dasharray="5 5"/>
    <path d="${line}" stroke="#b4aeff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((point, index) => {
      if (!point) return "";
      const [cx, cy] = point;
      const dot = hasLock(index) ? `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="#e8d1a3" transform="rotate(45 ${cx} ${cy})">` :
        `<circle cx="${cx}" cy="${cy}" r="4" fill="#b4aeff">`;
      return dot + `<title>${index + 1}. ${tracks[order[index]].title} · ${values[index]}${metric === "bpm" ? " BPM" : "/10"}</title>` + (hasLock(index) ? "</rect>" : "</circle>");
    }).join("")}
  </svg>`;
  $("#profile-title").textContent = metric === "bpm" ? "Tempo curve" : "Energy curve";
  $("#legend-metric").textContent = metric === "bpm" ? "Draft BPM" : "Demo rating";
  $("#target-legend").hidden = metric !== "bpm";
}

function render() {
  renderOrder();
  renderCrate();
  renderChart();
  $("#undo").disabled = history.length === 0;
}

function nextOpenSlot(from, direction) {
  let slot = from + direction;
  while (hasLock(slot)) slot += direction;
  return slot;
}

function canMove(from, to) {
  return from !== to && to >= 0 && to < order.length && !hasLock(from) && !hasLock(to);
}

function move(from, to) {
  if (!canMove(from, to)) return;
  remember();
  const slots = order.map((_, index) => index).filter(index => !hasLock(index));
  const unlocked = slots.map(index => order[index]);
  const [id] = unlocked.splice(slots.indexOf(from), 1);
  unlocked.splice(slots.indexOf(to), 0, id);
  slots.forEach((slot, index) => { order[slot] = unlocked[index]; });
  render();
  announce(`Moved ${tracks[id].title} to position ${to + 1}`);
}

$("#sequence").onclick = (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const slot = Number(button.closest("[data-row]").dataset.row);
  const action = button.dataset.action;
  if (action === "up" || action === "down") {
    const to = nextOpenSlot(slot, action === "up" ? -1 : 1);
    move(slot, to);
    const row = $(`[data-row="${to}"]`);
    const next = row?.querySelector(`[data-action="${action}"]`);
    (next?.disabled ? row.querySelector('[data-action="lock"]') : next)?.focus();
    return;
  }
  if (action === "transition") {
    const previous = tracks[order[slot - 1]];
    const next = tracks[order[slot]];
    const delta = previous.bpm == null || next.bpm == null ? null : next.bpm - previous.bpm;
    const tempo = delta == null ? "BPM unavailable" : `${delta >= 0 ? "+" : ""}${delta} BPM`;
    info("Transition", `${previous.title} → ${next.title} · ${tempo} · ${previous.key ?? "Unknown key"} → ${next.key ?? "Unknown key"}`);
    return;
  }
  remember();
  if (action === "lock") {
    if (hasLock(slot)) delete locks[slot];
    else locks[slot] = order[slot];
  } else {
    order.splice(slot, 1);
    $("#length").value = order.length;
  }
  render();
  $(`[data-row="${Math.min(slot, order.length - 1)}"] [data-action="lock"]`)?.focus();
};

let drag;
$("#sequence").addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-handle]");
  if (!handle || event.button !== 0 || hasLock(Number(handle.dataset.handle))) return;
  drag = { from: Number(handle.dataset.handle), to: null, pointer: event.pointerId };
  $("#sequence").setPointerCapture(event.pointerId);
  handle.closest("li").classList.add("dragging");
});

$("#sequence").addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointer) return;
  $(".drop-target")?.classList.remove("drop-target");
  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-row]");
  const index = Number(row?.dataset.row);
  drag.to = canMove(drag.from, index) ? index : null;
  if (drag.to !== null) row.classList.add("drop-target");
});

function clearDrag(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const { from, to } = drag;
  drag = null;
  $(".dragging")?.classList.remove("dragging");
  $(".drop-target")?.classList.remove("drop-target");
  if (event.type === "pointerup" && to !== null) move(from, to);
}

for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) $("#sequence").addEventListener(type, clearDrag);

$("#undo").onclick = () => {
  const previous = history.pop();
  if (!previous) return;
  ({ order, locks, variation } = previous);
  $("#length").value = previous.length;
  render();
  announce("Draft change undone");
};

function demoOrder(count, fixed, choice) {
  const reserved = Object.values(fixed);
  const pool = drafts[choice].filter(id => !reserved.includes(id));
  return Array.from({ length: count }, (_, index) => Object.hasOwn(fixed, index) ? fixed[index] : pool.shift());
}

function validateTargets() {
  if (!$("#targets").reportValidity()) return false;
  const slots = checkpoints.map(point => point.slot);
  const count = Number($("#length").value);
  if (slots.some(slot => slot <= 1 || slot >= count) || new Set(slots).size !== slots.length) {
    announce("Choose distinct checkpoint positions between the start and end.");
    return false;
  }
  if (Object.keys(locks).some(slot => Number(slot) >= count)) {
    announce("A locked track is outside the requested set length.");
    return false;
  }
  return true;
}

function generate(event) {
  event?.preventDefault();
  if (!validateTargets()) return;
  remember();
  variation = 1 - variation;
  order = demoOrder(Number($("#length").value), locks, variation);
  render();
  announce("Demo draft updated");
}

$("#targets").onsubmit = generate;
$("#generate").onclick = generate;
$("#targets").addEventListener("input", (event) => {
  const item = event.target.closest("[data-checkpoint]");
  if (item) checkpoints[Number(item.dataset.checkpoint)][event.target.dataset.field] = Number(event.target.value);
  renderChart();
});

function renderCheckpoints() {
  $("#checkpoints").innerHTML = checkpoints.map((point, index) =>
    `<div class="checkpoint" data-checkpoint="${index}"><label>Position<input type="number" data-field="slot" min="2" value="${point.slot}" required></label><label>Target BPM<input type="number" data-field="bpm" min="1" max="300" value="${point.bpm}" required></label>${control("close", "Remove checkpoint", `data-remove-checkpoint="${index}"`)}</div>`
  ).join("");
}

$("#add-checkpoint").onclick = () => {
  const count = Number($("#length").value);
  let slot = 2;
  while (checkpoints.some(point => point.slot === slot)) slot++;
  if (slot >= count) return announce("No open checkpoint positions.");
  checkpoints.push({ slot, bpm: Number($("#start").value) || 120 });
  renderCheckpoints();
  renderChart();
  $("#checkpoints").lastElementChild.querySelector("input").focus();
};

$("#checkpoints").onclick = (event) => {
  const button = event.target.closest("[data-remove-checkpoint]");
  if (!button) return;
  checkpoints.splice(Number(button.dataset.removeCheckpoint), 1);
  renderCheckpoints();
  renderChart();
  $("#add-checkpoint").focus();
};

$("#anchors").onclick = (event) => {
  const button = event.target.closest("[data-unlock]");
  if (!button) return;
  remember();
  delete locks[button.dataset.unlock];
  render();
  $("#open-anchor").focus();
};

$("#anchor-track").innerHTML = tracks.map(track => `<option value="${track.id}">${track.title} · ${track.artist}</option>`).join("");
$("#open-anchor").onclick = () => {
  if (!$("#length").reportValidity()) return;
  $("#anchor-slot").max = $("#length").value;
  const open = Array.from({ length: Number($("#length").value) }, (_, index) => index).find(index => !hasLock(index));
  $("#anchor-slot").value = open === undefined ? "" : open + 1;
  $("#anchor-error").textContent = "";
  $("#anchor-dialog").showModal();
};

$("#anchor-form").onsubmit = (event) => {
  event.preventDefault();
  const id = Number($("#anchor-track").value);
  const slot = Number($("#anchor-slot").value) - 1;
  const count = Math.max(order.length, slot + 1);
  if (hasLock(slot) || Object.values(locks).includes(id)) {
    $("#anchor-error").textContent = "That position or track is already pinned.";
    return;
  }
  remember();
  locks[slot] = id;
  const previousSlot = order.indexOf(id);
  const displaced = order[slot];
  const pool = drafts[variation].filter(candidate => !order.includes(candidate) && candidate !== id);
  order = Array.from({ length: count }, (_, index) => {
    if (index === slot) return id;
    if (index === previousSlot) return displaced ?? pool.shift();
    return order[index] ?? pool.shift();
  });
  $("#anchor-dialog").close();
  render();
  announce(`Pinned position ${slot + 1}`);
};

for (const genre of [...new Set(tracks.map(track => track.genre).filter(Boolean))].sort()) $("#genre").add(new Option(genre, genre));
$("#genre").onchange = renderCrate;
$("#search").oninput = renderCrate;
for (const button of all("[data-sort]")) button.onclick = () => {
  sort = { field: button.dataset.sort, direction: sort.field === button.dataset.sort ? -sort.direction : 1 };
  renderCrate();
  button.focus();
};
$("#crate").onclick = (event) => {
  const button = event.target.closest("[data-add]");
  if (!button || button.disabled) return;
  const id = Number(button.dataset.add);
  remember();
  order.push(id);
  $("#length").value = Math.max(order.length, Number($("#length").value));
  render();
  $("#search").focus();
  announce(`Added ${tracks[id].title}`);
};

for (const button of all("[data-metric]")) button.onclick = () => {
  metric = button.dataset.metric;
  for (const tab of all("[data-metric]")) tab.setAttribute("aria-pressed", tab === button);
  renderChart();
};

function info(title, message) {
  $("#info-title").textContent = title;
  $("#info-content").textContent = message;
  $("#info-dialog").showModal();
}

$("#coverage").onclick = () => info("Demo metadata", "40 tracks · 39 BPM · 39 keys · 32 energy ratings. Energy is an independent demo rating. A dash marks missing metadata.");
$("#open-help").onclick = () => info("Set order controls", "Drag a grip or use the up and down buttons. Lock a track to keep its position when generating a draft. To pin a transition, lock two neighboring positions. Generate swaps between canned demo orders and keeps anchors in place.");

const sources = {
  vdj: [".vdjfolder,.xml,.csv", "My Lists XML may only store paths. Attach database.xml to supply scanned BPM and key when available."],
  rb: [".xml", "Export the collection as XML. Playlist entries reference tracks in the collection, which can include BPM, key and file location."],
  serato: [".csv", "Export a played session from History. Columns and path coverage need to be checked against an actual export."],
  m3u: [".m3u,.m3u8", "These playlists primarily identify file locations. BPM and key usually need a separate metadata source."]
};

function configureSource() {
  const source = $("#source").value;
  const [accept, detail] = sources[source];
  $("#file").accept = accept;
  $("#file").value = "";
  $("#companion").value = "";
  $("#companion-label").hidden = source !== "vdj";
  $("#file-label").textContent = "Drop a list or browse";
  $("#format-details").textContent = detail;
  $("#import-status").textContent = "Preview mode. File parsing comes in the next phase.";
}

function previewFile(file) {
  if (!file) return;
  const allowed = sources[$("#source").value][0].split(",");
  if (!allowed.some(extension => file.name.toLowerCase().endsWith(extension))) {
    $("#file").value = "";
    $("#file-label").textContent = "Drop a list or browse";
    $("#import-status").textContent = "Choose a file matching the selected source.";
    return;
  }
  $("#file-label").textContent = file.name;
  $("#import-status").textContent = "File selected for preview. Open the demo crate to try the workspace.";
}

$("#source").onchange = configureSource;
$("#file").onchange = () => previewFile($("#file").files[0]);
$("#open-import").onclick = () => $("#import-dialog").showModal();
$("#drop").ondragover = (event) => {
  event.preventDefault();
  $("#drop").classList.add("over");
};
$("#drop").ondragleave = () => $("#drop").classList.remove("over");
$("#drop").ondrop = (event) => {
  event.preventDefault();
  $("#drop").classList.remove("over");
  $("#file").value = "";
  previewFile(event.dataTransfer.files[0]);
};
$("#load-demo").onclick = () => {
  $("#import-dialog").close();
  announce("Demo crate ready · 40 tracks");
  $("#search").focus();
};

function exportText() {
  if (format === "m3u8") return "#EXTM3U\n" + order.map(id => tracks[id].path).join("\n") + "\n";
  const quote = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  return "Position,Title,Artist,BPM,Key\n" + order.map((id, index) => {
    const track = tracks[id];
    return [index + 1, track.title, track.artist, track.bpm, track.key].map(quote).join(",");
  }).join("\n") + "\n";
}

function renderExport() {
  const missingPath = format === "m3u8" && order.some(id => !tracks[id].path);
  $("#export-preview").textContent = missingPath ? "A track has no file path. Use CSV for this draft." : exportText();
  $("#download").disabled = missingPath;
}

$("#open-export").onclick = () => {
  renderExport();
  $("#export-dialog").showModal();
};

for (const button of all("[data-export]")) button.onclick = () => {
  format = button.dataset.export;
  for (const tab of all("[data-export]")) tab.setAttribute("aria-pressed", tab === button);
  renderExport();
};

$("#download").onclick = () => {
  const url = URL.createObjectURL(new Blob([exportText()], { type: format === "csv" ? "text/csv;charset=utf-8" : "audio/x-mpegurl;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `after-hours-demo.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

configureSource();
render();

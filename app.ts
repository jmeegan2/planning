interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface FindOutItem {
  unknown: string;
  plan: string;
  checked: boolean;
}

interface DecisionRow {
  date: string;
  decision: string;
  reasoning: string;
}

interface TaskPlan {
  id: string;
  title: string;
  ticket: string;
  dateStarted: string;
  contextBucket: string;
  doneItems: ChecklistItem[];
  knowItems: string[];
  findOutItems: FindOutItem[];
  chunkItems: ChecklistItem[];
  noteItems: string[];
  riskItems: string[];
  images: string[];
  decisions: DecisionRow[];
  actualTime: string;
  surprised: string;
  differently: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "taskPlans";

let plans: TaskPlan[] = [];
let activePlanId: string | null = null;
let editMode = true;

// DOM refs
const planListEl = document.getElementById("plan-list") as HTMLUListElement;
const formEl = document.getElementById("plan-form") as HTMLFormElement;
const btnNew = document.getElementById("btn-new") as HTMLButtonElement;
const btnEdit = document.getElementById("btn-edit") as HTMLButtonElement;
const btnDelete = document.getElementById("btn-delete") as HTMLButtonElement;
const btnExport = document.getElementById("btn-export") as HTMLButtonElement;
const sidebarEl = document.getElementById("sidebar") as HTMLElement;
const btnCollapse = document.getElementById("btn-toggle-sidebar") as HTMLButtonElement;
const btnExpand = document.getElementById("btn-expand-sidebar") as HTMLButtonElement;

// Sidebar toggle
btnCollapse.addEventListener("click", () => {
  sidebarEl.classList.add("collapsed");
});
btnExpand.addEventListener("click", () => {
  sidebarEl.classList.remove("collapsed");
});

// Export PDF
btnExport.addEventListener("click", () => {
  window.print();
});

// Load plans from localStorage
function loadPlans(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  plans = raw ? JSON.parse(raw) : [];
}

function savePlans(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Sidebar rendering
function renderSidebar(): void {
  planListEl.innerHTML = "";
  const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const plan of sorted) {
    const li = document.createElement("li");
    li.className = plan.id === activePlanId ? "active" : "";
    li.innerHTML = `
      <span class="plan-title">${escapeHtml(plan.title || "Untitled")}</span>
      <span class="plan-meta">${plan.dateStarted || "No date"}<span class="plan-bucket">${plan.contextBucket}</span></span>
    `;
    li.addEventListener("click", () => {
      loadPlan(plan.id);
    });
    planListEl.appendChild(li);
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// Auto-resize textarea helper
function autoResize(ta: HTMLTextAreaElement): void {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}

function makeAutoResizing(ta: HTMLTextAreaElement): void {
  ta.rows = 1;
  ta.addEventListener("input", () => autoResize(ta));
  requestAnimationFrame(() => autoResize(ta));
}

// Recalculate all textareas on window resize
window.addEventListener("resize", () => {
  document.querySelectorAll<HTMLTextAreaElement>(".plan-form textarea").forEach(autoResize);
});

// Checklist helpers
function addChecklistItem(containerId: string, text = "", checked = false): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "checklist-item" + (checked ? " checked" : "");
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <textarea placeholder="Enter item...">${escapeHtml(text)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); scheduleAutoSave(); });
  const cb = div.querySelector("input[type='checkbox']") as HTMLInputElement;
  cb.addEventListener("change", () => {
    div.classList.toggle("checked", cb.checked);
  });
  const ta = div.querySelector("textarea") as HTMLTextAreaElement;
  makeAutoResizing(ta);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addChecklistItem(containerId);
      const items = container.querySelectorAll(".checklist-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

function addListItem(containerId: string, text = ""): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "list-item";
  div.innerHTML = `
    <textarea placeholder="Enter item...">${escapeHtml(text)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); scheduleAutoSave(); });
  const ta = div.querySelector("textarea") as HTMLTextAreaElement;
  makeAutoResizing(ta);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addListItem(containerId);
      const items = container.querySelectorAll(".list-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

function addFindOutItem(containerId: string, unknown = "", plan = "", checked = false): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "findout-item" + (checked ? " checked" : "");
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <textarea placeholder="Unknown...">${escapeHtml(unknown)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
    <textarea class="findout-plan" placeholder="Plan: read docs / ask someone / spike...">${escapeHtml(plan)}</textarea>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); scheduleAutoSave(); });
  const cb = div.querySelector("input[type='checkbox']") as HTMLInputElement;
  cb.addEventListener("change", () => {
    div.classList.toggle("checked", cb.checked);
  });
  div.querySelectorAll("textarea").forEach(ta => makeAutoResizing(ta));
  const textareas = div.querySelectorAll("textarea");
  textareas[textareas.length - 1].addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addFindOutItem(containerId);
      const items = container.querySelectorAll(".findout-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

function addDecisionRow(date = "", decision = "", reasoning = ""): void {
  const tbody = document.getElementById("decision-rows") as HTMLTableSectionElement;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="date-cell"><textarea class="decision-date" placeholder="MM/DD">${escapeHtml(date)}</textarea><button type="button" class="btn-today" title="Today">today</button></td>
    <td><textarea class="decision-text" placeholder="Decision">${escapeHtml(decision)}</textarea></td>
    <td><textarea class="decision-text" placeholder="Reasoning">${escapeHtml(reasoning)}</textarea></td>
    <td><button type="button" class="btn-remove" title="Remove">&times;</button></td>
  `;
  tr.querySelector(".btn-remove")!.addEventListener("click", () => { tr.remove(); scheduleAutoSave(); });
  const dateTA = tr.querySelector(".decision-date") as HTMLTextAreaElement;
  tr.querySelector(".btn-today")!.addEventListener("click", () => {
    const now = new Date();
    dateTA.value = String(now.getMonth() + 1).padStart(2, "0") + "/" + String(now.getDate()).padStart(2, "0");
    autoResize(dateTA);
    scheduleAutoSave();
  });
  tr.querySelectorAll("textarea").forEach(ta => makeAutoResizing(ta));
  const textareas = tr.querySelectorAll("textarea");
  textareas[textareas.length - 1].addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addDecisionRow();
      const rows = tbody.querySelectorAll("tr");
      const last = rows[rows.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  tbody.appendChild(tr);
}

// Image handling
const imageDropZone = document.getElementById("image-drop") as HTMLDivElement;
const imageInput = document.getElementById("image-input") as HTMLInputElement;
const imageGallery = document.getElementById("image-gallery") as HTMLDivElement;

function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function addImageToGallery(dataUrl: string): void {
  const wrapper = document.createElement("div");
  wrapper.className = "image-item";
  wrapper.innerHTML = `
    <img src="${dataUrl}">
    <button type="button" class="btn-remove-img" title="Remove">&times;</button>
  `;
  wrapper.querySelector(".btn-remove-img")!.addEventListener("click", () => {
    wrapper.remove();
    scheduleAutoSave();
  });
  imageGallery.appendChild(wrapper);
}

async function handleFiles(files: FileList): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (!files[i].type.startsWith("image/")) continue;
    const dataUrl = await resizeImage(files[i], 1600);
    addImageToGallery(dataUrl);
  }
  scheduleAutoSave();
}

imageDropZone.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
  if (imageInput.files) handleFiles(imageInput.files);
  imageInput.value = "";
});
imageDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  imageDropZone.classList.add("dragover");
});
imageDropZone.addEventListener("dragleave", () => {
  imageDropZone.classList.remove("dragover");
});
imageDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  imageDropZone.classList.remove("dragover");
  if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
});

function getImages(): string[] {
  const imgs: string[] = [];
  imageGallery.querySelectorAll(".image-item img").forEach(img => {
    imgs.push((img as HTMLImageElement).src);
  });
  return imgs;
}

function renderImages(images: string[]): void {
  imageGallery.innerHTML = "";
  for (const src of images) addImageToGallery(src);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Gather form data into a TaskPlan
function gatherFormData(): Omit<TaskPlan, "id" | "createdAt" | "updatedAt"> {
  const title = (document.getElementById("title") as HTMLInputElement).value;
  const ticket = (document.getElementById("ticket") as HTMLInputElement).value;
  const dateStarted = (document.getElementById("date-started") as HTMLInputElement).value;
  const contextBucket = (document.getElementById("context-bucket") as HTMLSelectElement).value;

  const doneItems: ChecklistItem[] = [];
  document.querySelectorAll("#done-items .checklist-item").forEach(el => {
    doneItems.push({
      text: (el.querySelector("textarea") as HTMLTextAreaElement).value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const knowItems: string[] = [];
  document.querySelectorAll("#know-items .list-item").forEach(el => {
    knowItems.push((el.querySelector("textarea") as HTMLTextAreaElement).value);
  });

  const findOutItems: FindOutItem[] = [];
  document.querySelectorAll("#find-out-items .findout-item").forEach(el => {
    const textareas = el.querySelectorAll("textarea");
    findOutItems.push({
      unknown: textareas[0].value,
      plan: textareas[1].value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const chunkItems: ChecklistItem[] = [];
  document.querySelectorAll("#chunk-items .checklist-item").forEach(el => {
    chunkItems.push({
      text: (el.querySelector("textarea") as HTMLTextAreaElement).value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const noteItems: string[] = [];
  document.querySelectorAll("#note-items .list-item").forEach(el => {
    noteItems.push((el.querySelector("textarea") as HTMLTextAreaElement).value);
  });

  const riskItems: string[] = [];
  document.querySelectorAll("#risk-items .list-item").forEach(el => {
    riskItems.push((el.querySelector("textarea") as HTMLTextAreaElement).value);
  });

  const decisions: DecisionRow[] = [];
  document.querySelectorAll("#decision-rows tr").forEach(tr => {
    const textareas = tr.querySelectorAll("textarea");
    decisions.push({
      date: textareas[0].value,
      decision: textareas[1].value,
      reasoning: textareas[2].value,
    });
  });

  const actualTime = (document.getElementById("actual-time") as HTMLTextAreaElement).value;
  const surprised = (document.getElementById("surprised") as HTMLTextAreaElement).value;
  const differently = (document.getElementById("differently") as HTMLTextAreaElement).value;

  const images = getImages();

  return { title, ticket, dateStarted, contextBucket, doneItems, knowItems, findOutItems, chunkItems, noteItems, riskItems, images, decisions, actualTime, surprised, differently };
}

// Populate form from a plan
function populateForm(plan: TaskPlan): void {
  (document.getElementById("title") as HTMLInputElement).value = plan.title;
  (document.getElementById("ticket") as HTMLInputElement).value = plan.ticket;
  (document.getElementById("date-started") as HTMLInputElement).value = plan.dateStarted;
  (document.getElementById("context-bucket") as HTMLSelectElement).value = plan.contextBucket;

  // Clear dynamic sections
  document.getElementById("done-items")!.innerHTML = "";
  document.getElementById("know-items")!.innerHTML = "";
  document.getElementById("find-out-items")!.innerHTML = "";
  document.getElementById("chunk-items")!.innerHTML = "";
  document.getElementById("note-items")!.innerHTML = "";
  document.getElementById("risk-items")!.innerHTML = "";
  document.getElementById("decision-rows")!.innerHTML = "";

  for (const item of plan.doneItems) addChecklistItem("done-items", item.text, item.checked);
  for (const item of plan.knowItems) addListItem("know-items", item);
  for (const item of plan.findOutItems) addFindOutItem("find-out-items", item.unknown, item.plan, item.checked);
  for (const item of plan.chunkItems) addChecklistItem("chunk-items", item.text, item.checked);
  for (const item of (plan.noteItems || [])) addListItem("note-items", item);
  for (const item of plan.riskItems) addListItem("risk-items", item);
  renderImages(plan.images || []);
  for (const d of plan.decisions) addDecisionRow(d.date, d.decision, d.reasoning);

  const actualTimeTA = document.getElementById("actual-time") as HTMLTextAreaElement;
  const surprisedTA = document.getElementById("surprised") as HTMLTextAreaElement;
  const differentlyTA = document.getElementById("differently") as HTMLTextAreaElement;
  actualTimeTA.value = plan.actualTime;
  surprisedTA.value = plan.surprised;
  differentlyTA.value = plan.differently;
  requestAnimationFrame(() => { autoResize(actualTimeTA); autoResize(surprisedTA); autoResize(differentlyTA); });
}

function clearForm(): void {
  (document.getElementById("title") as HTMLInputElement).value = "";
  (document.getElementById("ticket") as HTMLInputElement).value = "";
  (document.getElementById("date-started") as HTMLInputElement).value = "";
  (document.getElementById("context-bucket") as HTMLSelectElement).value = "frontend";
  document.getElementById("done-items")!.innerHTML = "";
  document.getElementById("know-items")!.innerHTML = "";
  document.getElementById("find-out-items")!.innerHTML = "";
  document.getElementById("chunk-items")!.innerHTML = "";
  document.getElementById("note-items")!.innerHTML = "";
  document.getElementById("risk-items")!.innerHTML = "";
  document.getElementById("decision-rows")!.innerHTML = "";
  imageGallery.innerHTML = "";
  (document.getElementById("actual-time") as HTMLTextAreaElement).value = "";
  (document.getElementById("surprised") as HTMLTextAreaElement).value = "";
  (document.getElementById("differently") as HTMLTextAreaElement).value = "";

  // Add starter items
  addChecklistItem("done-items");
  addListItem("know-items");
  addFindOutItem("find-out-items");
  addChecklistItem("chunk-items");
  addListItem("note-items");
  addListItem("risk-items");
}

function setEditMode(enabled: boolean): void {
  editMode = enabled;
  if (enabled) {
    formEl.classList.remove("readonly");
    btnEdit.style.display = "none";
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>(".plan-form textarea").forEach(autoResize);
    });
  } else {
    formEl.classList.add("readonly");
    btnEdit.style.display = "";
  }
}

// Auto-save with debounce
let autoSaveTimer: number | null = null;

function autoSave(): void {
  if (!editMode) return;

  const data = gatherFormData();
  const now = Date.now();

  if (activePlanId) {
    const idx = plans.findIndex(p => p.id === activePlanId);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...data, updatedAt: now };
    }
  } else {
    // First edit on a new plan — create it
    const plan: TaskPlan = {
      id: generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    plans.push(plan);
    activePlanId = plan.id;
  }

  savePlans();
  renderSidebar();
}

function scheduleAutoSave(): void {
  if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(autoSave, 500);
}

// Listen for any input/change in the form
formEl.addEventListener("input", scheduleAutoSave);
formEl.addEventListener("change", scheduleAutoSave);

// Create new plan
function newPlan(): void {
  activePlanId = null;
  clearForm();
  setEditMode(true);
  renderSidebar();
}

// Save current form
function savePlan(): void {
  const data = gatherFormData();
  const now = Date.now();

  if (activePlanId) {
    const idx = plans.findIndex(p => p.id === activePlanId);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...data, updatedAt: now };
    }
  } else {
    const newPlan: TaskPlan = {
      id: generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    plans.push(newPlan);
    activePlanId = newPlan.id;
  }

  savePlans();
  setEditMode(false);
  renderSidebar();
}

// Load a plan by ID
function loadPlan(id: string): void {
  const plan = plans.find(p => p.id === id);
  if (!plan) return;
  activePlanId = plan.id;
  populateForm(plan);
  setEditMode(false);
  renderSidebar();
}

// Delete active plan
function deletePlan(): void {
  if (!activePlanId) return;
  if (!confirm("Delete this plan?")) return;
  plans = plans.filter(p => p.id !== activePlanId);
  savePlans();
  activePlanId = null;
  clearForm();
  setEditMode(true);
  renderSidebar();
}

// Wire up event listeners
btnNew.addEventListener("click", newPlan);
btnEdit.addEventListener("click", () => setEditMode(true));
btnDelete.addEventListener("click", deletePlan);

// Add-item buttons for checklists and lists
document.querySelectorAll(".btn-add").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.target!;
    const container = document.getElementById(target)!;
    if (container.classList.contains("checklist-group")) {
      addChecklistItem(target);
    } else {
      addListItem(target);
    }
  });
});

document.querySelectorAll(".btn-add-findout").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.target!;
    addFindOutItem(target);
  });
});

document.getElementById("btn-add-decision")!.addEventListener("click", () => {
  addDecisionRow();
});

// Make wrap-up textareas auto-resizing
makeAutoResizing(document.getElementById("actual-time") as HTMLTextAreaElement);
makeAutoResizing(document.getElementById("surprised") as HTMLTextAreaElement);
makeAutoResizing(document.getElementById("differently") as HTMLTextAreaElement);

// Init
loadPlans();
renderSidebar();

if (plans.length > 0) {
  const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt);
  loadPlan(sorted[0].id);
} else {
  clearForm();
  setEditMode(true);
}

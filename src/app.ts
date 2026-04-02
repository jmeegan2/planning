import { TaskPlan, ChecklistItem, DecisionRow } from "./types.js";
import { loadPlansFromStorage, savePlansToStorage, generateId, exportJson, importJson } from "./storage.js";
import { autoResize, makeAutoResizing, escapeHtml, todayString, addChecklistItem, addListItem, addDecisionRow, addImageToGallery, resizeImage } from "./ui.js";

declare const marked: { parse: (s: string) => string };

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
const imageDropZone = document.getElementById("image-drop") as HTMLDivElement;
const imageInput = document.getElementById("image-input") as HTMLInputElement;
const imageGallery = document.getElementById("image-gallery") as HTMLDivElement;
const btnGear = document.getElementById("btn-gear") as HTMLButtonElement;
const gearDropdown = document.getElementById("gear-dropdown") as HTMLDivElement;
const btnExportJson = document.getElementById("btn-export-json") as HTMLButtonElement;
const btnImportJson = document.getElementById("btn-import-json") as HTMLButtonElement;
const importFileInput = document.getElementById("import-file") as HTMLInputElement;

// --- Helpers ---

function loadPlans(): void {
  plans = loadPlansFromStorage();
}

function savePlans(): void {
  savePlansToStorage(plans);
}

function scheduleAutoSave(): void {
  if (autoSaveTimer !== null) clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(autoSave, 500);
}

// --- Sidebar ---

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
    li.addEventListener("click", () => loadPlan(plan.id));
    planListEl.appendChild(li);
  }
}

btnCollapse.addEventListener("click", () => sidebarEl.classList.add("collapsed"));
btnExpand.addEventListener("click", () => sidebarEl.classList.remove("collapsed"));

// --- Images ---

function getImages(): string[] {
  const imgs: string[] = [];
  imageGallery.querySelectorAll(".image-item img").forEach(img => {
    imgs.push((img as HTMLImageElement).src);
  });
  return imgs;
}

function renderImages(images: string[]): void {
  imageGallery.innerHTML = "";
  for (const src of images) addImageToGallery(imageGallery, src, scheduleAutoSave);
}

async function handleFiles(files: FileList): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (!files[i].type.startsWith("image/")) continue;
    const dataUrl = await resizeImage(files[i], 1600);
    addImageToGallery(imageGallery, dataUrl, scheduleAutoSave);
  }
  scheduleAutoSave();
}

imageDropZone.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
  if (imageInput.files) handleFiles(imageInput.files);
  imageInput.value = "";
});
imageDropZone.addEventListener("dragover", (e) => { e.preventDefault(); imageDropZone.classList.add("dragover"); });
imageDropZone.addEventListener("dragleave", () => imageDropZone.classList.remove("dragover"));
imageDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  imageDropZone.classList.remove("dragover");
  if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
});

// --- Form data ---

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

  const findOutItems: string[] = [];
  document.querySelectorAll("#find-out-items .list-item").forEach(el => {
    findOutItems.push((el.querySelector("textarea") as HTMLTextAreaElement).value);
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

function populateForm(plan: TaskPlan): void {
  clearMarkdown();
  (document.getElementById("title") as HTMLInputElement).value = plan.title;
  (document.getElementById("ticket") as HTMLInputElement).value = plan.ticket;
  (document.getElementById("date-started") as HTMLInputElement).value = plan.dateStarted;
  (document.getElementById("context-bucket") as HTMLSelectElement).value = plan.contextBucket;

  document.getElementById("done-items")!.innerHTML = "";
  document.getElementById("know-items")!.innerHTML = "";
  document.getElementById("find-out-items")!.innerHTML = "";
  document.getElementById("chunk-items")!.innerHTML = "";
  document.getElementById("note-items")!.innerHTML = "";
  document.getElementById("risk-items")!.innerHTML = "";
  document.getElementById("decision-rows")!.innerHTML = "";

  for (const item of plan.doneItems) addChecklistItem("done-items", item.text, item.checked, scheduleAutoSave);
  for (const item of plan.knowItems) addListItem("know-items", item, scheduleAutoSave);
  for (const item of plan.findOutItems) {
    if (typeof item === "string") {
      addListItem("find-out-items", item, scheduleAutoSave);
    } else {
      // Migrate old format: combine unknown + plan into one string
      const old = item as any;
      const text = old.plan ? `${old.unknown}\nPlan: ${old.plan}` : old.unknown;
      addListItem("find-out-items", text, scheduleAutoSave);
    }
  }
  for (const item of plan.chunkItems) addChecklistItem("chunk-items", item.text, item.checked, scheduleAutoSave);
  for (const item of (plan.noteItems || [])) addListItem("note-items", item, scheduleAutoSave);
  for (const item of plan.riskItems) addListItem("risk-items", item, scheduleAutoSave);
  renderImages(plan.images || []);
  for (const d of plan.decisions) addDecisionRow(d.date, d.decision, d.reasoning, scheduleAutoSave, scheduleAutoSave);

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

  addChecklistItem("done-items", "", false, scheduleAutoSave);
  addListItem("know-items", "", scheduleAutoSave);
  addListItem("find-out-items", "", scheduleAutoSave);
  addChecklistItem("chunk-items", "", false, scheduleAutoSave);
  addListItem("note-items", "", scheduleAutoSave);
  addListItem("risk-items", "", scheduleAutoSave);
}

// --- Edit mode ---

function renderMarkdown(): void {
  formEl.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(ta => {
    if (!ta.value.trim()) return;
    const overlay = document.createElement("div");
    overlay.className = "md-render";
    // Carry over original classes for layout (e.g. findout-plan)
    if (ta.classList.contains("findout-plan")) overlay.classList.add("findout-plan");
    overlay.innerHTML = marked.parse(ta.value);
    ta.style.display = "none";
    ta.insertAdjacentElement("afterend", overlay);
  });
}

function clearMarkdown(): void {
  formEl.querySelectorAll(".md-render").forEach(el => {
    const ta = el.previousElementSibling as HTMLTextAreaElement;
    if (ta) ta.style.display = "";
    el.remove();
  });
}

function setEditMode(enabled: boolean): void {
  editMode = enabled;
  if (enabled) {
    clearMarkdown();
    formEl.classList.remove("readonly");
    btnEdit.style.display = "none";
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>(".plan-form textarea").forEach(autoResize);
    });
  } else {
    formEl.classList.add("readonly");
    btnEdit.style.display = "";
    renderMarkdown();
  }
}

// --- Auto-save ---

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
    const plan: TaskPlan = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    plans.push(plan);
    activePlanId = plan.id;
  }

  savePlans();
  renderSidebar();
}

formEl.addEventListener("input", scheduleAutoSave);
formEl.addEventListener("change", scheduleAutoSave);

// --- Plan operations ---

function newPlan(): void {
  activePlanId = null;
  clearForm();
  setEditMode(true);
  renderSidebar();
}

function loadPlan(id: string): void {
  const plan = plans.find(p => p.id === id);
  if (!plan) return;
  activePlanId = plan.id;
  populateForm(plan);
  setEditMode(false);
  renderSidebar();
}

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

// --- Event wiring ---

btnNew.addEventListener("click", newPlan);
btnEdit.addEventListener("click", () => setEditMode(true));
btnDelete.addEventListener("click", deletePlan);
btnExport.addEventListener("click", () => { gearDropdown.classList.remove("open"); window.print(); });

document.querySelectorAll(".btn-add").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.target!;
    const container = document.getElementById(target)!;
    if (container.classList.contains("checklist-group")) {
      addChecklistItem(target, "", false, scheduleAutoSave);
    } else {
      addListItem(target, "", scheduleAutoSave);
    }
  });
});


document.getElementById("btn-add-decision")!.addEventListener("click", () => {
  addDecisionRow("", "", "", scheduleAutoSave, scheduleAutoSave);
});

document.getElementById("btn-today-started")!.addEventListener("click", () => {
  (document.getElementById("date-started") as HTMLInputElement).value = todayString();
  scheduleAutoSave();
});

// Gear menu
btnGear.addEventListener("click", (e) => { e.stopPropagation(); gearDropdown.classList.toggle("open"); });
gearDropdown.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", () => gearDropdown.classList.remove("open"));

btnExportJson.addEventListener("click", () => {
  exportJson(plans);
  gearDropdown.classList.remove("open");
});

btnImportJson.addEventListener("click", () => {
  importFileInput.click();
  gearDropdown.classList.remove("open");
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const imported = await importJson(file);
    if (!confirm(`Import ${imported.length} plan(s)? This will replace all existing plans.`)) return;
    savePlansToStorage(imported);
    loadPlans();
    renderSidebar();
    if (plans.length > 0) {
      const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt);
      loadPlan(sorted[0].id);
    } else {
      clearForm();
      setEditMode(true);
    }
  } catch {
    alert("Invalid JSON file.");
  }
  importFileInput.value = "";
});

// Wrap-up textareas
makeAutoResizing(document.getElementById("actual-time") as HTMLTextAreaElement);
makeAutoResizing(document.getElementById("surprised") as HTMLTextAreaElement);
makeAutoResizing(document.getElementById("differently") as HTMLTextAreaElement);

// Resize all textareas on window resize
window.addEventListener("resize", () => {
  document.querySelectorAll<HTMLTextAreaElement>(".plan-form textarea").forEach(autoResize);
});

// --- Init ---

loadPlans();
renderSidebar();

if (plans.length > 0) {
  const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt);
  loadPlan(sorted[0].id);
} else {
  clearForm();
  setEditMode(true);
}

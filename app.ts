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
  riskItems: string[];
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

// Checklist helpers
function addChecklistItem(containerId: string, text = "", checked = false): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "checklist-item";
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <input type="text" value="${escapeAttr(text)}" placeholder="Enter item...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => div.remove());
  container.appendChild(div);
}

function addListItem(containerId: string, text = ""): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "list-item";
  div.innerHTML = `
    <input type="text" value="${escapeAttr(text)}" placeholder="Enter item...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => div.remove());
  container.appendChild(div);
}

function addFindOutItem(containerId: string, unknown = "", plan = "", checked = false): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "findout-item";
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <input type="text" value="${escapeAttr(unknown)}" placeholder="Unknown...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
    <input type="text" class="findout-plan" value="${escapeAttr(plan)}" placeholder="Plan: read docs / ask someone / spike...">
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => div.remove());
  container.appendChild(div);
}

function addDecisionRow(date = "", decision = "", reasoning = ""): void {
  const tbody = document.getElementById("decision-rows") as HTMLTableSectionElement;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" value="${escapeAttr(date)}" placeholder="MM/DD"></td>
    <td><input type="text" value="${escapeAttr(decision)}" placeholder="Decision"></td>
    <td><input type="text" value="${escapeAttr(reasoning)}" placeholder="Reasoning"></td>
    <td><button type="button" class="btn-remove" title="Remove">&times;</button></td>
  `;
  tr.querySelector(".btn-remove")!.addEventListener("click", () => tr.remove());
  tbody.appendChild(tr);
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
      text: (el.querySelector("input[type='text']") as HTMLInputElement).value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const knowItems: string[] = [];
  document.querySelectorAll("#know-items .list-item").forEach(el => {
    knowItems.push((el.querySelector("input[type='text']") as HTMLInputElement).value);
  });

  const findOutItems: FindOutItem[] = [];
  document.querySelectorAll("#find-out-items .findout-item").forEach(el => {
    findOutItems.push({
      unknown: (el.querySelector("input[type='text']") as HTMLInputElement).value,
      plan: (el.querySelector(".findout-plan") as HTMLInputElement).value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const chunkItems: ChecklistItem[] = [];
  document.querySelectorAll("#chunk-items .checklist-item").forEach(el => {
    chunkItems.push({
      text: (el.querySelector("input[type='text']") as HTMLInputElement).value,
      checked: (el.querySelector("input[type='checkbox']") as HTMLInputElement).checked,
    });
  });

  const riskItems: string[] = [];
  document.querySelectorAll("#risk-items .list-item").forEach(el => {
    riskItems.push((el.querySelector("input[type='text']") as HTMLInputElement).value);
  });

  const decisions: DecisionRow[] = [];
  document.querySelectorAll("#decision-rows tr").forEach(tr => {
    const inputs = tr.querySelectorAll("input");
    decisions.push({
      date: inputs[0].value,
      decision: inputs[1].value,
      reasoning: inputs[2].value,
    });
  });

  const actualTime = (document.getElementById("actual-time") as HTMLInputElement).value;
  const surprised = (document.getElementById("surprised") as HTMLTextAreaElement).value;
  const differently = (document.getElementById("differently") as HTMLTextAreaElement).value;

  return { title, ticket, dateStarted, contextBucket, doneItems, knowItems, findOutItems, chunkItems, riskItems, decisions, actualTime, surprised, differently };
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
  document.getElementById("risk-items")!.innerHTML = "";
  document.getElementById("decision-rows")!.innerHTML = "";

  for (const item of plan.doneItems) addChecklistItem("done-items", item.text, item.checked);
  for (const item of plan.knowItems) addListItem("know-items", item);
  for (const item of plan.findOutItems) addFindOutItem("find-out-items", item.unknown, item.plan, item.checked);
  for (const item of plan.chunkItems) addChecklistItem("chunk-items", item.text, item.checked);
  for (const item of plan.riskItems) addListItem("risk-items", item);
  for (const d of plan.decisions) addDecisionRow(d.date, d.decision, d.reasoning);

  (document.getElementById("actual-time") as HTMLInputElement).value = plan.actualTime;
  (document.getElementById("surprised") as HTMLTextAreaElement).value = plan.surprised;
  (document.getElementById("differently") as HTMLTextAreaElement).value = plan.differently;
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
  document.getElementById("risk-items")!.innerHTML = "";
  document.getElementById("decision-rows")!.innerHTML = "";
  (document.getElementById("actual-time") as HTMLInputElement).value = "";
  (document.getElementById("surprised") as HTMLTextAreaElement).value = "";
  (document.getElementById("differently") as HTMLTextAreaElement).value = "";

  // Add starter items
  addChecklistItem("done-items");
  addListItem("know-items");
  addFindOutItem("find-out-items");
  addChecklistItem("chunk-items");
  addListItem("risk-items");
}

function setEditMode(enabled: boolean): void {
  editMode = enabled;
  if (enabled) {
    formEl.classList.remove("readonly");
    btnEdit.style.display = "none";
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

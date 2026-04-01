"use strict";
const STORAGE_KEY = "taskPlans";
let plans = [];
let activePlanId = null;
let editMode = true;
// DOM refs
const planListEl = document.getElementById("plan-list");
const formEl = document.getElementById("plan-form");
const btnNew = document.getElementById("btn-new");
const btnEdit = document.getElementById("btn-edit");
const btnDelete = document.getElementById("btn-delete");
const sidebarEl = document.getElementById("sidebar");
const btnCollapse = document.getElementById("btn-toggle-sidebar");
const btnExpand = document.getElementById("btn-expand-sidebar");
// Sidebar toggle
btnCollapse.addEventListener("click", () => {
    sidebarEl.classList.add("collapsed");
});
btnExpand.addEventListener("click", () => {
    sidebarEl.classList.remove("collapsed");
});
// Load plans from localStorage
function loadPlans() {
    const raw = localStorage.getItem(STORAGE_KEY);
    plans = raw ? JSON.parse(raw) : [];
}
function savePlans() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
// Sidebar rendering
function renderSidebar() {
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
function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}
// Checklist helpers
function addChecklistItem(containerId, text = "", checked = false) {
    const container = document.getElementById(containerId);
    const div = document.createElement("div");
    div.className = "checklist-item";
    div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <input type="text" value="${escapeAttr(text)}" placeholder="Enter item...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
    div.querySelector(".btn-remove").addEventListener("click", () => div.remove());
    div.querySelector("input[type='text']").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addChecklistItem(containerId);
            const items = container.querySelectorAll(".checklist-item");
            const last = items[items.length - 1];
            last.querySelector("input[type='text']").focus();
        }
    });
    container.appendChild(div);
}
function addListItem(containerId, text = "") {
    const container = document.getElementById(containerId);
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
    <input type="text" value="${escapeAttr(text)}" placeholder="Enter item...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
    div.querySelector(".btn-remove").addEventListener("click", () => div.remove());
    div.querySelector("input[type='text']").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addListItem(containerId);
            const items = container.querySelectorAll(".list-item");
            const last = items[items.length - 1];
            last.querySelector("input[type='text']").focus();
        }
    });
    container.appendChild(div);
}
function addFindOutItem(containerId, unknown = "", plan = "", checked = false) {
    const container = document.getElementById(containerId);
    const div = document.createElement("div");
    div.className = "findout-item";
    div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <input type="text" value="${escapeAttr(unknown)}" placeholder="Unknown...">
    <button type="button" class="btn-remove" title="Remove">&times;</button>
    <input type="text" class="findout-plan" value="${escapeAttr(plan)}" placeholder="Plan: read docs / ask someone / spike...">
  `;
    div.querySelector(".btn-remove").addEventListener("click", () => div.remove());
    const textInputs = div.querySelectorAll("input[type='text']");
    textInputs[textInputs.length - 1].addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addFindOutItem(containerId);
            const items = container.querySelectorAll(".findout-item");
            const last = items[items.length - 1];
            last.querySelector("input[type='text']").focus();
        }
    });
    container.appendChild(div);
}
function addDecisionRow(date = "", decision = "", reasoning = "") {
    const tbody = document.getElementById("decision-rows");
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td><input type="text" value="${escapeAttr(date)}" placeholder="MM/DD"></td>
    <td><input type="text" value="${escapeAttr(decision)}" placeholder="Decision"></td>
    <td><input type="text" value="${escapeAttr(reasoning)}" placeholder="Reasoning"></td>
    <td><button type="button" class="btn-remove" title="Remove">&times;</button></td>
  `;
    tr.querySelector(".btn-remove").addEventListener("click", () => tr.remove());
    const inputs = tr.querySelectorAll("input");
    inputs[inputs.length - 1].addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addDecisionRow();
            const rows = tbody.querySelectorAll("tr");
            const last = rows[rows.length - 1];
            last.querySelector("input").focus();
        }
    });
    tbody.appendChild(tr);
}
function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Gather form data into a TaskPlan
function gatherFormData() {
    const title = document.getElementById("title").value;
    const ticket = document.getElementById("ticket").value;
    const dateStarted = document.getElementById("date-started").value;
    const contextBucket = document.getElementById("context-bucket").value;
    const doneItems = [];
    document.querySelectorAll("#done-items .checklist-item").forEach(el => {
        doneItems.push({
            text: el.querySelector("input[type='text']").value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const knowItems = [];
    document.querySelectorAll("#know-items .list-item").forEach(el => {
        knowItems.push(el.querySelector("input[type='text']").value);
    });
    const findOutItems = [];
    document.querySelectorAll("#find-out-items .findout-item").forEach(el => {
        findOutItems.push({
            unknown: el.querySelector("input[type='text']").value,
            plan: el.querySelector(".findout-plan").value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const chunkItems = [];
    document.querySelectorAll("#chunk-items .checklist-item").forEach(el => {
        chunkItems.push({
            text: el.querySelector("input[type='text']").value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const riskItems = [];
    document.querySelectorAll("#risk-items .list-item").forEach(el => {
        riskItems.push(el.querySelector("input[type='text']").value);
    });
    const decisions = [];
    document.querySelectorAll("#decision-rows tr").forEach(tr => {
        const inputs = tr.querySelectorAll("input");
        decisions.push({
            date: inputs[0].value,
            decision: inputs[1].value,
            reasoning: inputs[2].value,
        });
    });
    const actualTime = document.getElementById("actual-time").value;
    const surprised = document.getElementById("surprised").value;
    const differently = document.getElementById("differently").value;
    return { title, ticket, dateStarted, contextBucket, doneItems, knowItems, findOutItems, chunkItems, riskItems, decisions, actualTime, surprised, differently };
}
// Populate form from a plan
function populateForm(plan) {
    document.getElementById("title").value = plan.title;
    document.getElementById("ticket").value = plan.ticket;
    document.getElementById("date-started").value = plan.dateStarted;
    document.getElementById("context-bucket").value = plan.contextBucket;
    // Clear dynamic sections
    document.getElementById("done-items").innerHTML = "";
    document.getElementById("know-items").innerHTML = "";
    document.getElementById("find-out-items").innerHTML = "";
    document.getElementById("chunk-items").innerHTML = "";
    document.getElementById("risk-items").innerHTML = "";
    document.getElementById("decision-rows").innerHTML = "";
    for (const item of plan.doneItems)
        addChecklistItem("done-items", item.text, item.checked);
    for (const item of plan.knowItems)
        addListItem("know-items", item);
    for (const item of plan.findOutItems)
        addFindOutItem("find-out-items", item.unknown, item.plan, item.checked);
    for (const item of plan.chunkItems)
        addChecklistItem("chunk-items", item.text, item.checked);
    for (const item of plan.riskItems)
        addListItem("risk-items", item);
    for (const d of plan.decisions)
        addDecisionRow(d.date, d.decision, d.reasoning);
    document.getElementById("actual-time").value = plan.actualTime;
    document.getElementById("surprised").value = plan.surprised;
    document.getElementById("differently").value = plan.differently;
}
function clearForm() {
    document.getElementById("title").value = "";
    document.getElementById("ticket").value = "";
    document.getElementById("date-started").value = "";
    document.getElementById("context-bucket").value = "frontend";
    document.getElementById("done-items").innerHTML = "";
    document.getElementById("know-items").innerHTML = "";
    document.getElementById("find-out-items").innerHTML = "";
    document.getElementById("chunk-items").innerHTML = "";
    document.getElementById("risk-items").innerHTML = "";
    document.getElementById("decision-rows").innerHTML = "";
    document.getElementById("actual-time").value = "";
    document.getElementById("surprised").value = "";
    document.getElementById("differently").value = "";
    // Add starter items
    addChecklistItem("done-items");
    addListItem("know-items");
    addFindOutItem("find-out-items");
    addChecklistItem("chunk-items");
    addListItem("risk-items");
}
function setEditMode(enabled) {
    editMode = enabled;
    if (enabled) {
        formEl.classList.remove("readonly");
        btnEdit.style.display = "none";
    }
    else {
        formEl.classList.add("readonly");
        btnEdit.style.display = "";
    }
}
// Auto-save with debounce
let autoSaveTimer = null;
function autoSave() {
    if (!editMode)
        return;
    const data = gatherFormData();
    const now = Date.now();
    if (activePlanId) {
        const idx = plans.findIndex(p => p.id === activePlanId);
        if (idx !== -1) {
            plans[idx] = { ...plans[idx], ...data, updatedAt: now };
        }
    }
    else {
        // First edit on a new plan — create it
        const plan = {
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
function scheduleAutoSave() {
    if (autoSaveTimer !== null)
        clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(autoSave, 500);
}
// Listen for any input/change in the form
formEl.addEventListener("input", scheduleAutoSave);
formEl.addEventListener("change", scheduleAutoSave);
// Create new plan
function newPlan() {
    activePlanId = null;
    clearForm();
    setEditMode(true);
    renderSidebar();
}
// Save current form
function savePlan() {
    const data = gatherFormData();
    const now = Date.now();
    if (activePlanId) {
        const idx = plans.findIndex(p => p.id === activePlanId);
        if (idx !== -1) {
            plans[idx] = { ...plans[idx], ...data, updatedAt: now };
        }
    }
    else {
        const newPlan = {
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
function loadPlan(id) {
    const plan = plans.find(p => p.id === id);
    if (!plan)
        return;
    activePlanId = plan.id;
    populateForm(plan);
    setEditMode(false);
    renderSidebar();
}
// Delete active plan
function deletePlan() {
    if (!activePlanId)
        return;
    if (!confirm("Delete this plan?"))
        return;
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
        const target = btn.dataset.target;
        const container = document.getElementById(target);
        if (container.classList.contains("checklist-group")) {
            addChecklistItem(target);
        }
        else {
            addListItem(target);
        }
    });
});
document.querySelectorAll(".btn-add-findout").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        addFindOutItem(target);
    });
});
document.getElementById("btn-add-decision").addEventListener("click", () => {
    addDecisionRow();
});
// Init
loadPlans();
renderSidebar();
if (plans.length > 0) {
    const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt);
    loadPlan(sorted[0].id);
}
else {
    clearForm();
    setEditMode(true);
}

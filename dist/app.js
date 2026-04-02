import { loadPlansFromStorage, savePlansToStorage, generateId, exportJson, importJson } from "./storage.js";
import { autoResize, makeAutoResizing, escapeHtml, todayString, addChecklistItem, addListItem, addFindOutItem, addDecisionRow, addImageToGallery, resizeImage } from "./ui.js";
let plans = [];
let activePlanId = null;
let editMode = true;
// DOM refs
const planListEl = document.getElementById("plan-list");
const formEl = document.getElementById("plan-form");
const btnNew = document.getElementById("btn-new");
const btnEdit = document.getElementById("btn-edit");
const btnDelete = document.getElementById("btn-delete");
const btnExport = document.getElementById("btn-export");
const sidebarEl = document.getElementById("sidebar");
const btnCollapse = document.getElementById("btn-toggle-sidebar");
const btnExpand = document.getElementById("btn-expand-sidebar");
const imageDropZone = document.getElementById("image-drop");
const imageInput = document.getElementById("image-input");
const imageGallery = document.getElementById("image-gallery");
const btnGear = document.getElementById("btn-gear");
const gearDropdown = document.getElementById("gear-dropdown");
const btnExportJson = document.getElementById("btn-export-json");
const btnImportJson = document.getElementById("btn-import-json");
const importFileInput = document.getElementById("import-file");
// --- Helpers ---
function loadPlans() {
    plans = loadPlansFromStorage();
}
function savePlans() {
    savePlansToStorage(plans);
}
function scheduleAutoSave() {
    if (autoSaveTimer !== null)
        clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(autoSave, 500);
}
// --- Sidebar ---
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
        li.addEventListener("click", () => loadPlan(plan.id));
        planListEl.appendChild(li);
    }
}
btnCollapse.addEventListener("click", () => sidebarEl.classList.add("collapsed"));
btnExpand.addEventListener("click", () => sidebarEl.classList.remove("collapsed"));
// --- Images ---
function getImages() {
    const imgs = [];
    imageGallery.querySelectorAll(".image-item img").forEach(img => {
        imgs.push(img.src);
    });
    return imgs;
}
function renderImages(images) {
    imageGallery.innerHTML = "";
    for (const src of images)
        addImageToGallery(imageGallery, src, scheduleAutoSave);
}
async function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        if (!files[i].type.startsWith("image/"))
            continue;
        const dataUrl = await resizeImage(files[i], 1600);
        addImageToGallery(imageGallery, dataUrl, scheduleAutoSave);
    }
    scheduleAutoSave();
}
imageDropZone.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
    if (imageInput.files)
        handleFiles(imageInput.files);
    imageInput.value = "";
});
imageDropZone.addEventListener("dragover", (e) => { e.preventDefault(); imageDropZone.classList.add("dragover"); });
imageDropZone.addEventListener("dragleave", () => imageDropZone.classList.remove("dragover"));
imageDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    imageDropZone.classList.remove("dragover");
    if (e.dataTransfer?.files)
        handleFiles(e.dataTransfer.files);
});
// --- Form data ---
function gatherFormData() {
    const title = document.getElementById("title").value;
    const ticket = document.getElementById("ticket").value;
    const dateStarted = document.getElementById("date-started").value;
    const contextBucket = document.getElementById("context-bucket").value;
    const doneItems = [];
    document.querySelectorAll("#done-items .checklist-item").forEach(el => {
        doneItems.push({
            text: el.querySelector("textarea").value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const knowItems = [];
    document.querySelectorAll("#know-items .list-item").forEach(el => {
        knowItems.push(el.querySelector("textarea").value);
    });
    const findOutItems = [];
    document.querySelectorAll("#find-out-items .findout-item").forEach(el => {
        const textareas = el.querySelectorAll("textarea");
        findOutItems.push({
            unknown: textareas[0].value,
            plan: textareas[1].value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const chunkItems = [];
    document.querySelectorAll("#chunk-items .checklist-item").forEach(el => {
        chunkItems.push({
            text: el.querySelector("textarea").value,
            checked: el.querySelector("input[type='checkbox']").checked,
        });
    });
    const noteItems = [];
    document.querySelectorAll("#note-items .list-item").forEach(el => {
        noteItems.push(el.querySelector("textarea").value);
    });
    const riskItems = [];
    document.querySelectorAll("#risk-items .list-item").forEach(el => {
        riskItems.push(el.querySelector("textarea").value);
    });
    const decisions = [];
    document.querySelectorAll("#decision-rows tr").forEach(tr => {
        const textareas = tr.querySelectorAll("textarea");
        decisions.push({
            date: textareas[0].value,
            decision: textareas[1].value,
            reasoning: textareas[2].value,
        });
    });
    const actualTime = document.getElementById("actual-time").value;
    const surprised = document.getElementById("surprised").value;
    const differently = document.getElementById("differently").value;
    const images = getImages();
    return { title, ticket, dateStarted, contextBucket, doneItems, knowItems, findOutItems, chunkItems, noteItems, riskItems, images, decisions, actualTime, surprised, differently };
}
function populateForm(plan) {
    document.getElementById("title").value = plan.title;
    document.getElementById("ticket").value = plan.ticket;
    document.getElementById("date-started").value = plan.dateStarted;
    document.getElementById("context-bucket").value = plan.contextBucket;
    document.getElementById("done-items").innerHTML = "";
    document.getElementById("know-items").innerHTML = "";
    document.getElementById("find-out-items").innerHTML = "";
    document.getElementById("chunk-items").innerHTML = "";
    document.getElementById("note-items").innerHTML = "";
    document.getElementById("risk-items").innerHTML = "";
    document.getElementById("decision-rows").innerHTML = "";
    for (const item of plan.doneItems)
        addChecklistItem("done-items", item.text, item.checked, scheduleAutoSave);
    for (const item of plan.knowItems)
        addListItem("know-items", item, scheduleAutoSave);
    for (const item of plan.findOutItems)
        addFindOutItem("find-out-items", item.unknown, item.plan, item.checked, scheduleAutoSave);
    for (const item of plan.chunkItems)
        addChecklistItem("chunk-items", item.text, item.checked, scheduleAutoSave);
    for (const item of (plan.noteItems || []))
        addListItem("note-items", item, scheduleAutoSave);
    for (const item of plan.riskItems)
        addListItem("risk-items", item, scheduleAutoSave);
    renderImages(plan.images || []);
    for (const d of plan.decisions)
        addDecisionRow(d.date, d.decision, d.reasoning, scheduleAutoSave, scheduleAutoSave);
    const actualTimeTA = document.getElementById("actual-time");
    const surprisedTA = document.getElementById("surprised");
    const differentlyTA = document.getElementById("differently");
    actualTimeTA.value = plan.actualTime;
    surprisedTA.value = plan.surprised;
    differentlyTA.value = plan.differently;
    requestAnimationFrame(() => { autoResize(actualTimeTA); autoResize(surprisedTA); autoResize(differentlyTA); });
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
    document.getElementById("note-items").innerHTML = "";
    document.getElementById("risk-items").innerHTML = "";
    document.getElementById("decision-rows").innerHTML = "";
    imageGallery.innerHTML = "";
    document.getElementById("actual-time").value = "";
    document.getElementById("surprised").value = "";
    document.getElementById("differently").value = "";
    addChecklistItem("done-items", "", false, scheduleAutoSave);
    addListItem("know-items", "", scheduleAutoSave);
    addFindOutItem("find-out-items", "", "", false, scheduleAutoSave);
    addChecklistItem("chunk-items", "", false, scheduleAutoSave);
    addListItem("note-items", "", scheduleAutoSave);
    addListItem("risk-items", "", scheduleAutoSave);
}
// --- Edit mode ---
function renderMarkdown() {
    formEl.querySelectorAll("textarea").forEach(ta => {
        if (!ta.value.trim())
            return;
        const overlay = document.createElement("div");
        overlay.className = "md-render";
        overlay.innerHTML = marked.parse(ta.value);
        ta.style.display = "none";
        ta.insertAdjacentElement("afterend", overlay);
    });
}
function clearMarkdown() {
    formEl.querySelectorAll(".md-render").forEach(el => {
        const ta = el.previousElementSibling;
        if (ta)
            ta.style.display = "";
        el.remove();
    });
}
function setEditMode(enabled) {
    editMode = enabled;
    if (enabled) {
        clearMarkdown();
        formEl.classList.remove("readonly");
        btnEdit.style.display = "none";
        requestAnimationFrame(() => {
            document.querySelectorAll(".plan-form textarea").forEach(autoResize);
        });
    }
    else {
        formEl.classList.add("readonly");
        btnEdit.style.display = "";
        renderMarkdown();
    }
}
// --- Auto-save ---
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
        const plan = { id: generateId(), ...data, createdAt: now, updatedAt: now };
        plans.push(plan);
        activePlanId = plan.id;
    }
    savePlans();
    renderSidebar();
}
formEl.addEventListener("input", scheduleAutoSave);
formEl.addEventListener("change", scheduleAutoSave);
// --- Plan operations ---
function newPlan() {
    activePlanId = null;
    clearForm();
    setEditMode(true);
    renderSidebar();
}
function loadPlan(id) {
    const plan = plans.find(p => p.id === id);
    if (!plan)
        return;
    activePlanId = plan.id;
    populateForm(plan);
    setEditMode(false);
    renderSidebar();
}
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
// --- Event wiring ---
btnNew.addEventListener("click", newPlan);
btnEdit.addEventListener("click", () => setEditMode(true));
btnDelete.addEventListener("click", deletePlan);
btnExport.addEventListener("click", () => { gearDropdown.classList.remove("open"); window.print(); });
document.querySelectorAll(".btn-add").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const container = document.getElementById(target);
        if (container.classList.contains("checklist-group")) {
            addChecklistItem(target, "", false, scheduleAutoSave);
        }
        else {
            addListItem(target, "", scheduleAutoSave);
        }
    });
});
document.querySelectorAll(".btn-add-findout").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        addFindOutItem(target, "", "", false, scheduleAutoSave);
    });
});
document.getElementById("btn-add-decision").addEventListener("click", () => {
    addDecisionRow("", "", "", scheduleAutoSave, scheduleAutoSave);
});
document.getElementById("btn-today-started").addEventListener("click", () => {
    document.getElementById("date-started").value = todayString();
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
    if (!file)
        return;
    try {
        const imported = await importJson(file);
        if (!confirm(`Import ${imported.length} plan(s)? This will replace all existing plans.`))
            return;
        savePlansToStorage(imported);
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
    }
    catch {
        alert("Invalid JSON file.");
    }
    importFileInput.value = "";
});
// Wrap-up textareas
makeAutoResizing(document.getElementById("actual-time"));
makeAutoResizing(document.getElementById("surprised"));
makeAutoResizing(document.getElementById("differently"));
// Resize all textareas on window resize
window.addEventListener("resize", () => {
    document.querySelectorAll(".plan-form textarea").forEach(autoResize);
});
// --- Init ---
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

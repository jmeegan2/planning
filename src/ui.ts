// Auto-resize textarea helpers
export function autoResize(ta: HTMLTextAreaElement): void {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}

export function makeAutoResizing(ta: HTMLTextAreaElement): void {
  ta.rows = 1;
  ta.addEventListener("input", () => autoResize(ta));
  requestAnimationFrame(() => autoResize(ta));
}

export function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export function todayString(): string {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0") + "/" + String(now.getDate()).padStart(2, "0") + "/" + String(now.getFullYear()).slice(2);
}

// Checklist item (checkbox + textarea + remove)
export function addChecklistItem(containerId: string, text = "", checked = false, onRemove: () => void): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "checklist-item" + (checked ? " checked" : "");
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <textarea placeholder="Enter item...">${escapeHtml(text)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); onRemove(); });
  const cb = div.querySelector("input[type='checkbox']") as HTMLInputElement;
  cb.addEventListener("change", () => {
    div.classList.toggle("checked", cb.checked);
  });
  const ta = div.querySelector("textarea") as HTMLTextAreaElement;
  makeAutoResizing(ta);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addChecklistItem(containerId, "", false, onRemove);
      const items = container.querySelectorAll(".checklist-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

// Plain list item (textarea + remove)
export function addListItem(containerId: string, text = "", onRemove: () => void): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "list-item";
  div.innerHTML = `
    <textarea placeholder="Enter item...">${escapeHtml(text)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); onRemove(); });
  const ta = div.querySelector("textarea") as HTMLTextAreaElement;
  makeAutoResizing(ta);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addListItem(containerId, "", onRemove);
      const items = container.querySelectorAll(".list-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

// Find-out item (checkbox + unknown + plan + remove)
export function addFindOutItem(containerId: string, unknown = "", plan = "", checked = false, onRemove: () => void): void {
  const container = document.getElementById(containerId)!;
  const div = document.createElement("div");
  div.className = "findout-item" + (checked ? " checked" : "");
  div.innerHTML = `
    <input type="checkbox" ${checked ? "checked" : ""}>
    <textarea placeholder="Unknown...">${escapeHtml(unknown)}</textarea>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
    <textarea class="findout-plan" placeholder="Plan: read docs / ask someone / spike...">${escapeHtml(plan)}</textarea>
  `;
  div.querySelector(".btn-remove")!.addEventListener("click", () => { div.remove(); onRemove(); });
  const cb = div.querySelector("input[type='checkbox']") as HTMLInputElement;
  cb.addEventListener("change", () => {
    div.classList.toggle("checked", cb.checked);
  });
  div.querySelectorAll("textarea").forEach(ta => makeAutoResizing(ta));
  const textareas = div.querySelectorAll("textarea");
  textareas[textareas.length - 1].addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addFindOutItem(containerId, "", "", false, onRemove);
      const items = container.querySelectorAll(".findout-item");
      const last = items[items.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  container.appendChild(div);
}

// Decision log row
export function addDecisionRow(date = "", decision = "", reasoning = "", onRemove: () => void, onSave: () => void): void {
  const tbody = document.getElementById("decision-rows") as HTMLTableSectionElement;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="date-cell"><textarea class="decision-date" placeholder="MM/DD/YY">${escapeHtml(date)}</textarea><button type="button" class="btn-today" title="Today">today</button></td>
    <td><textarea class="decision-text" placeholder="Decision">${escapeHtml(decision)}</textarea></td>
    <td><textarea class="decision-text" placeholder="Reasoning">${escapeHtml(reasoning)}</textarea></td>
    <td><button type="button" class="btn-remove" title="Remove">&times;</button></td>
  `;
  tr.querySelector(".btn-remove")!.addEventListener("click", () => { tr.remove(); onRemove(); });
  const dateTA = tr.querySelector(".decision-date") as HTMLTextAreaElement;
  tr.querySelector(".btn-today")!.addEventListener("click", () => {
    dateTA.value = todayString();
    autoResize(dateTA);
    onSave();
  });
  tr.querySelectorAll("textarea").forEach(ta => makeAutoResizing(ta));
  const textareas = tr.querySelectorAll("textarea");
  textareas[textareas.length - 1].addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addDecisionRow("", "", "", onRemove, onSave);
      const rows = tbody.querySelectorAll("tr");
      const last = rows[rows.length - 1];
      (last.querySelector("textarea") as HTMLTextAreaElement).focus();
    }
  });
  tbody.appendChild(tr);
}

// Image handling
export function resizeImage(file: File, maxWidth: number): Promise<string> {
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

export function addImageToGallery(gallery: HTMLDivElement, dataUrl: string, onRemove: () => void): void {
  const wrapper = document.createElement("div");
  wrapper.className = "image-item";
  wrapper.innerHTML = `
    <img src="${dataUrl}">
    <button type="button" class="btn-remove-img" title="Remove">&times;</button>
  `;
  wrapper.querySelector(".btn-remove-img")!.addEventListener("click", () => {
    wrapper.remove();
    onRemove();
  });
  gallery.appendChild(wrapper);
}

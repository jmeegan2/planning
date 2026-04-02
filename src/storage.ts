import { TaskPlan } from "./types.js";

const STORAGE_KEY = "taskPlans";

export function loadPlansFromStorage(): TaskPlan[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function savePlansToStorage(plans: TaskPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function exportJson(plans: TaskPlan[]): void {
  const data = JSON.stringify(plans);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "task-plans-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importJson(file: File): Promise<TaskPlan[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target!.result as string);
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        resolve(imported);
      } catch {
        reject(new Error("Invalid JSON file."));
      }
    };
    reader.readAsText(file);
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

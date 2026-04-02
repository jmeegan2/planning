const STORAGE_KEY = "taskPlans";
export function loadPlansFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}
export function savePlansToStorage(plans) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}
export function exportJson(plans) {
    const data = JSON.stringify(plans);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task-plans-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
}
export function importJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported))
                    throw new Error("Invalid format");
                resolve(imported);
            }
            catch {
                reject(new Error("Invalid JSON file."));
            }
        };
        reader.readAsText(file);
    });
}
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

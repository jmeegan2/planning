const BACKUP_TOKEN_KEY = "gistBackupToken";
const BACKUP_GIST_ID_KEY = "gistBackupId";
const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "taskPlans";

let lastBackupData = "";
let backupTimer: number | null = null;

function getToken(): string | null {
  return localStorage.getItem(BACKUP_TOKEN_KEY);
}

function getGistId(): string | null {
  return localStorage.getItem(BACKUP_GIST_ID_KEY);
}

async function createGist(token: string, data: string): Promise<string> {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: "Task Planner Backup",
      public: false,
      files: {
        "task-plans.json": { content: data }
      }
    })
  });
  if (!res.ok) throw new Error(`Gist create failed: ${res.status}`);
  const json = await res.json();
  return json.id;
}

async function updateGist(token: string, gistId: string, data: string): Promise<void> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: {
        "task-plans.json": { content: data }
      }
    })
  });
  if (!res.ok) {
    // Gist might have been deleted — clear ID and retry
    if (res.status === 404) {
      localStorage.removeItem(BACKUP_GIST_ID_KEY);
    }
    throw new Error(`Gist update failed: ${res.status}`);
  }
}

async function backupNow(): Promise<void> {
  const token = getToken();
  if (!token) return;

  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  if (data === lastBackupData) {
    updateStatus("No changes");
    return;
  }

  updateStatus("Backing up...", true);
  try {
    let gistId = getGistId();
    if (gistId) {
      await updateGist(token, gistId, data);
    } else {
      gistId = await createGist(token, data);
      localStorage.setItem(BACKUP_GIST_ID_KEY, gistId);
    }
    lastBackupData = data;
    updateStatus("Backed up");
  } catch (e) {
    console.error("Backup failed:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    updateStatus(`Failed: ${msg}`);
  }
}

function updateStatus(msg: string, persist = false): void {
  const el = document.getElementById("backup-status");
  if (el) {
    el.textContent = msg;
    el.style.color = msg.startsWith("Failed") ? "#b04040" : msg === "Backing up..." ? "#6b7a8d" : "#48a86b";
    if (!persist) setTimeout(() => { el.textContent = ""; }, 4000);
  }
}

function startBackupTimer(): void {
  if (backupTimer !== null) clearInterval(backupTimer);
  if (!getToken()) return;
  backupTimer = window.setInterval(backupNow, BACKUP_INTERVAL_MS);
  // Also backup immediately on start
  backupNow();
}

// DOM setup
const backupTokenInput = document.getElementById("backup-token") as HTMLInputElement;
const btnBackupNow = document.getElementById("btn-backup-now") as HTMLButtonElement;

// Load existing token
const existingToken = getToken();
if (existingToken) {
  backupTokenInput.value = existingToken;
  startBackupTimer();
}

backupTokenInput.addEventListener("input", () => {
  const token = backupTokenInput.value.trim();
  if (token) {
    localStorage.setItem(BACKUP_TOKEN_KEY, token);
    startBackupTimer();
  } else {
    localStorage.removeItem(BACKUP_TOKEN_KEY);
    if (backupTimer !== null) clearInterval(backupTimer);
  }
});

btnBackupNow.addEventListener("click", () => {
  backupNow();
});

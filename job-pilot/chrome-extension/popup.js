const STORAGE_KEYS = {
  token: "token",
  legacyToken: "jwtToken",
  latestJob: "latestJob",
  legacyLatestJob: "latestDetectedJob",
  apiUrl: "apiUrl",
  legacyApiUrl: "apiBaseUrl",
  lastSavedUrl: "lastSavedJobUrl",
};

const DEFAULT_API_URL = "http://localhost:3000";

const tokenInput = document.getElementById("tokenInput");
const apiBaseUrlInput = document.getElementById("apiBaseUrlInput");
const titleInput = document.getElementById("titleInput");
const companyInput = document.getElementById("companyInput");
const urlInput = document.getElementById("urlInput");
const urlPreview = document.getElementById("urlPreview");
const saveSettingsButton = document.getElementById("saveSettings");
const confirmButton = document.getElementById("confirmButton");
const discardButton = document.getElementById("discardButton");
const statusText = document.getElementById("status");

let isSaving = false;

function logInfo(message, meta = {}) {
  console.info(`[JobPilot][Popup] ${message}`, meta);
}

function setStatus(message, type = "") {
  statusText.textContent = message || "";
  statusText.className = type;
}

function setButtonsEnabled(enabled) {
  confirmButton.disabled = !enabled || isSaving;
  discardButton.disabled = !enabled || isSaving;
}

function formatUrlPreview(url) {
  if (!url) {
    return "No job detected yet.";
  }

  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

function normalizeUrl(url) {
  try {
    return new URL(url).toString();
  } catch {
    return "";
  }
}

function currentJobFromInputs() {
  return {
    title: titleInput.value.trim(),
    company: companyInput.value.trim(),
    url: urlInput.value.trim(),
  };
}

function renderJob(job) {
  titleInput.value = job?.title || "";
  companyInput.value = job?.company || "";
  urlInput.value = job?.url || "";
  urlPreview.textContent = formatUrlPreview(job?.url || "");
  setButtonsEnabled(Boolean(job?.title && job?.company && job?.url));
}

async function loadState() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.legacyToken,
    STORAGE_KEYS.apiUrl,
    STORAGE_KEYS.legacyApiUrl,
    STORAGE_KEYS.latestJob,
    STORAGE_KEYS.legacyLatestJob,
  ]);

  const token = stored[STORAGE_KEYS.token] || stored[STORAGE_KEYS.legacyToken] || "";
  const apiUrl =
    stored[STORAGE_KEYS.apiUrl] || stored[STORAGE_KEYS.legacyApiUrl] || DEFAULT_API_URL;
  const latestJob =
    stored[STORAGE_KEYS.latestJob] || stored[STORAGE_KEYS.legacyLatestJob] || null;

  tokenInput.value = token;
  apiBaseUrlInput.value = apiUrl;
  renderJob(latestJob);
  console.log("Popup loaded job:", latestJob);

  logInfo("Popup loaded", {
    hasToken: Boolean(token),
    apiUrl,
    hasLatestJob: Boolean(latestJob),
  });
}

async function persistSettings() {
  const token = tokenInput.value.trim();
  const apiUrl = apiBaseUrlInput.value.trim() || DEFAULT_API_URL;

  await chrome.storage.local.set({
    [STORAGE_KEYS.token]: token,
    [STORAGE_KEYS.legacyToken]: token,
    [STORAGE_KEYS.apiUrl]: apiUrl,
    [STORAGE_KEYS.legacyApiUrl]: apiUrl,
  });

  logInfo("Settings saved", {
    hasToken: Boolean(token),
    apiUrl,
  });
}

async function clearLatestJob() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.latestJob,
    STORAGE_KEYS.legacyLatestJob,
  ]);
}

async function saveDetectedJob() {
  if (isSaving) {
    setStatus("Save already in progress.", "error");
    logInfo("Duplicate save ignored");
    return;
  }

  isSaving = true;
  setButtonsEnabled(Boolean(titleInput.value && companyInput.value && urlInput.value));

  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.token,
      STORAGE_KEYS.legacyToken,
      STORAGE_KEYS.apiUrl,
      STORAGE_KEYS.legacyApiUrl,
      STORAGE_KEYS.latestJob,
      STORAGE_KEYS.legacyLatestJob,
      STORAGE_KEYS.lastSavedUrl,
    ]);

    const token = stored[STORAGE_KEYS.token] || stored[STORAGE_KEYS.legacyToken] || "";
    const apiUrl =
      stored[STORAGE_KEYS.apiUrl] || stored[STORAGE_KEYS.legacyApiUrl] || DEFAULT_API_URL;
    const latestJob =
      stored[STORAGE_KEYS.latestJob] || stored[STORAGE_KEYS.legacyLatestJob] || null;
    const job = {
      title: currentJobFromInputs().title || latestJob?.title || "",
      company: currentJobFromInputs().company || latestJob?.company || "",
      url: normalizeUrl(currentJobFromInputs().url || latestJob?.url || ""),
    };

    if (!token) {
      setStatus("Missing token.", "error");
      logInfo("Save blocked: no token");
      return;
    }

    if (!apiUrl) {
      setStatus("Missing API URL.", "error");
      logInfo("Save blocked: no API URL");
      return;
    }

    if (!job.title || !job.company || !job.url) {
      setStatus("No job detected.", "error");
      logInfo("Save blocked: no job", { job });
      return;
    }

    if (stored[STORAGE_KEYS.lastSavedUrl] === job.url) {
      setStatus("Job already saved.", "error");
      logInfo("Duplicate save ignored", { url: job.url, source: "local" });
      return;
    }

    setStatus("Saving job...");
    logInfo("Sending save request", {
      apiUrl,
      title: job.title,
      company: job.company,
      url: job.url,
    });

    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: job.title,
        company: job.company,
        jobLink: job.url,
      }),
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    logInfo("Save response received", {
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    if (response.ok) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.lastSavedUrl]: job.url,
      });
      await clearLatestJob();
      renderJob(null);
      setStatus("Saved", "success");
      return;
    }

    if (response.status === 409) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.lastSavedUrl]: job.url,
      });
      setStatus("Job already saved.", "error");
      logInfo("Duplicate save ignored", { url: job.url, source: "api" });
      return;
    }

    if (response.status === 401) {
      setStatus("Invalid token.", "error");
      return;
    }

    setStatus(responseBody?.error || "Failed", "error");
  } catch (error) {
    setStatus("Failed", "error");
    logInfo("Save request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isSaving = false;
    setButtonsEnabled(Boolean(titleInput.value && companyInput.value && urlInput.value));
  }
}

urlInput.addEventListener("input", () => {
  urlPreview.textContent = formatUrlPreview(urlInput.value.trim());
});

saveSettingsButton.addEventListener("click", async () => {
  await persistSettings();
  setStatus("Settings saved.", "success");
});

confirmButton.addEventListener("click", () => {
  void saveDetectedJob();
});

discardButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCARD_JOB" }, async () => {
    await clearLatestJob();
    setStatus("Discarded.", "success");
    renderJob(null);
    logInfo("Job discarded by user");
  });
});

void loadState();

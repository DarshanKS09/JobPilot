const STORAGE_KEYS = {
  token: "jwtToken",
  latestJob: "latestDetectedJob",
  apiBaseUrl: "apiBaseUrl",
};

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

function setStatus(message, type = "") {
  statusText.textContent = message || "";
  statusText.className = type;
}

function setButtonsEnabled(enabled) {
  confirmButton.disabled = !enabled;
  discardButton.disabled = !enabled;
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
  setButtonsEnabled(Boolean(job));
}

function loadState() {
  chrome.runtime.sendMessage({ type: "GET_LATEST_JOB" }, (response) => {
    const data = response || {};
    tokenInput.value = data.token || "";
    apiBaseUrlInput.value = data.apiBaseUrl || "http://localhost:3000";
    renderJob(data.job || null);
  });
}

urlInput.addEventListener("input", () => {
  urlPreview.textContent = formatUrlPreview(urlInput.value.trim());
});

saveSettingsButton.addEventListener("click", async () => {
  await chrome.storage.local.set({
    [STORAGE_KEYS.token]: tokenInput.value.trim(),
    [STORAGE_KEYS.apiBaseUrl]: apiBaseUrlInput.value.trim() || "http://localhost:3000",
  });
  setStatus("Settings saved.", "success");
});

confirmButton.addEventListener("click", () => {
  const job = currentJobFromInputs();
  setStatus("Saving job...");

  chrome.runtime.sendMessage({ type: "SAVE_JOB", data: job }, (response) => {
    if (response?.ok) {
      setStatus(
        response.duplicate ? "Job already existed." : "Job saved successfully.",
        "success",
      );
      renderJob(null);
      return;
    }

    setStatus(response?.error || "Failed to save job.", "error");
  });
});

discardButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCARD_JOB" }, () => {
    setStatus("Discarded.", "success");
    renderJob(null);
  });
});

loadState();

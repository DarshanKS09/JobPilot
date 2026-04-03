const STORAGE_KEYS = {
  token: "jwtToken",
  latestJob: "latestDetectedJob",
  apiBaseUrl: "apiBaseUrl",
};

const tokenInput = document.getElementById("tokenInput");
const apiBaseUrlInput = document.getElementById("apiBaseUrlInput");
const saveSettingsButton = document.getElementById("saveSettings");
const confirmButton = document.getElementById("confirmButton");
const discardButton = document.getElementById("discardButton");
const jobCard = document.getElementById("jobCard");
const statusText = document.getElementById("status");

function setStatus(message) {
  statusText.textContent = message || "";
}

function setButtonsEnabled(enabled) {
  confirmButton.disabled = !enabled;
  discardButton.disabled = !enabled;
}

function createJobLine(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return element;
}

function renderJob(job) {
  jobCard.replaceChildren();

  if (!job) {
    jobCard.appendChild(createJobLine("job-title", "No job detected yet"));
    jobCard.appendChild(
      createJobLine(
        "job-company",
        "Visit a submission confirmation page to detect one.",
      ),
    );
    jobCard.appendChild(createJobLine("job-url", ""));
    setButtonsEnabled(false);
    return;
  }

  jobCard.appendChild(createJobLine("job-title", job.title || "Untitled role"));
  jobCard.appendChild(
    createJobLine("job-company", job.company || "Unknown company"),
  );
  jobCard.appendChild(createJobLine("job-url", job.url || ""));
  setButtonsEnabled(true);
}

function loadState() {
  chrome.runtime.sendMessage({ type: "GET_LATEST_JOB" }, (response) => {
    const data = response || {};
    tokenInput.value = data.token || "";
    apiBaseUrlInput.value = data.apiBaseUrl || "http://localhost:3000";
    renderJob(data.job || null);
  });
}

saveSettingsButton.addEventListener("click", async () => {
  await chrome.storage.local.set({
    [STORAGE_KEYS.token]: tokenInput.value.trim(),
    [STORAGE_KEYS.apiBaseUrl]: apiBaseUrlInput.value.trim() || "http://localhost:3000",
  });
  setStatus("Settings saved.");
});

confirmButton.addEventListener("click", () => {
  setStatus("Saving job...");
  chrome.runtime.sendMessage({ type: "SAVE_JOB" }, (response) => {
    if (response?.ok) {
      setStatus(response.duplicate ? "Job already existed." : "Job saved.");
      renderJob(null);
      return;
    }

    setStatus(response?.error || "Save failed.");
  });
});

discardButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCARD_JOB" }, () => {
    setStatus("Discarded.");
    renderJob(null);
  });
});

loadState();

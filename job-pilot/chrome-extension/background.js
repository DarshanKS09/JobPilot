const STORAGE_KEYS = {
  token: "jwtToken",
  latestJob: "latestDetectedJob",
  apiBaseUrl: "apiBaseUrl",
  lastSavedUrl: "lastSavedJobUrl",
  lastDetectedFingerprint: "lastDetectedFingerprint",
};

const DEFAULT_API_BASE_URL = "http://localhost:3000";

function normalizeUrl(url) {
  try {
    return new URL(url).toString();
  } catch {
    return "";
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" }).catch(() => {});
  chrome.action.setTitle({ title: "JobPilot" }).catch(() => {});
}

function setPendingBadge() {
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }).catch(() => {});
  chrome.action.setBadgeText({ text: "NEW" }).catch(() => {});
  chrome.action
    .setTitle({ title: "JobPilot: new job detected" })
    .catch(() => {});
}

async function storeDetectedJob(job) {
  const nextJob = {
    ...job,
    url: normalizeUrl(job.url),
    detectedAt: new Date().toISOString(),
  };
  const fingerprint = [nextJob.url, nextJob.title, nextJob.company]
    .join("|")
    .toLowerCase();

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.latestJob,
    STORAGE_KEYS.lastDetectedFingerprint,
    STORAGE_KEYS.lastSavedUrl,
  ]);

  if (!nextJob.url) {
    return;
  }

  if (
    stored[STORAGE_KEYS.lastDetectedFingerprint] === fingerprint ||
    stored[STORAGE_KEYS.lastSavedUrl] === nextJob.url
  ) {
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.latestJob]: nextJob,
    [STORAGE_KEYS.lastDetectedFingerprint]: fingerprint,
  });

  setPendingBadge();
}

async function saveJobToApi() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.latestJob,
    STORAGE_KEYS.apiBaseUrl,
  ]);

  const token = stored[STORAGE_KEYS.token];
  const job = stored[STORAGE_KEYS.latestJob];
  const apiBaseUrl = (stored[STORAGE_KEYS.apiBaseUrl] || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

  if (!token || !job?.url || !job?.company || !job?.title) {
    return { ok: false, error: "Missing token or detected job." };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        company: job.company,
        title: job.title,
        url: job.url,
        status: "applied",
      }),
    });

    if (!response.ok && response.status !== 409) {
      return { ok: false, error: "Save failed." };
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.lastSavedUrl]: job.url,
    });
    await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
    clearBadge();

    return { ok: true, duplicate: response.status === 409 };
  } catch (error) {
    void error;
    return { ok: false, error: "Save failed." };
  }
}

async function discardJob() {
  await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
  clearBadge();
  return { ok: true };
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.apiBaseUrl);

  if (!stored[STORAGE_KEYS.apiBaseUrl]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.apiBaseUrl]: DEFAULT_API_BASE_URL,
    });
  }

  clearBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "JOB_DETECTED") {
    storeDetectedJob(message.data).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "SAVE_JOB") {
    saveJobToApi()
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, error: "Save failed." }));
    return true;
  }

  if (message?.type === "DISCARD_JOB") {
    discardJob()
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "GET_LATEST_JOB") {
    chrome.storage.local
      .get([
        STORAGE_KEYS.latestJob,
        STORAGE_KEYS.token,
        STORAGE_KEYS.apiBaseUrl,
      ])
      .then((data) =>
        sendResponse({
          ok: true,
          job: data[STORAGE_KEYS.latestJob] || null,
          token: data[STORAGE_KEYS.token] || "",
          apiBaseUrl: data[STORAGE_KEYS.apiBaseUrl] || DEFAULT_API_BASE_URL,
        }),
      )
      .catch(() => sendResponse({ ok: false, job: null }));
    return true;
  }

  return false;
});

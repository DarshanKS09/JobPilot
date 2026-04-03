const STORAGE_KEYS = {
  token: "token",
  legacyToken: "jwtToken",
  latestJob: "latestJob",
  legacyLatestJob: "latestDetectedJob",
  apiUrl: "apiUrl",
  legacyApiUrl: "apiBaseUrl",
};

const DEFAULT_API_URL = "http://localhost:3000";

function logInfo(message, meta = {}) {
  console.info(`[JobPilot] ${message}`, meta);
}

function normalizeUrl(url) {
  try {
    return new URL(url).toString();
  } catch {
    return "";
  }
}

function normalizeJob(job) {
  return {
    title: (job?.title || "").trim(),
    company: (job?.company || "").trim(),
    url: normalizeUrl(job?.url || ""),
    detectedAt: new Date().toISOString(),
  };
}

async function storeDetectedJob(job) {
  const latestJob = normalizeJob(job);

  if (!latestJob.title || !latestJob.company || !latestJob.url) {
    logInfo("Job detection ignored because data is incomplete", latestJob);
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.latestJob]: latestJob,
    [STORAGE_KEYS.legacyLatestJob]: latestJob,
  });

  console.log("Job stored successfully");
  logInfo("Job stored in extension", latestJob);
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.legacyToken,
    STORAGE_KEYS.apiUrl,
    STORAGE_KEYS.legacyApiUrl,
  ]);

  const nextState = {};

  if (!stored[STORAGE_KEYS.token] && stored[STORAGE_KEYS.legacyToken]) {
    nextState[STORAGE_KEYS.token] = stored[STORAGE_KEYS.legacyToken];
  }

  if (!stored[STORAGE_KEYS.apiUrl]) {
    nextState[STORAGE_KEYS.apiUrl] =
      stored[STORAGE_KEYS.legacyApiUrl] || DEFAULT_API_URL;
  }

  if (Object.keys(nextState).length > 0) {
    await chrome.storage.local.set(nextState);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "JOB_DETECTED") {
    console.log("Received job:", message.data);

    storeDetectedJob(message.data)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        logInfo("Failed to store detected job", {
          error: error instanceof Error ? error.message : String(error),
        });
        sendResponse({ ok: false });
      });
    return true;
  }

  if (message?.type === "DISCARD_JOB") {
    chrome.storage.local
      .remove([STORAGE_KEYS.latestJob, STORAGE_KEYS.legacyLatestJob])
      .then(() => {
        logInfo("Stored job discarded");
        sendResponse({ ok: true });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

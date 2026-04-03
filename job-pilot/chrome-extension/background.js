const STORAGE_KEYS = {
  token: "jwtToken",
  latestJob: "latestDetectedJob",
  apiBaseUrl: "apiBaseUrl",
  lastSavedUrl: "lastSavedJobUrl",
  lastDetectedFingerprint: "lastDetectedFingerprint",
};

const DEFAULT_API_BASE_URL = "http://localhost:3000";

function logInfo(message, meta = {}) {
  console.info(`[JobPilot] ${message}`, meta);
}

function logWarn(message, meta = {}) {
  console.warn(`[JobPilot] ${message}`, meta);
}

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

function withApiBaseUrl(apiBaseUrl) {
  return (apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

async function fetchJsonWithRetry(url, options = {}, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);

      if (response.ok) {
        return { ok: true, response, data };
      }

      const errorMessage = data?.error || "Request failed";
      const shouldRetry = response.status >= 500 && attempt < retries;

      if (shouldRetry) {
        continue;
      }

      return { ok: false, response, data, error: errorMessage };
    } catch {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        logWarn("Network request failed", { url, attempt: attempt + 1 });
        return { ok: false, error: "Network request failed" };
      }
    }
  }

  return { ok: false, error: "Request failed" };
}

async function validateToken(token, apiBaseUrl) {
  const request = await fetchJsonWithRetry(`${apiBaseUrl}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (request.ok) {
    return { ok: true, user: request.data?.user || null };
  }

  if (request.response?.status === 401) {
    return { ok: false, error: "Invalid token." };
  }

  return { ok: false, error: "Unable to validate token." };
}

async function checkDuplicateJob(job, token, apiBaseUrl) {
  const encodedJobLink = encodeURIComponent(job.url);
  const request = await fetchJsonWithRetry(
    `${apiBaseUrl}/api/jobs?jobLink=${encodedJobLink}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!request.ok) {
    if (request.response?.status === 401) {
      return { ok: false, error: "Invalid token." };
    }

    return { ok: false, error: "Unable to check duplicate jobs." };
  }

  return {
    ok: true,
    exists: Boolean(request.data?.exists),
  };
}

async function storeDetectedJob(job) {
  const nextJob = {
    title: (job?.title || "").trim(),
    company: (job?.company || "").trim(),
    url: normalizeUrl(job?.url || ""),
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
    logInfo("Duplicate detection prevented", { url: nextJob.url });
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.latestJob]: nextJob,
    [STORAGE_KEYS.lastDetectedFingerprint]: fingerprint,
  });

  logInfo("Detection triggered", {
    title: nextJob.title,
    company: nextJob.company,
    url: nextJob.url,
  });
  setPendingBadge();
}

async function saveJobToApi(jobOverride) {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.token,
    STORAGE_KEYS.latestJob,
    STORAGE_KEYS.apiBaseUrl,
    STORAGE_KEYS.lastSavedUrl,
  ]);

  const token = stored[STORAGE_KEYS.token];
  const storedJob = stored[STORAGE_KEYS.latestJob];
  const apiBaseUrl = withApiBaseUrl(stored[STORAGE_KEYS.apiBaseUrl]);
  const job = {
    title: (jobOverride?.title ?? storedJob?.title ?? "").trim(),
    company: (jobOverride?.company ?? storedJob?.company ?? "").trim(),
    url: normalizeUrl(jobOverride?.url ?? storedJob?.url ?? ""),
  };

  if (!token) {
    return { ok: false, error: "Missing token." };
  }

  if (!job.title || !job.url) {
    return { ok: false, error: "Role and job link are required." };
  }

  if (!job.company) {
    return { ok: false, error: "Company is required." };
  }

  if (stored[STORAGE_KEYS.lastSavedUrl] === job.url) {
    logInfo("Duplicate prevented before save", { url: job.url, source: "local" });
    await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
    clearBadge();
    return { ok: true, duplicate: true };
  }

  const tokenCheck = await validateToken(token, apiBaseUrl);

  if (!tokenCheck.ok) {
    return { ok: false, error: tokenCheck.error };
  }

  const duplicateCheck = await checkDuplicateJob(job, token, apiBaseUrl);

  if (!duplicateCheck.ok) {
    return { ok: false, error: duplicateCheck.error };
  }

  if (duplicateCheck.exists) {
    logInfo("Duplicate prevented before save", { url: job.url, source: "api" });
    await chrome.storage.local.set({
      [STORAGE_KEYS.lastSavedUrl]: job.url,
    });
    await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
    clearBadge();
    return { ok: true, duplicate: true };
  }

  const request = await fetchJsonWithRetry(
    `${apiBaseUrl}/api/jobs`,
    {
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
    },
    1,
  );

  if (!request.ok) {
    if (request.response?.status === 401) {
      return { ok: false, error: "Invalid token." };
    }

    if (request.response?.status === 409) {
      logInfo("Duplicate prevented before save", { url: job.url, source: "post" });
      await chrome.storage.local.set({
        [STORAGE_KEYS.lastSavedUrl]: job.url,
      });
      await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
      clearBadge();
      return { ok: true, duplicate: true };
    }

    return { ok: false, error: "Failed to save job." };
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.lastSavedUrl]: job.url,
  });
  await chrome.storage.local.remove(STORAGE_KEYS.latestJob);
  clearBadge();

  logInfo("Job saved", {
    title: job.title,
    company: job.company,
    url: job.url,
  });

  return { ok: true, duplicate: false };
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
    saveJobToApi(message.data)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, error: "Failed to save job." }));
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

(function () {
  console.log("🚀 JobPilot Content Script Loaded");

  const DETECTION_DEBOUNCE_MS = 5000;
  const FALLBACK_CHECK_INTERVAL_MS = 2000;
  const URL_CHECK_INTERVAL_MS = 1000;
  const MODAL_ID = "jobpilot-detected-application-card";
  const MODAL_DISMISS_MS = 8000;
  const BLOCKED_HOSTNAMES = [
    "mail.google.com",
    "outlook.live.com",
    "outlook.office.com",
    "mail.yahoo.com",
    "mail.proton.me",
    "mail.protonmail.com",
  ];
  const APPLICATION_CONFIRMATION_PATTERNS = [
    /application submitted/,
    /application received/,
    /application sent/,
    /application has been submitted/,
    /your application has been submitted/,
    /we received your application/,
    /thanks for applying/,
    /thank you for applying/,
    /thank you for your application/,
    /you(?:'ve| have) successfully applied/,
    /successfully applied/,
    /application submitted successfully/,
    /applied successfully/,
  ];
  const COMPANY_SELECTORS = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    "[data-company]",
    '[data-testid*="company"]',
    '[class*="company"]',
    '[id*="company"]',
  ];

  let lastUrl = window.location.href;
  let lastDetectedAt = 0;
  let lastDetectedFingerprint = "";
  let hasDetected = false;
  let observerStarted = false;
  let loopsStarted = false;
  let activeModalTimer = null;
  let detectionIntervalId = null;

  console.log("JobPilot content script loaded on:", window.location.href);

  function logInfo(message, meta = {}) {
    console.log(`[JobPilot] ${message}`, meta);
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function canTrigger() {
    return Date.now() - lastDetectedAt > DETECTION_DEBOUNCE_MS;
  }

  function getPageText() {
    return (document.body?.innerText || "").toLowerCase();
  }

  function getSelectorText(selector) {
    const element = document.querySelector(selector);
    const content = element?.getAttribute("content");
    return normalizeText(content || element?.textContent || "");
  }

  function hostnameToName(hostname) {
    return hostname
      .replace(/^www\./i, "")
      .split(".")[0]
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function guessCompany() {
    for (const selector of COMPANY_SELECTORS) {
      const company = getSelectorText(selector);

      if (company && company.length <= 120) {
        return company;
      }
    }

    return hostnameToName(window.location.hostname) || "Unknown Company";
  }

  function buildJob() {
    return {
      title:
        normalizeText(document.querySelector("h1")?.innerText) ||
        normalizeText(document.title),
      company: guessCompany(),
      url: window.location.href,
    };
  }

  function buildFingerprint(job) {
    return [job.url, job.title.toLowerCase(), job.company.toLowerCase()].join("|");
  }

  function isBlockedPage() {
    const hostname = window.location.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return true;
    }

    return (
      hostname.includes("mail.") ||
      hostname.startsWith("mail") ||
      window.location.pathname.toLowerCase().includes("/mail")
    );
  }

  function hasApplicationMatch(text) {
    const normalizedText = normalizeText(text).toLowerCase();
    const titleText = normalizeText(document.title).toLowerCase();
    const headingText = normalizeText(document.querySelector("h1")?.innerText).toLowerCase();
    const combinedText = [titleText, headingText, normalizedText].filter(Boolean).join(" ");

    return APPLICATION_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(combinedText));
  }

  function clearModalTimer() {
    if (activeModalTimer) {
      window.clearTimeout(activeModalTimer);
      activeModalTimer = null;
    }
  }

  function removeJobModal() {
    clearModalTimer();

    const existingModal = document.getElementById(MODAL_ID);
    if (existingModal) {
      existingModal.remove();
    }
  }

  function showJobModal(job) {
    if (!document.body) {
      return;
    }

    const existingModal = document.getElementById(MODAL_ID);
    if (existingModal) {
      logInfo("Detection modal already exists; skipping duplicate");
      return;
    }

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.style.position = "fixed";
    modal.style.right = "20px";
    modal.style.bottom = "20px";
    modal.style.width = "320px";
    modal.style.maxWidth = "calc(100vw - 32px)";
    modal.style.background = "#ffffff";
    modal.style.color = "#111827";
    modal.style.border = "1px solid #d1d5db";
    modal.style.borderRadius = "14px";
    modal.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.18)";
    modal.style.padding = "16px";
    modal.style.zIndex = "2147483647";
    modal.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    modal.style.lineHeight = "1.4";

    const heading = document.createElement("div");
    heading.textContent = "JobPilot Detected Application";
    heading.style.fontSize = "16px";
    heading.style.fontWeight = "700";
    heading.style.marginBottom = "10px";

    const titleLabel = document.createElement("div");
    titleLabel.textContent = "Job Title";
    titleLabel.style.fontSize = "12px";
    titleLabel.style.color = "#6b7280";
    titleLabel.style.marginBottom = "4px";

    const titleValue = document.createElement("div");
    titleValue.textContent = job.title || document.title || "Untitled Job";
    titleValue.style.fontSize = "14px";
    titleValue.style.fontWeight = "600";
    titleValue.style.marginBottom = "10px";
    titleValue.style.wordBreak = "break-word";

    const urlLabel = document.createElement("div");
    urlLabel.textContent = "Current URL";
    urlLabel.style.fontSize = "12px";
    urlLabel.style.color = "#6b7280";
    urlLabel.style.marginBottom = "4px";

    const urlValue = document.createElement("div");
    urlValue.textContent = job.url;
    urlValue.style.fontSize = "13px";
    urlValue.style.color = "#374151";
    urlValue.style.marginBottom = "14px";
    urlValue.style.wordBreak = "break-word";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "10px";

    const statusText = document.createElement("div");
    statusText.style.fontSize = "12px";
    statusText.style.marginTop = "10px";
    statusText.style.minHeight = "16px";
    statusText.style.color = "#6b7280";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save Job";
    saveButton.style.flex = "1";
    saveButton.style.border = "0";
    saveButton.style.borderRadius = "10px";
    saveButton.style.padding = "10px 12px";
    saveButton.style.background = "#111827";
    saveButton.style.color = "#ffffff";
    saveButton.style.fontSize = "13px";
    saveButton.style.fontWeight = "600";
    saveButton.style.cursor = "pointer";

    const ignoreButton = document.createElement("button");
    ignoreButton.type = "button";
    ignoreButton.textContent = "Ignore";
    ignoreButton.style.flex = "1";
    ignoreButton.style.border = "1px solid #d1d5db";
    ignoreButton.style.borderRadius = "10px";
    ignoreButton.style.padding = "10px 12px";
    ignoreButton.style.background = "#ffffff";
    ignoreButton.style.color = "#111827";
    ignoreButton.style.fontSize = "13px";
    ignoreButton.style.fontWeight = "600";
    ignoreButton.style.cursor = "pointer";

    saveButton.addEventListener("click", () => {
      saveButton.disabled = true;
      ignoreButton.disabled = true;
      saveButton.textContent = "Saving...";
      saveButton.style.opacity = "0.7";
      ignoreButton.style.opacity = "0.7";
      statusText.textContent = "Saving job...";

      chrome.runtime.sendMessage({
        type: "SAVE_JOB",
        payload: job,
      }, (response) => {
        if (response?.ok) {
          statusText.textContent = response.duplicate
            ? "Job already saved."
            : "Job saved.";
          statusText.style.color = "#166534";
          saveButton.textContent = response.duplicate ? "Already Saved" : "Saved";
          logInfo("Save completed from detection modal", {
            ...job,
            result: response.duplicate ? "duplicate" : "saved",
          });
          window.setTimeout(() => {
            removeJobModal();
          }, 1000);
          return;
        }

        saveButton.disabled = false;
        ignoreButton.disabled = false;
        saveButton.textContent = "Save Job";
        saveButton.style.opacity = "1";
        ignoreButton.style.opacity = "1";
        statusText.textContent = response?.error || "Failed to save job.";
        statusText.style.color = "#b91c1c";
        logInfo("Save failed from detection modal", {
          ...job,
          error: response?.error || "Unknown save error",
        });
      });

      logInfo("Save requested from detection modal", job);
    });

    ignoreButton.addEventListener("click", () => {
      logInfo("Detection modal ignored", job);
      removeJobModal();
    });

    actions.appendChild(saveButton);
    actions.appendChild(ignoreButton);
    modal.appendChild(heading);
    modal.appendChild(titleLabel);
    modal.appendChild(titleValue);
    modal.appendChild(urlLabel);
    modal.appendChild(urlValue);
    modal.appendChild(actions);
    modal.appendChild(statusText);
    document.body.appendChild(modal);
    logInfo("Detection modal created", job);

    activeModalTimer = window.setTimeout(() => {
      logInfo("Detection modal auto-dismissed", { url: job.url });
      removeJobModal();
    }, MODAL_DISMISS_MS);
  }

  function checkForApplication() {
    if (!document.body || hasDetected) {
      return;
    }

    if (isBlockedPage()) {
      return;
    }

    const text = getPageText();

    if (!hasApplicationMatch(text)) {
      return;
    }

    if (!canTrigger()) {
      return;
    }

    const job = buildJob();

    if (!job.title || !job.url) {
      return;
    }

    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastDetectedFingerprint) {
      hasDetected = true;
      return;
    }

    lastDetectedAt = Date.now();
    lastDetectedFingerprint = fingerprint;
    hasDetected = true;

    console.log("Application detected!");
    showJobModal(job);

    try {
      chrome.runtime.sendMessage({
        type: "JOB_DETECTED",
        data: job,
      });

      logInfo("Message sent", {
        type: "JOB_DETECTED",
        job,
      });
    } catch (error) {
      logInfo("Failed to send message", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function startObserver() {
    if (observerStarted || !document.body) {
      return;
    }

    const observer = new MutationObserver(() => {
      checkForApplication();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    observerStarted = true;
    logInfo("Observer started", { target: "document.body" });
  }

  function startDetectionLoops() {
    if (loopsStarted) {
      return;
    }

    loopsStarted = true;

    detectionIntervalId = window.setInterval(() => {
      if (hasDetected) {
        window.clearInterval(detectionIntervalId);
        detectionIntervalId = null;
        return;
      }

      checkForApplication();
    }, FALLBACK_CHECK_INTERVAL_MS);

    window.setInterval(() => {
      if (window.location.href !== lastUrl) {
        const previousUrl = lastUrl;
        lastUrl = window.location.href;
        hasDetected = false;
        lastDetectedFingerprint = "";
        removeJobModal();

        logInfo("URL changed", {
          previousUrl,
          currentUrl: lastUrl,
        });

        if (!detectionIntervalId) {
          detectionIntervalId = window.setInterval(() => {
            if (hasDetected) {
              window.clearInterval(detectionIntervalId);
              detectionIntervalId = null;
              return;
            }

            checkForApplication();
          }, FALLBACK_CHECK_INTERVAL_MS);
        }

        checkForApplication();
      }
    }, URL_CHECK_INTERVAL_MS);
  }

  function initialize() {
    startObserver();
    startDetectionLoops();
    checkForApplication();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

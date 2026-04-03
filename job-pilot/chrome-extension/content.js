(function () {
  const DETECTION_DEBOUNCE_MS = 5000;
  const FALLBACK_CHECK_INTERVAL_MS = 2000;
  const URL_CHECK_INTERVAL_MS = 1000;
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
  let observerStarted = false;
  let loopsStarted = false;

  console.log("JobPilot content script loaded on:", window.location.href);

  function addIndicator() {
    if (!document.body || document.getElementById("jobpilot-debug-indicator")) {
      return;
    }

    const indicator = document.createElement("div");
    indicator.id = "jobpilot-debug-indicator";
    indicator.innerText = "JobPilot Active";
    indicator.style.position = "fixed";
    indicator.style.bottom = "10px";
    indicator.style.right = "10px";
    indicator.style.background = "black";
    indicator.style.color = "white";
    indicator.style.padding = "5px";
    indicator.style.zIndex = "9999";
    indicator.style.fontSize = "12px";

    document.body.appendChild(indicator);
  }

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

  function guessCompany() {
    for (const selector of COMPANY_SELECTORS) {
      const company = getSelectorText(selector);

      if (company && company.length <= 120) {
        return company;
      }
    }

    return "";
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

  function hasApplicationMatch(text) {
    return (
      text.includes("application") &&
      (text.includes("submitted") ||
        text.includes("sent") ||
        text.includes("received") ||
        text.includes("applied"))
    );
  }

  function checkForApplication() {
    if (!document.body) {
      return;
    }

    addIndicator();

    const text = getPageText();
    console.log("Checking page content...");

    if (!hasApplicationMatch(text)) {
      return;
    }

    logInfo("Keyword matched", {
      submitted: text.includes("submitted"),
      sent: text.includes("sent"),
      received: text.includes("received"),
      applied: text.includes("applied"),
      url: window.location.href,
    });

    if (!canTrigger()) {
      logInfo("Detection skipped due to debounce");
      return;
    }

    const job = buildJob();

    if (!job.title || !job.url) {
      logInfo("Detection skipped because job data is incomplete", job);
      return;
    }

    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastDetectedFingerprint) {
      logInfo("Detection skipped because page was already handled", {
        fingerprint,
      });
      return;
    }

    lastDetectedAt = Date.now();
    lastDetectedFingerprint = fingerprint;

    console.log("Application detected!");

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

    window.setInterval(checkForApplication, FALLBACK_CHECK_INTERVAL_MS);

    window.setInterval(() => {
      if (window.location.href !== lastUrl) {
        const previousUrl = lastUrl;
        lastUrl = window.location.href;
        lastDetectedFingerprint = "";

        logInfo("URL changed", {
          previousUrl,
          currentUrl: lastUrl,
        });

        checkForApplication();
      }
    }, URL_CHECK_INTERVAL_MS);
  }

  function initialize() {
    addIndicator();
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

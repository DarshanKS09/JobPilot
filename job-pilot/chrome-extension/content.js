(function () {
  const DETECTION_DEBOUNCE_MS = 5000;
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
  let lastDetected = 0;
  let lastDetectedFingerprint = "";
  let observerStarted = false;

  function logInfo(message, meta = {}) {
    console.log(`[JobPilot] ${message}`, meta);
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function canTrigger() {
    return Date.now() - lastDetected > DETECTION_DEBOUNCE_MS;
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
      title: normalizeText(document.querySelector("h1")?.innerText) || normalizeText(document.title),
      company: guessCompany(),
      url: window.location.href,
    };
  }

  function buildFingerprint(job) {
    return [job.url, job.title.toLowerCase(), job.company.toLowerCase()].join("|");
  }

  function hasApplicationMatch(text) {
    const hasApplication = text.includes("application");
    const hasOutcomeWord =
      text.includes("submitted") ||
      text.includes("sent") ||
      text.includes("received") ||
      text.includes("complete");

    return hasApplication && hasOutcomeWord;
  }

  function checkForApplication() {
    logInfo("Detection runs", { url: window.location.href });

    if (!document.body) {
      return;
    }

    const text = getPageText();

    if (!hasApplicationMatch(text)) {
      return;
    }

    logInfo("Keyword matched", {
      hasApplication: text.includes("application"),
      submitted: text.includes("submitted"),
      sent: text.includes("sent"),
      received: text.includes("received"),
      complete: text.includes("complete"),
    });

    if (!canTrigger()) {
      logInfo("Detection skipped due to debounce");
      return;
    }

    const job = buildJob();
    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastDetectedFingerprint) {
      logInfo("Detection skipped because page was already handled", {
        fingerprint,
      });
      return;
    }

    lastDetected = Date.now();
    lastDetectedFingerprint = fingerprint;

    logInfo("Application detected!", job);

    try {
      chrome.runtime.sendMessage({
        type: "JOB_DETECTED",
        data: job,
      });

      logInfo("Message sent", { type: "JOB_DETECTED", job });
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

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        startObserver();
        checkForApplication();
      },
      { once: true },
    );
  } else {
    startObserver();
    checkForApplication();
  }

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
})();

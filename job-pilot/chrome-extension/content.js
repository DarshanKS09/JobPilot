(function () {
  const DETECTION_PHRASES = [
    "application submitted",
    "thank you for applying",
    "application received",
  ];
  const COMPANY_SELECTORS = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    "[data-company]",
    '[data-testid*="company"]',
    '[class*="company"]',
    '[id*="company"]',
  ];
  const MAX_TEXT_LENGTH = 15000;
  const DETECTION_DEBOUNCE_MS = 5000;

  let lastUrl = window.location.href;
  let lastFingerprint = "";
  let lastDetectionAt = 0;
  let scanTimer = null;

  function logInfo(message, meta = {}) {
    console.info(`[JobPilot] ${message}`, meta);
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getPageText() {
    const text = document.body?.innerText || document.documentElement?.innerText || "";
    return normalizeText(text).toLowerCase().slice(0, MAX_TEXT_LENGTH);
  }

  function findMatchedKeyword() {
    const text = getPageText();
    return DETECTION_PHRASES.find((phrase) => text.includes(phrase)) || "";
  }

  function hostnameToName(hostname) {
    return hostname
      .replace(/^www\./i, "")
      .split(".")[0]
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getSelectorText(selector) {
    const element = document.querySelector(selector);
    const content = element?.getAttribute("content");
    return normalizeText(content || element?.textContent || "");
  }

  function guessCompany() {
    for (const selector of COMPANY_SELECTORS) {
      const text = getSelectorText(selector);

      if (text && text.length <= 120) {
        return text;
      }
    }

    const fallbackCandidates = [
      document.querySelector("header")?.innerText,
      document.title,
      document.querySelector("h1")?.innerText,
    ]
      .map(normalizeText)
      .filter(Boolean);

    for (const candidate of fallbackCandidates) {
      const parts = candidate
        .split(/[-|:@]/)
        .map(normalizeText)
        .filter(Boolean);

      for (const part of parts) {
        if (part.length >= 2 && part.length <= 80) {
          return part;
        }
      }
    }

    return hostnameToName(window.location.hostname) || "";
  }

  function guessTitle() {
    const h1Text = normalizeText(document.querySelector("h1")?.innerText);
    if (h1Text) {
      return h1Text;
    }

    return normalizeText(document.title) || "Job Application";
  }

  function buildJobData() {
    return {
      title: guessTitle(),
      company: guessCompany(),
      url: window.location.href,
    };
  }

  function buildFingerprint(job) {
    return [job.url, job.title.toLowerCase(), job.company.toLowerCase()].join("|");
  }

  function runDetection() {
    logInfo("Detection started", { url: window.location.href });

    const matchedKeyword = findMatchedKeyword();
    if (!matchedKeyword) {
      return;
    }

    logInfo("Keyword found", { keyword: matchedKeyword });

    const now = Date.now();
    if (now - lastDetectionAt < DETECTION_DEBOUNCE_MS) {
      logInfo("Detection skipped due to debounce", {
        remainingMs: DETECTION_DEBOUNCE_MS - (now - lastDetectionAt),
      });
      return;
    }

    const job = buildJobData();
    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastFingerprint) {
      logInfo("Detection skipped because job is unchanged", { fingerprint });
      return;
    }

    lastFingerprint = fingerprint;
    lastDetectionAt = now;
    logInfo("Job extracted", job);

    try {
      chrome.runtime.sendMessage({
        type: "JOB_DETECTED",
        data: job,
      });
    } catch (error) {
      logInfo("Failed to send detected job", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function scheduleDetection(reason = "unknown") {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => {
      logInfo("Scheduled detection running", { reason });
      runDetection();
    }, 300);
  }

  function handleUrlChange(source = "unknown") {
    if (window.location.href === lastUrl) {
      return;
    }

    const previousUrl = lastUrl;
    lastUrl = window.location.href;
    lastFingerprint = "";
    logInfo("URL change detected", {
      source,
      previousUrl,
      currentUrl: lastUrl,
    });
    scheduleDetection(`url-change:${source}`);
  }

  const observer = new MutationObserver(() => {
    handleUrlChange("mutation");
    scheduleDetection("mutation");
  });

  function patchHistoryMethod(methodName) {
    const original = history[methodName];

    history[methodName] = function () {
      const result = original.apply(this, arguments);
      handleUrlChange(methodName);
      scheduleDetection(`history:${methodName}`);
      return result;
    };
  }

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", () => {
    handleUrlChange("popstate");
    scheduleDetection("popstate");
  });

  window.addEventListener("hashchange", () => {
    handleUrlChange("hashchange");
    scheduleDetection("hashchange");
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    logInfo("MutationObserver is active");
  }

  scheduleDetection("initial-load");
})();

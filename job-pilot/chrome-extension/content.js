(function () {
  const DETECTION_PHRASES = [
    "application submitted",
    "thank you for applying",
    "application received",
  ];
  const COMPANY_SELECTORS = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    '[data-company]',
    '[data-testid*="company"]',
    '[class*="company"]',
    '[id*="company"]',
  ];
  const MAX_TEXT_LENGTH = 15000;

  let lastUrl = window.location.href;
  let lastFingerprint = "";
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

  function pageLooksLikeSubmission() {
    const text = getPageText();
    return DETECTION_PHRASES.some((phrase) => text.includes(phrase));
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
    if (!pageLooksLikeSubmission()) {
      return;
    }

    const job = buildJobData();
    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastFingerprint) {
      return;
    }

    lastFingerprint = fingerprint;
    logInfo("Detection triggered", {
      title: job.title,
      company: job.company,
      url: job.url,
    });

    try {
      chrome.runtime.sendMessage({
        type: "JOB_DETECTED",
        data: job,
      });
    } catch (error) {
      void error;
    }
  }

  function scheduleDetection() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(runDetection, 800);
  }

  function handleUrlChange() {
    if (window.location.href === lastUrl) {
      return;
    }

    lastUrl = window.location.href;
    lastFingerprint = "";
    scheduleDetection();
  }

  const observer = new MutationObserver(() => {
    handleUrlChange();
    scheduleDetection();
  });

  function patchHistoryMethod(methodName) {
    const original = history[methodName];

    history[methodName] = function () {
      const result = original.apply(this, arguments);
      handleUrlChange();
      scheduleDetection();
      return result;
    };
  }

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");
  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("hashchange", handleUrlChange);

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  scheduleDetection();
})();

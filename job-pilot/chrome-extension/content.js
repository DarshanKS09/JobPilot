(function () {
  const DETECTION_PHRASES = [
    "application submitted",
    "thank you for applying",
    "application received",
  ];
  const MAX_TEXT_LENGTH = 12000;

  let lastUrl = window.location.href;
  let lastFingerprint = "";
  let scanTimer = null;

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

  function guessCompany() {
    const candidates = [
      document.querySelector('meta[property="og:site_name"]')?.content,
      document.querySelector('meta[name="application-name"]')?.content,
      document.querySelector("header")?.innerText,
      document.title,
      document.querySelector("h1")?.innerText,
    ]
      .map(normalizeText)
      .filter(Boolean);

    for (const candidate of candidates) {
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

    return hostnameToName(window.location.hostname);
  }

  function guessTitle() {
    const candidates = [
      document.querySelector("h1")?.innerText,
      document.title,
      document.querySelector("h2")?.innerText,
    ]
      .map(normalizeText)
      .filter(Boolean);

    return candidates[0] || "Job Application";
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

  function sendDetection() {
    if (!pageLooksLikeSubmission()) {
      return;
    }

    const job = buildJobData();
    const fingerprint = buildFingerprint(job);

    if (fingerprint === lastFingerprint) {
      return;
    }

    lastFingerprint = fingerprint;

    try {
      chrome.runtime.sendMessage({
        type: "JOB_DETECTED",
        data: job,
      });
    } catch (error) {
      void error;
    }
  }

  function scheduleScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(sendDetection, 600);
  }

  function handleUrlChange() {
    if (window.location.href === lastUrl) {
      return;
    }

    lastUrl = window.location.href;
    scheduleScan();
  }

  const observer = new MutationObserver(() => {
    handleUrlChange();
    scheduleScan();
  });

  function patchHistoryMethod(methodName) {
    const original = history[methodName];

    history[methodName] = function () {
      const result = original.apply(this, arguments);
      handleUrlChange();
      scheduleScan();
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

  scheduleScan();
})();

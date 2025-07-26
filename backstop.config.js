module.exports = {
  id: "backstop_default",
  viewports: [
    {
      label: "phone",
      width: 320,
      height: 480
    },
    {
      label: "tablet",
      width: 1024,
      height: 768
    },
    {
      label: "desktop",
      width: 1920,
      height: 1080
    }
  ],
  onBeforeScript: "puppet/onBefore.js",
  onReadyScript: "puppet/onReady.js",
  scenarios: [
    {
      label: "FilteredDetailsList-Default",
      cookiePath: "backstop_data/engine_scripts/cookies.json",
      url: "http://localhost:8080/test-harness.html",
      referenceUrl: "",
      readyEvent: "",
      readySelector: "",
      delay: 1000,
      hideSelectors: [],
      removeSelectors: [],
      hoverSelector: "",
      clickSelector: "",
      postInteractionWait: 0,
      selectors: [
        ".JvtFilteredDetailsListV2"
      ],
      selectorExpansion: true,
      expect: 0,
      misMatchThreshold: 0.1,
      requireSameDimensions: true
    },
    {
      label: "FilteredDetailsList-WithFilters",
      url: "http://localhost:8080/test-harness.html?scenario=filtered",
      selectors: [
        ".JvtFilteredDetailsListV2"
      ],
      delay: 2000,
      misMatchThreshold: 0.1
    },
    {
      label: "FilteredDetailsList-LargeDataset",
      url: "http://localhost:8080/test-harness.html?scenario=large",
      selectors: [
        ".JvtFilteredDetailsListV2"
      ],
      delay: 3000,
      misMatchThreshold: 0.2
    }
  ],
  paths: {
    bitmaps_reference: "backstop_data/bitmaps_reference",
    bitmaps_test: "backstop_data/bitmaps_test",
    engine_scripts: "backstop_data/engine_scripts",
    html_report: "backstop_data/html_report",
    ci_report: "backstop_data/ci_report"
  },
  report: ["browser"],
  engine: "puppeteer",
  engineOptions: {
    args: ["--no-sandbox"]
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false
};

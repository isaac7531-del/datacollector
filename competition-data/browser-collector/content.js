function text(selector) {
  return Array.from(document.querySelectorAll(selector)).map((node) => node.textContent.trim()).filter(Boolean);
}

function tableRows() {
  return Array.from(document.querySelectorAll("table")).flatMap((table) => {
    const headers = Array.from(table.querySelectorAll("thead th, tr:first-child th, tr:first-child td")).map((cell) => cell.textContent.trim());
    return Array.from(table.querySelectorAll("tbody tr, tr")).slice(1).map((row) => {
      const cells = Array.from(row.querySelectorAll("td, th")).map((cell) => cell.textContent.trim());
      return Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, cells[index] || ""]));
    });
  });
}

function classifyPage() {
  const path = location.pathname.toLowerCase();
  if (path.includes("/horse/")) return "horse-profile";
  if (path.includes("/person/")) return "athlete-profile";
  if (path.includes("/ranking/")) return "ranking";
  if (path.includes("/calendar/")) return "calendar-or-event";
  if (path.includes("/result/")) return "result";
  return "unknown";
}

function extractVisibleData() {
  return {
    schemaVersion: "fei-browser-assisted-v1",
    sourceUrl: location.href,
    pageType: classifyPage(),
    title: document.title,
    headings: text("h1,h2,h3"),
    tables: tableRows(),
    capturedAt: new Date().toISOString()
  };
}

chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EQUIBETS_COLLECT_VISIBLE_FEI_PAGE") {
    sendResponse({ ok: true, data: extractVisibleData() });
  }
});

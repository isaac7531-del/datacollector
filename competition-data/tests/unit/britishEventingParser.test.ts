import { describe, expect, it } from "vitest";
import { parseBritishEventingEventPage, parseBritishEventingTablePayload } from "../../src";

describe("British Eventing parser", () => {
  it("extracts event chunks from result page HTML", () => {
    const html = `
      <meta property="og:title" content="Results: TEST EVENT" />
      Name: TEST EVENT Date: Tue, 5 to Wed, 6 May 2026 Location: Test Venue, United Kingdom Class:
      <article class="load-results-table preload my-panel-contents" data-entity_id="event1" data-chunk_id="class1" data-definition_id="event_results_full">
        <h3>"BE100 - Section A" loading...</h3>
      </article>
    `;
    const event = parseBritishEventingEventPage(html, "https://www.britisheventing.com/results/event/TEST~123");
    expect(event.id).toBe("british-eventing:123");
    expect(event.classes[0]?.loaderUrl).toContain("/results-table-loader/event1/class1/event_results_full");
  });

  it("parses AJAX table payload rows", () => {
    const payload = JSON.stringify([{ data: `<table><caption>BE100 - Section A</caption><thead><tr><th>POS</th><th>Horse</th><th>Rider</th><th>D</th><th>SJ</th><th>SJT</th><th>XC</th><th>XCT</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>HORSE</td><td>Rider Name</td><td>29.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>29.0</td></tr></tbody></table>` }]);
    const parsed = parseBritishEventingTablePayload(payload);
    expect(parsed.caption).toBe("BE100 - Section A");
    expect(parsed.rows[0]?.horseName).toBe("HORSE");
    expect(parsed.rows[0]?.finalScore).toBe(29);
  });
});

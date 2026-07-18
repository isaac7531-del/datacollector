import { describe, expect, it } from "vitest";
import { parseBritishEventingEventLinks, parseBritishEventingEventPage, parseBritishEventingTablePayload } from "../../src";

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
    expect(event.startDate).toBe("2026-05-05");
    expect(event.endDate).toBe("2026-05-06");
    expect(event.venue).toContain("Test Venue");
    expect(event.classes[0]?.loaderUrl).toContain("/results-table-loader/event1/class1/event_results_full");
  });

  it("discovers result URLs from latest-results table rows", () => {
    const html = `<tr data-start="1772150400" data-title="MONTELIBRETTI" data-location="-" data-classes="CCI-S 1*, CCI-S 4*">
      <td><a href="/compete/fixtures-and-results/MONTELIBRETTI~20098993">MONTELIBRETTI</a></td>
      <td>27 Feb - 2 Mar 26</td>
      <td>-</td>
      <td>CCI-S 1*, CCI-S 4*</td>
      <td><div class='event-status-icon status-results-available' title='Results Available'><a href="/results/event/MONTELIBRETTI~20098993">R</a></div></td>
    </tr>`;
    const links = parseBritishEventingEventLinks(html, "https://www.britisheventing.com/latest-results");
    expect(links[0]?.eventId).toBe("20098993");
    expect(links[0]?.status).toBe("results_available");
    expect(links[0]?.classes).toEqual(["CCI-S 1*", "CCI-S 4*"]);
  });

  it("parses cross-month abbreviated British Eventing dates", () => {
    const html = `
      <meta property="og:title" content="Results: MONTELIBRETTI" />
      Name: MONTELIBRETTI Date: 27 Feb - 2 Mar 26 Location: MONTELIBRETTI Class:
    `;
    const event = parseBritishEventingEventPage(html, "https://www.britisheventing.com/results/event/MONTELIBRETTI~20098993");
    expect(event.startDate).toBe("2026-02-27");
    expect(event.endDate).toBe("2026-03-02");
  });

  it("parses AJAX table payload rows", () => {
    const payload = JSON.stringify([{ data: `<table><caption>BE100 - Section A</caption><thead><tr><th>POS</th><th>Horse</th><th>Rider</th><th>D</th><th>SJ</th><th>SJT</th><th>XC</th><th>XCT</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>HORSE</td><td>Rider Name</td><td>29.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>29.0</td></tr></tbody></table>` }]);
    const parsed = parseBritishEventingTablePayload(payload);
    expect(parsed.caption).toBe("BE100 - Section A");
    expect(parsed.rows[0]?.horseName).toBe("HORSE");
    expect(parsed.rows[0]?.finalScore).toBe(29);
  });
});

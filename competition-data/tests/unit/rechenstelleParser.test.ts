import { describe, expect, it } from "vitest";
import { parseRechenstelleAgenda, parseRechenstellePdfText } from "../../src";

describe("Rechenstelle parser", () => {
  it("discovers result documents from agenda HTML", () => {
    const html = `
      <h3>Wiesbaden (GER)</h3><h6>CCI4*-S</h6><h3>CCI4*-S</h3>
      <a href="/media/filer_public/x/y/wiesb_010_erdre_1fr3.pdf">Result Dressage</a>
      <a href="/media/filer_public/x/y/wiesb_010_ersprtp2fr3.pdf">Result after Dressage &amp; Show Jumping</a>
      <a href="/media/filer_public/x/y/wiesb_010_ergelges-1fr3.pdf">Final Result</a>
    `;
    const event = parseRechenstelleAgenda(html, "https://www.rechenstelle.de/en/agenda/2025/wiesbaden/");
    expect(event.name).toBe("Wiesbaden");
    expect(event.documents.map((document) => document.documentType)).toEqual(["dressage", "intermediate", "final"]);
  });

  it("parses rows from extracted PDF text", () => {
    const rows = parseRechenstellePdfText("19 TSF Polartanz Felix ETZEL (GER) 3600 1 35,7 1 5,6 0 5,6 06:12 3 30,1");
    expect(rows[0]?.horseName).toBe("TSF Polartanz");
    expect(rows[0]?.riderName).toBe("Felix ETZEL");
    expect(rows[0]?.nation).toBe("GER");
    expect(rows[0]?.status).toBe("placed");
  });
});

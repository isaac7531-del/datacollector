import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createBritishEventingConnector,
  createEquestrianAustraliaConnector,
  createEquiratingsConnector,
  createEventingIrelandConnector,
  createFeiPublicServerConnector,
  createFranceEventingConnector,
  createItalyEventingConnector,
  createRechenstelleConnector,
  createUseaConnector
} from "../index";

export function createSourceEngine() {
  const repository = new InMemoryCompetitionDataRepository();
  const engine = new CompetitionDataEngine({
    repository,
    connectors: [
      createRechenstelleConnector({
        enabled: true,
        agendaUrls: [
          "https://www.rechenstelle.de/en/agenda/2025/wiesbaden/",
          "https://www.rechenstelle.de/en/agenda/2024/kronenberg-3/"
        ]
      }),
      createBritishEventingConnector({
        enabled: true,
        discoveryUrls: ["https://www.britisheventing.com/latest-results"],
        eventUrls: [
          "https://www.britisheventing.com/results/event/THE-GRASSROOTS-CHAMPIONSHIPS~20098881"
        ]
      }),
      createFeiPublicServerConnector({
        id: "fei",
        enabled: false,
        urls: [
          "https://data.fei.org/Ranking/List.aspx"
        ]
      }),
      createEventingIrelandConnector(),
      createUseaConnector(),
      createEquiratingsConnector(),
      createFranceEventingConnector(),
      createItalyEventingConnector(),
      createEquestrianAustraliaConnector()
    ]
  });
  return { engine, repository };
}

export function sourceIdFromCli(value: string): string {
  if (value === "be") return "british-eventing";
  return value;
}

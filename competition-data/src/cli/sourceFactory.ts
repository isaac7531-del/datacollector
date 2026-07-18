import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createBritishEventingConnector,
  createFeiPublicServerConnector,
  createRechenstelleConnector
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
        eventUrls: [
          "https://www.britisheventing.com/results/event/THE-GRASSROOTS-CHAMPIONSHIPS~20098881"
        ]
      }),
      createFeiPublicServerConnector({
        enabled: false,
        urls: [
          "https://data.fei.org/Ranking/List.aspx"
        ]
      })
    ]
  });
  return { engine, repository };
}

export function sourceIdFromCli(value: string): string {
  if (value === "be") return "british-eventing";
  return value;
}

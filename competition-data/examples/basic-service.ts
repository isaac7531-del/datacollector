import {
  CompetitionDataEngine,
  FetchHttpClient,
  InMemoryCompetitionDataRepository,
  createCompetitionDataHttpServer,
  createHttpJsonFeedConnector
} from "../src";

const repository = new InMemoryCompetitionDataRepository();
const engine = new CompetitionDataEngine({
  repository,
  connectors: [
    createHttpJsonFeedConnector({
      id: "example-public-feed",
      name: "Example public feed",
      enabled: false,
      httpClient: new FetchHttpClient(),
      source: {
        id: "example-public-feed",
        name: "Example public feed",
        kind: "other_public",
        mode: "public_file",
        official: false
      },
      endpoints: [
        {
          id: "latest-results",
          url: "https://example.org/equestrian-results.json"
        }
      ]
    })
  ]
});

const server = createCompetitionDataHttpServer({
  engine,
  apiKey: process.env.COMPETITION_DATA_ENGINE_API_KEY
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Competition Data Engine listening");
});

import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("SentryHulud API")
    .setDescription(
      "Org-mode verdict store for CI scan ingest, analyst queue, and feedback. " +
        "Base path: `/v1`. See docs/api.md for privacy and error semantics.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "token",
        description:
          "Set `SENTRYHULUD_API_TOKEN` on the server. Omit when the token is unset (local dev).",
      },
      "bearer",
    )
    .addTag("scans", "Record scans from the GitHub Action")
    .addTag("verdicts", "Analyst queue and feedback")
    .addTag("corpus", "RAG corpus health")
    .addTag("metrics", "Dashboard counters")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs/openapi.json",
    yamlDocumentUrl: "docs/openapi.yaml",
    customSiteTitle: "SentryHulud API",
  });

  return document;
}

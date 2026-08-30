import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { stringify } from "yaml";
import { AppModule } from "../src/app.module";
import { setupSwagger } from "../src/swagger";

async function exportOpenApi() {
  process.env.SQLITE_PATH = ":memory:";

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");
  const document = setupSwagger(app);
  await app.init();
  await app.close();

  const repoRoot = join(__dirname, "..", "..");
  const yamlPath = join(repoRoot, "docs", "openapi.yaml");
  const jsonPath = join(repoRoot, "docs", "openapi.json");

  writeFileSync(yamlPath, stringify(document));
  writeFileSync(jsonPath, `${JSON.stringify(document, null, 2)}\n`);

  process.stdout.write(`Wrote ${yamlPath}\nWrote ${jsonPath}\n`);
}

exportOpenApi().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});

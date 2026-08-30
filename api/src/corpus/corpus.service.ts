import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

@Injectable()
export class CorpusService {
  async health() {
    const corpusVersion =
      process.env.SENTRYHULUD_CORPUS_VERSION || "no-chaindrop";
    const documentsPath =
      process.env.SENTRYHULUD_CORPUS_DOCUMENTS ||
      join(process.cwd(), "..", "fixtures", "rag-corpus", "documents.jsonl");

    try {
      const { stdout } = await execFileAsync(
        process.env.PYTHON_BIN || "python",
        [
          "-m",
          "rag.health",
          "--documents",
          documentsPath,
          "--corpus-version",
          corpusVersion,
        ],
        { cwd: join(process.cwd(), "..") },
      );
      return JSON.parse(stdout.trim());
    } catch {
      return {
        corpus_version: corpusVersion,
        document_count: 0,
        chaindrop_documents: 0,
        embedded_at: new Date().toISOString(),
        degraded: true,
      };
    }
  }
}

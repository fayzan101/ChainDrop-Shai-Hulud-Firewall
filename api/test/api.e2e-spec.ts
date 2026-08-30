import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createApp } from "../src/main";

describe("API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SQLITE_PATH = ":memory:";
    delete process.env.SENTRYHULUD_API_TOKEN;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("records a scan and lists verdicts", async () => {
    const create = await request(app.getHttpServer())
      .post("/v1/scans")
      .send({
        repo: "acme/app",
        sha: "abc123",
        run_id: "run-1",
        lockfile_digest: "digest-1",
        verdicts: [
          {
            repo: "acme/app",
            sha: "abc123",
            run_id: "run-1",
            package: "@scope/pkg",
            version: "1.0.0",
            hook: "preinstall",
            script_sha256: "a".repeat(64),
            risk_score: 88,
            action: "block",
            attack_techniques: ["T1195.002"],
            matched_campaigns: ["shai-hulud-2.0"],
            justification: "Credential harvest indicators in preinstall hook.",
            citations: [
              {
                doc_id: "ti-shulud2-001",
                title: "Shai-Hulud 2.0 credential theft",
                url: "https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/",
                date: "2025-11-24",
              },
            ],
            uncertainty: "low",
            reasoner_status: "ok",
            model_version: "features-heuristic-0.1.0",
            feature_schema_version: "1.0.0",
            corpus_version: "no-chaindrop",
            prompt_version: "verdict-fixture-0.1.0",
            classifier_label: "escalate",
            sandbox: { timeout: false, canary_hits: ["npm_token"], egress_count: 2 },
            degraded: false,
            split: null,
          },
        ],
      })
      .expect(201);

    expect(create.body.scan_id).toBeTruthy();
    expect(create.body.verdicts).toHaveLength(1);

    const list = await request(app.getHttpServer()).get("/v1/verdicts").expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].action).toBe("block");
  });

  it("is idempotent on run_id + lockfile_digest", async () => {
    const payload = {
      repo: "acme/app",
      sha: "abc123",
      run_id: "run-dup",
      lockfile_digest: "digest-dup",
      verdicts: [
        {
          repo: "acme/app",
          sha: "abc123",
          run_id: "run-dup",
          package: "pkg",
          version: "1.0.0",
          hook: "install",
          script_sha256: "b".repeat(64),
          risk_score: 45,
          action: "quarantine",
          attack_techniques: [],
          matched_campaigns: [],
          justification: "Uncertain static features.",
          citations: [],
          uncertainty: "medium",
          reasoner_status: "skipped",
          degraded: false,
        },
      ],
    };

    const first = await request(app.getHttpServer())
      .post("/v1/scans")
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/v1/scans")
      .send(payload)
      .expect(201);

    expect(second.body.idempotent).toBe(true);
    expect(second.body.scan_id).toBe(first.body.scan_id);
  });

  it("stores feedback without mutating held-out split", async () => {
    const create = await request(app.getHttpServer())
      .post("/v1/scans")
      .send({
        repo: "acme/app",
        sha: "heldout-sha",
        run_id: "run-heldout",
        lockfile_digest: "digest-heldout",
        split: "heldout",
        verdicts: [
          {
            repo: "acme/app",
            sha: "heldout-sha",
            run_id: "run-heldout",
            package: "chaindrop-pkg",
            version: "9.9.9",
            hook: "postinstall",
            script_sha256: "c".repeat(64),
            risk_score: 95,
            action: "block",
            attack_techniques: ["T1195.002"],
            matched_campaigns: ["chaindrop"],
            justification: "Held-out evaluation sample.",
            citations: [],
            uncertainty: "low",
            reasoner_status: "ok",
            degraded: false,
            split: "heldout",
          },
        ],
      })
      .expect(201);

    const verdictId = create.body.verdicts[0].verdict_id;
    const feedback = await request(app.getHttpServer())
      .post(`/v1/verdicts/${verdictId}/feedback`)
      .send({
        label: "confirm-malicious",
        analyst: "alice",
        comment: "Matches held-out campaign behavior.",
      })
      .expect(201);

    expect(feedback.body.heldout_split_preserved).toBe(true);
    expect(feedback.body.verdict.split).toBe("heldout");
    expect(feedback.body.feedback.analyst).toBe("alice");
  });

  it("rejects false-positive feedback on held-out verdicts", async () => {
    const create = await request(app.getHttpServer())
      .post("/v1/scans")
      .send({
        repo: "acme/app",
        sha: "heldout-sha-2",
        run_id: "run-heldout-2",
        lockfile_digest: "digest-heldout-2",
        verdicts: [
          {
            repo: "acme/app",
            sha: "heldout-sha-2",
            run_id: "run-heldout-2",
            package: "chaindrop-pkg",
            version: "9.9.9",
            hook: "postinstall",
            script_sha256: "d".repeat(64),
            risk_score: 95,
            action: "block",
            attack_techniques: [],
            matched_campaigns: ["chaindrop"],
            justification: "Held-out evaluation sample.",
            citations: [],
            uncertainty: "low",
            reasoner_status: "ok",
            degraded: false,
            split: "heldout",
          },
        ],
      })
      .expect(201);

    const verdictId = create.body.verdicts[0].verdict_id;
    await request(app.getHttpServer())
      .post(`/v1/verdicts/${verdictId}/feedback`)
      .send({
        label: "false-positive",
        analyst: "bob",
      })
      .expect(400);
  });
});

describe("createApp bootstrap", () => {
  it("creates a Nest application", async () => {
    process.env.SQLITE_PATH = ":memory:";
    const app = await createApp();
    await app.close();
  });
});

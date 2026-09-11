import type { INestApplication } from "@nestjs/common";
import { prometheusRegistry } from "./prometheus.registry";

/** Mount plain-text Prometheus scrape at GET /metrics (outside /v1). */
export function registerPrometheusScrape(app: INestApplication): void {
  const http = app.getHttpAdapter().getInstance();
  http.get(
    "/metrics",
    (
      _req: unknown,
      res: { type: (t: string) => unknown; send: (b: string) => unknown },
    ) => {
      res.type("text/plain; version=0.0.4; charset=utf-8");
      res.send(prometheusRegistry.render());
    },
  );
}

import { VerdictEntity } from "./entities/verdict.entity";
import { FeedbackEntity } from "./entities/feedback.entity";

export function serializeVerdict(verdict: VerdictEntity) {
  return {
    verdict_id: verdict.verdict_id,
    created_at: verdict.created_at.toISOString(),
    repo: verdict.repo,
    sha: verdict.sha,
    run_id: verdict.run_id,
    package: verdict.package,
    version: verdict.version,
    hook: verdict.hook,
    script_sha256: verdict.script_sha256,
    risk_score: verdict.risk_score,
    action: verdict.action,
    attack_techniques: verdict.attack_techniques,
    matched_campaigns: verdict.matched_campaigns,
    justification: verdict.justification,
    citations: verdict.citations,
    uncertainty: verdict.uncertainty,
    reasoner_status: verdict.reasoner_status,
    model_version: verdict.model_version,
    feature_schema_version: verdict.feature_schema_version,
    corpus_version: verdict.corpus_version,
    prompt_version: verdict.prompt_version,
    classifier_label: verdict.classifier_label,
    sandbox: verdict.sandbox,
    degraded: verdict.degraded,
    split: verdict.split,
    feedback: verdict.feedback ? serializeFeedback(verdict.feedback) : null,
  };
}

export function serializeFeedback(feedback: FeedbackEntity) {
  return {
    label: feedback.label,
    comment: feedback.comment,
    analyst: feedback.analyst,
    created_at: feedback.created_at.toISOString(),
  };
}

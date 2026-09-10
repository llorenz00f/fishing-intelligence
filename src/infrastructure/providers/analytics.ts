export type AnalyticsEventName =
  | "signup_completed"
  | "onboarding_completed"
  | "forecast_viewed"
  | "score_viewed"
  | "session_started"
  | "session_completed"
  | "catch_logged"
  | "spot_created"
  | "insights_viewed";

export type AnalyticsProvider = {
  track(event: AnalyticsEventName, properties?: Record<string, unknown>): Promise<void>;
};

export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  async track(event: AnalyticsEventName, properties?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[analytics]", event, properties ?? {});
    }
  }
}

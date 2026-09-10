export type AIInsightInput = {
  structuredData: Record<string, unknown>;
  locale: string;
};

export type AIInsightResponse = {
  summary: string;
  sources: string[];
};

export interface AIInsightsProvider {
  explain(input: AIInsightInput): Promise<AIInsightResponse>;
}

export class DisabledAIInsightsProvider implements AIInsightsProvider {
  async explain() {
    return {
      summary: "AI insights non attivi: il core usa dati strutturati e scoring deterministico.",
      sources: [],
    };
  }
}

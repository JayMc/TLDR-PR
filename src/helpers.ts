import { Usage } from "./models/usage.js";
import { Installation } from "./models/installation.js";
import { estimator } from "./estimator.js";

export function estimateTokens(text: string): number {
  const tokens = estimator(text ?? "");
  return tokens.length ?? 0;
}

type Usage = {
  _id: string;
  apiCalls: number;
  promptTokens: number;
  completionTokens: number;
};

export async function getUsage(installation_id: string): Promise<Usage> {
  const query = [
    {
      $match: {
        installation_id: String(installation_id),
      },
    },
    {
      $group: {
        _id: "$installation_id",
        apiCalls: { $sum: "$usage.apiCalls" },
        promptTokens: { $sum: "$usage.promptTokensActual" },
        completionTokens: { $sum: "$usage.completionTokensActual" },
      },
    },
  ];
  //   console.log("query", query);

  const usageTotals = await Usage.aggregate(query);
  //   console.log("usageTotals", usageTotals);
  return usageTotals[0] ?? {};
}

type Limits = {
  apiCalls: number;
  promptTokens: number;
  completionTokens: number;
};

export async function getLimits(installation_id: string): Promise<Limits> {
  const installation = await Installation.findOne({
    installation_id,
  });

  return {
    apiCalls: installation?.limits?.apiCalls ?? 0,
    promptTokens: installation?.limits?.promptTokens ?? 0,
    completionTokens: installation?.limits?.completionTokens ?? 0,
  }
  );
}

import { Usage } from "./models/usage.js";
import { Installation } from "./models/installation.js";
import { estimator } from "./estimator.js";

export function estimateTokens(text: string) {
  const tokens = estimator(text ?? "");
  return tokens.length ?? 0;
}

export async function getUsage(installation_id: string) {
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

export async function getLimits(installation_id: string) {
  //   console.log("installation_id", installation_id);

  const installation = await Installation.findOne({
    installation_id,
  });
  //   console.log("installation", installation);

  return (
    installation?.limits ?? {
      apiCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
    }
  );
}

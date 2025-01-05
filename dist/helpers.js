var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Usage } from "./models/usage.js";
import { Installation } from "./models/installation.js";
import { estimator } from "./estimator.js";
export function estimateTokens(text) {
    var _a;
    const tokens = estimator(text !== null && text !== void 0 ? text : "");
    return (_a = tokens.length) !== null && _a !== void 0 ? _a : 0;
}
export function getUsage(installation_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
        const usageTotals = yield Usage.aggregate(query);
        //   console.log("usageTotals", usageTotals);
        return (_a = usageTotals[0]) !== null && _a !== void 0 ? _a : {};
    });
}
export function getLimits(installation_id) {
    return __awaiter(this, void 0, void 0, function* () {
        //   console.log("installation_id", installation_id);
        var _a;
        const installation = yield Installation.findOne({
            installation_id,
        });
        //   console.log("installation", installation);
        return ((_a = installation === null || installation === void 0 ? void 0 : installation.limits) !== null && _a !== void 0 ? _a : {
            apiCalls: 0,
            promptTokens: 0,
            completionTokens: 0,
        });
    });
}

import { getDatabaseClient } from "../storage/client";
import { InvestigationHttpApi } from "./api";
import { HttpError, apiFailure } from "./errors";

export function getInvestigationApi() { return new InvestigationHttpApi(getDatabaseClient()); }

export async function withInvestigationApi(action: (api: InvestigationHttpApi) => Promise<Response>): Promise<Response> {
  let api: InvestigationHttpApi;
  try { api = getInvestigationApi(); }
  catch { return apiFailure(new HttpError(503, "STORAGE_UNAVAILABLE", "数据库配置尚未就绪，请检查服务端配置。")); }
  try { return await action(api); }
  catch (error) { return apiFailure(error); }
}

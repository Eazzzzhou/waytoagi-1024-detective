import { withInvestigationApi } from "@/server/http/runtime";
import { methodNotAllowed } from "@/server/http/errors";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withInvestigationApi(async (api) => api.retry(request, (await context.params).id));
}
export function GET() { return methodNotAllowed("POST"); }
export { GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD };

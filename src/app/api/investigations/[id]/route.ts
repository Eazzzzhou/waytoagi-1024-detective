import { withInvestigationApi } from "@/server/http/runtime";
import { methodNotAllowed } from "@/server/http/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withInvestigationApi(async (api) => api.detail(request, (await context.params).id));
}
export function POST() { return methodNotAllowed("GET, HEAD"); }
export { POST as PUT, POST as PATCH, POST as DELETE };

import { withInvestigationApi } from "@/server/http/runtime";
import { methodNotAllowed } from "@/server/http/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; requestId: string }> }) {
  return withInvestigationApi(async (api) => {
    const { id, requestId } = await context.params;
    return api.adviceRequest(request, id, requestId);
  });
}
export function POST() { return methodNotAllowed("GET, HEAD"); }
export { POST as PUT, POST as PATCH, POST as DELETE };

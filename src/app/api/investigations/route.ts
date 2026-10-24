import { withInvestigationApi } from "@/server/http/runtime";
import { methodNotAllowed } from "@/server/http/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return withInvestigationApi((api) => api.create(request)); }
export function GET() { return methodNotAllowed("POST"); }
export { GET as PUT, GET as PATCH, GET as DELETE, GET as HEAD };

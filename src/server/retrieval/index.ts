import type { Evidence, ProductIdentity, RetrievalRecord } from "../../contracts";
import { unavailable } from "../errors";

export interface RetrievalProvider { search(query: string, identity: ProductIdentity): Promise<RetrievalRecord> }
export interface SourceProvider { fetch(url: string): Promise<Evidence> }
export const retrievalProvider: RetrievalProvider = { search: () => unavailable("retrieval") };
export const sourceProvider: SourceProvider = { fetch: () => unavailable("source-fetch") };

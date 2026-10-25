import type { Evidence, ProductIdentity, RetrievalRecord } from "../../contracts";
import { createCollectionProviders, type CollectionContext } from "./collection";
export { createCollectionProviders, unresolvedIdentity, YuanbaoImportSchema } from "./collection";
export { normalizeSourceUrl } from "./http";
export type { CollectionContext, CollectionOptions, CollectionRequest, CollectionResult, CollectionDiagnostic, SearchEntry } from "./collection";

export interface RetrievalProvider { search(query: string, identity?: ProductIdentity, context?: CollectionContext): Promise<RetrievalRecord> }
export interface SourceProvider { fetch(url: string, context?: CollectionContext): Promise<Evidence> }
export const retrievalProvider: RetrievalProvider = { search: (query, identity, context) => createCollectionProviders(context).search(query, identity, context) };
export const sourceProvider: SourceProvider = { fetch: (url, context) => createCollectionProviders(context).fetch(url, context) };

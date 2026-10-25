import type { ProductIdentity } from "../../contracts";
import { createCollectionProviders, type CollectionContext } from "../retrieval/collection";

export interface IdentityProvider { resolve(question: string, context?: CollectionContext): Promise<ProductIdentity> }
// Discovery performs real search/reads under the caller's signal. UNRESOLVED is a
// valid result, not a request for a user-supplied website or a retrieval gate.
export const identityProvider: IdentityProvider = { resolve: (question, context) => createCollectionProviders(context).resolve(question, context) };

import type { ProductIdentity } from "../../contracts";
import { createCollectionProviders, type CollectionContext } from "../retrieval/collection";

export interface IdentityProvider { resolve(question: string, context?: CollectionContext): Promise<ProductIdentity> }
export const identityProvider: IdentityProvider = { resolve: (question, context) => createCollectionProviders(context).resolve(question, context) };

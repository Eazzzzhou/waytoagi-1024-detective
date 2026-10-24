import type { ProductIdentity } from "../../contracts";
import { unavailable } from "../errors";

export interface IdentityProvider { resolve(question: string): Promise<ProductIdentity> }
export const identityProvider: IdentityProvider = { resolve: () => unavailable("identity") };

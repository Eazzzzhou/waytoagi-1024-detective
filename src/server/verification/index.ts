import type { Answer, Claim, Evidence, EvidenceSnapshot, ProductIdentity } from "../../contracts";
import { unavailable } from "../errors";

export interface VerificationProvider { verify(input: EvidenceSnapshot): Promise<EvidenceSnapshot> }
export interface ClaimExtractionProvider { extract(evidence: Evidence[], identity: ProductIdentity): Promise<Claim[]> }
export interface AnswerProvider { generate(snapshot: EvidenceSnapshot): Promise<Answer> }
export const verificationProvider: VerificationProvider = { verify: () => unavailable("verification") };
export const claimExtractionProvider: ClaimExtractionProvider = { extract: () => unavailable("claim-extraction") };
export const answerProvider: AnswerProvider = { generate: () => unavailable("answer") };

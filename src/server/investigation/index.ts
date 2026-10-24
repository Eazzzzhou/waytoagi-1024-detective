export { CreateInvestigationSchema, InvestigationSchema } from "../../contracts";
export { InvestigationRepository } from "../storage/repository";
export { investigationHandler, type InvestigationContext, type InvestigationHandler } from "./handler";
// Direct repository creation only persists a record. Submit executable work through queue.enqueue.

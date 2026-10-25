import type { Job, Prisma, PrismaClient } from "../../generated/prisma/client";
import { z } from "zod";
import { AnswerSchema, CreateInvestigationSchema, EvidenceSnapshotSchema, IdSchema, InvestigationSchema, assertAnswerReferences } from "../../contracts";
import { StoredDataError } from "./errors";
import { readDatabaseTime } from "./database-time";

type Database = PrismaClient | Prisma.TransactionClient;

/** Inputs are unknown intentionally: HTTP, providers, models and JSONB are runtime boundaries. */
export class InvestigationRepository {
  constructor(private readonly db: Database) {}

  async createInvestigation(input: unknown) {
    const data = CreateInvestigationSchema.parse(input);
    const now = await readDatabaseTime(this.db);
    const row = await this.db.investigation.create({ data: { ...data, createdAt: now, updatedAt: now } });
    return this.parseInvestigation(row);
  }

  async findInvestigation(id: unknown) {
    const row = await this.db.investigation.findUnique({ where: { id: IdSchema.parse(id) } });
    return row ? this.parseInvestigation(row) : null;
  }

  async exists(id: unknown): Promise<boolean> {
    const row = await this.db.investigation.findUnique({ where: { id: IdSchema.parse(id) }, select: { id: true } });
    return Boolean(row);
  }

  /** Retry availability is a queue policy, but the job lookup belongs to the investigation aggregate. */
  async findJob(investigationId: unknown): Promise<Job | null> {
    return this.db.job.findUnique({ where: { investigationId: IdSchema.parse(investigationId) } });
  }

  private parseInvestigation(row: Prisma.InvestigationGetPayload<object>) {
    return InvestigationSchema.parse({
      ...row,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null
    });
  }

  async createSnapshot(input: unknown) {
    const snapshot = EvidenceSnapshotSchema.parse(input);
    if (snapshot.parentSnapshotId) {
      const parent = await this.findSnapshot(snapshot.parentSnapshotId);
      if (!parent || parent.investigationId !== snapshot.investigationId || parent.version + 1 !== snapshot.version) throw new Error("Snapshot parent must be the preceding version of the same investigation");
    }
    const row = await this.db.evidenceSnapshot.create({ data: {
      id: snapshot.id, investigationId: snapshot.investigationId, version: snapshot.version,
      parentSnapshotId: snapshot.parentSnapshotId, contractVersion: snapshot.contractVersion,
      body: snapshot, generatedAt: new Date(snapshot.generatedAt)
    } });
    return this.parseSnapshot(row);
  }

  async findSnapshot(id: unknown) {
    const row = await this.db.evidenceSnapshot.findUnique({ where: { id: IdSchema.parse(id) } });
    return row ? this.parseSnapshot(row) : null;
  }

  private parseSnapshot(row: Prisma.EvidenceSnapshotGetPayload<object>) {
    const snapshot = EvidenceSnapshotSchema.parse(row.body);
    if (snapshot.id !== row.id || snapshot.investigationId !== row.investigationId || snapshot.version !== row.version || snapshot.parentSnapshotId !== row.parentSnapshotId || snapshot.contractVersion !== row.contractVersion || Date.parse(snapshot.generatedAt) !== row.generatedAt.getTime()) throw new StoredDataError();
    return snapshot;
  }

  private async validateAnswer(input: unknown, requireQuotes = true) {
    const answer = AnswerSchema.parse(input);
    const snapshot = await this.findSnapshot(answer.snapshotId);
    if (!snapshot) throw new z.ZodError([{ code: "custom", message: "Answer snapshot does not exist", path: ["snapshotId"] }]);
    assertAnswerReferences(answer, snapshot, requireQuotes);
    return answer;
  }

  async createAnswer(input: unknown) {
    const answer = await this.validateAnswer(input);
    await this.db.answer.create({ data: { id: answer.id, snapshotId: answer.snapshotId, body: answer, generatedAt: new Date(answer.generationConfig.generatedAt) } });
    return answer;
  }

  async findAnswer(id: unknown) {
    const row = await this.db.answer.findUnique({ where: { id: IdSchema.parse(id) } });
    if (!row) return null;
    const answer = await this.validateAnswer(row.body, false);
    if (answer.id !== row.id || answer.snapshotId !== row.snapshotId || Date.parse(answer.generationConfig.generatedAt) !== row.generatedAt.getTime()) throw new StoredDataError();
    return answer;
  }
}


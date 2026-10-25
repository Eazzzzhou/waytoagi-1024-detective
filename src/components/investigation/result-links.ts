/** Namespaced by immutable snapshot: fragments never point into another snapshot. */
export const resultAnchor = (snapshotId: string, kind: string, id: string) => `snapshot-${snapshotId}-${kind}-${id}`;
export const citationAnchor = (snapshotId: string, answerId: string, index: number) => resultAnchor(snapshotId, "citation", `${answerId}-${index}`);

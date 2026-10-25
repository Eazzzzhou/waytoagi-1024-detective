import { createHash } from "node:crypto";
import type { ResearchDocument, ResearchFragment } from "./protocol";

/** Use A1's saved row/cell ranges; column headers and values remain separate quotes. */
export function tableFragments(document: ResearchDocument, requests: { blockId: string; rows: number[] }[], limit: number, excluded: Pick<ResearchFragment, "start" | "end">[]): ResearchFragment[] {
  const result: ResearchFragment[] = [];
  for (const request of requests) {
    const table = document.tables?.find(item => item.blockId === request.blockId);
    const block = document.blocks.find(item => item.id === request.blockId);
    if (!table || !block) continue;
    const headers = [0, ...table.rows.flatMap((row, index) => row.cells.length && row.cells.every(cell => cell.header) ? [index] : [])];
    const rows = [...new Set([...headers.slice(0, 2), ...request.rows])];
    for (const index of rows) {
      const row = table.rows[index];
      if (!row || row.start < block.start || row.end > block.end || row.end <= row.start) continue;
      for (let offset = row.start; offset < row.end && result.length < limit; offset += 300) {
        const sliced = document.text.slice(offset, Math.min(row.end, offset + 300));
        const exactText = sliced.trim();
        if (!exactText) continue;
        const start = offset + sliced.indexOf(exactText), end = start + exactText.length;
        if ([...excluded, ...result].some(other => other.start < end && other.end > start)) continue;
        result.push({ documentId: document.id, documentVersion: document.version, blockId: block.id,
          start, end, exactText, fragmentHash: createHash("sha256").update(exactText).digest("hex"),
          sourceUrl: block.sourceUrl ?? document.finalUrl,
          locator: `${block.locator ?? block.id}; table row ${index}; source-text/v1 UTF-16 [${start},${end})`,
          context: document.text.slice(block.start, block.end), score: 1 });
      }
    }
  }
  return result;
}

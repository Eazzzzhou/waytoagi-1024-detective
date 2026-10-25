// @vitest-environment happy-dom
/** Isolated HTTP response fixtures only. No database writes or product conclusions. */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InvestigationDetail } from "../../src/components/investigation/InvestigationDetail";
import { NewInvestigationForm } from "../../src/components/investigation/NewInvestigationForm";
import { ApiError, NetworkError, readApi } from "../../src/components/investigation/api-client";
import { AcceptedInvestigationSchema, InvestigationDetailSchema, type InvestigationDetail as Detail } from "../../src/contracts";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const timestamp = "2026-10-24T10:00:00.000Z";
function detail(status: Detail["investigation"]["status"] = "PENDING", allowed = false): Detail {
  return InvestigationDetailSchema.parse({
    investigation: { id, question: "隔离交互测试，不是产品结论", status, stage: status === "SUCCEEDED" ? "COMPLETED" : "IDENTITY", error: status === "FAILED" ? { code: "PROVIDER_FAILED", message: "隔离测试错误", retryable: true } : null, createdAt: timestamp, updatedAt: timestamp, startedAt: timestamp, completedAt: ["SUCCEEDED", "FAILED", "CANCELLED"].includes(status) ? timestamp : null, resultSnapshotId: status === "SUCCEEDED" ? other : null },
    identityConfirmation: status === "AWAITING_CONFIRMATION" ? { identity: { name: "隔离测试产品", officialWebsite: "https://example.com", version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION", confirmationBasis: [] }, reason: "隔离测试：请提供真实身份依据" } : null,
    retry: { allowed, reason: allowed ? "后端允许隔离测试重试" : "后端不允许重试", remaining: 2, expectedAttemptCount: 1 }
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const accepted = () => json({ investigationId: id, reused: false }, 202);
const conflict = () => json({ error: { code: "CONFLICT", message: "隔离状态冲突" } }, 409);
let fetchMock: ReturnType<typeof vi.fn>;
async function flush() { await act(async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); }); }
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => { vi.useFakeTimers(); fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); push.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("retains HTTP status/code, rejects invalid schemas and requires 202 acceptance", async () => {
  fetchMock.mockResolvedValueOnce(conflict());
  await expect(readApi("/test", AcceptedInvestigationSchema)).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  fetchMock.mockResolvedValueOnce(json({ investigationId: id, reused: false }));
  await expect(readApi("/test", AcceptedInvestigationSchema, { expectedStatus: 202 })).rejects.toBeInstanceOf(ApiError);
  fetchMock.mockResolvedValueOnce(json({ fake: "success" }));
  await expect(readApi("/test", AcceptedInvestigationSchema)).rejects.toThrow("契约校验");
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(readApi("/test", AcceptedInvestigationSchema)).rejects.toBeInstanceOf(NetworkError);
});

it("validates input, locks duplicate submits, reuses the key after network loss, and navigates only on 202", async () => {
  let reject!: (error: Error) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>((_resolve, fail) => { reject = fail; })).mockResolvedValue(accepted());
  const view = render(<NewInvestigationForm />);
  const form = view.container.querySelector("form")!;
  fireEvent.submit(form); await flush(); expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("你想核实什么？"), { target: { value: "隔离测试问题" } });
  fireEvent.submit(form); fireEvent.submit(form); await flush(); expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new TypeError("connection lost")); }); await flush();
  expect(push).not.toHaveBeenCalled();
  fireEvent.submit(form); await flush();
  expect(fetchMock.mock.calls[0]![1].headers["Idempotency-Key"]).toBe(fetchMock.mock.calls[1]![1].headers["Idempotency-Key"]);
  expect(push).toHaveBeenCalledWith(`/investigations/${id}`);
  // A new user submission after acceptance starts a new business request.
  fireEvent.submit(form); await flush();
  expect(fetchMock.mock.calls[2]![1].headers["Idempotency-Key"]).not.toBe(fetchMock.mock.calls[1]![1].headers["Idempotency-Key"]);
});

it("does not navigate on an unexpected 200 and cancels submission on unmount", async () => {
  fetchMock.mockResolvedValueOnce(json({ investigationId: id, reused: false })).mockImplementation(() => new Promise(() => {}));
  const view = render(<NewInvestigationForm />);
  fireEvent.change(screen.getByLabelText("你想核实什么？"), { target: { value: "隔离提交" } });
  fireEvent.submit(view.container.querySelector("form")!); await flush(); expect(push).not.toHaveBeenCalled();
  fireEvent.submit(view.container.querySelector("form")!); await flush();
  const signal = fetchMock.mock.calls[1]![1].signal as AbortSignal;
  view.unmount(); expect(signal.aborted).toBe(true);
});

it("connects validation feedback to the field, restores focus and clears invalidity on edit", async () => {
  const view = render(<NewInvestigationForm />);
  const input = screen.getByLabelText("你想核实什么？");
  fireEvent.submit(view.container.querySelector("form")!); await flush();
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
  fireEvent.change(input, { target: { value: "隔离的有效问题" } });
  expect(input.getAttribute("aria-invalid")).toBe("false");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("polls PENDING/RUNNING every 2 seconds, uses the saved stage and stops for confirmation", async () => {
  const running = detail("RUNNING"); running.investigation.stage = "SOURCE_FETCH";
  fetchMock.mockResolvedValueOnce(json(detail())).mockResolvedValueOnce(json(running)).mockResolvedValue(json(detail("AWAITING_CONFIRMATION")));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  await advance(1999); expect(fetchMock).toHaveBeenCalledTimes(1);
  await advance(1); expect(screen.getByText("获取来源原文")).toBeTruthy();
  await advance(2000); expect(screen.getByText("隔离测试：请提供真实身份依据")).toBeTruthy();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(3);
  const signal = fetchMock.mock.calls[2]![1].signal as AbortSignal;
  view.unmount(); expect(signal.aborted).toBe(true); await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(3);
});

it.each(["FAILED", "CANCELLED"] as const)("stops polling for %s", async (status) => {
  fetchMock.mockResolvedValue(json(detail(status)));
  render(<InvestigationDetail investigationId={id} />); await flush(); await advance(20000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("retains last good data and read time, makes exactly three network retries, then permits manual recovery", async () => {
  fetchMock.mockResolvedValueOnce(json(detail())).mockRejectedValue(new TypeError("Failed to fetch"));
  render(<InvestigationDetail investigationId={id} />); await flush();
  expect(screen.getByText(/最后成功读取状态/).textContent).toContain("上海时间");
  await advance(2000); // First failed poll, not yet a retry.
  await advance(6000); // Three retries.
  expect(fetchMock).toHaveBeenCalledTimes(5);
  expect(screen.getByText(/自动读取已停止/)).toBeTruthy();
  expect(screen.getByText("隔离交互测试，不是产品结论")).toBeTruthy();
  expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  await advance(20000); expect(fetchMock).toHaveBeenCalledTimes(5);
  fetchMock.mockResolvedValue(json(detail("CANCELLED")));
  fireEvent.click(screen.getByRole("button", { name: "刷新状态" })); await flush();
  expect(screen.queryByText(/当前状态读取失败/)).toBeNull(); expect(screen.getByText("本次调查已取消。")).toBeTruthy();
});

it("cleans pending poll timers on unmount", async () => {
  fetchMock.mockResolvedValue(json(detail()));
  const view = render(<InvestigationDetail investigationId={id} />); await flush(); view.unmount();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("aborts old route requests and ignores late responses even when transport ignores abort", async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; })).mockResolvedValue(json({ ...detail("CANCELLED"), investigation: { ...detail("CANCELLED").investigation, id: other, question: "另一个隔离调查" } }));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
  view.rerender(<InvestigationDetail investigationId={other} />); await flush(); expect(signal.aborted).toBe(true);
  await act(async () => { resolve(json(detail())); }); await flush();
  expect(screen.getByText("另一个隔离调查")).toBeTruthy(); expect(screen.queryByText("隔离交互测试，不是产品结论")).toBeNull();
});

it("obeys backend retry.allowed rather than the error code", async () => {
  fetchMock.mockResolvedValue(json(detail("FAILED", false)));
  render(<InvestigationDetail investigationId={id} />); await flush();
  const button = screen.getByRole("button", { name: "重试调查" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true); fireEvent.click(button); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("refreshes on retry 409 without replay and preserves the conflict notice after a successful GET", async () => {
  fetchMock.mockResolvedValueOnce(json(detail("FAILED", true))).mockResolvedValueOnce(conflict()).mockResolvedValue(json(detail("CANCELLED")));
  render(<InvestigationDetail investigationId={id} />); await flush();
  fireEvent.click(screen.getByRole("button", { name: "重试调查" })); await flush();
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ expectedAttemptCount: 1 });
  expect(screen.getByText(/调查数据已变化/)).toBeTruthy(); expect(screen.getByText("本次调查已取消。")).toBeTruthy();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("preserves non-conflict action errors through manual refresh without automatically retrying the POST", async () => {
  fetchMock.mockResolvedValueOnce(json(detail("FAILED", true))).mockRejectedValueOnce(new TypeError("connection lost")).mockResolvedValue(json(detail("FAILED", true)));
  render(<InvestigationDetail investigationId={id} />); await flush();
  fireEvent.click(screen.getByRole("button", { name: "重试调查" })); await flush();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "刷新状态" })); await flush();
  expect(screen.getByText(/无法连接服务/)).toBeTruthy();
});

it("refreshes identity conflicts, preserves the notice after form removal, and sends only the confirmed contract", async () => {
  fetchMock.mockResolvedValueOnce(json(detail("AWAITING_CONFIRMATION"))).mockResolvedValueOnce(conflict()).mockResolvedValue(json(detail("CANCELLED")));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  expect((screen.getByLabelText("原文获取时间（本机时间）") as HTMLInputElement).value).toBe("");
  for (const [label, value] of [["依据的来源链接", "https://example.com/test-only"], ["用于确认身份的原文", "仅为隔离交互材料，不是真实产品依据"], ["原文获取时间（本机时间）", "2026-10-24T10:00"], ["确认理由", "隔离输入测试"]]) {
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  }
  fireEvent.submit(view.container.querySelector("form")!); await flush();
  const body = JSON.parse(fetchMock.mock.calls[1]![1].body);
  expect(body.expectedAttemptCount).toBe(1); expect(body.identity.version).toBeNull(); expect(body.identity.plan).toBeNull();
  expect(body.identity.confirmationBasis[0].retrievedAt).toBe(new Date("2026-10-24T10:00").toISOString());
  expect(screen.queryByRole("button", { name: "确认身份并继续" })).toBeNull();
  expect(screen.getByText(/调查数据已变化/)).toBeTruthy();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("loads only the pointed snapshot, marks historical results, and preserves a stale snapshot explicitly on read failure", async () => {
  const snapshot = makeSnapshot(id); snapshot.id = other;
  const success = detail("SUCCEEDED");
  fetchMock.mockImplementation((url: string) => Promise.resolve(url.includes("/snapshots/") ? json({ snapshot, answers: [makeAnswer(snapshot)] }) : json(success)));
  render(<InvestigationDetail investigationId={id} />); await flush();
  expect(screen.getByText(/Synthetic test answer/)).toBeTruthy(); await advance(6000); expect(fetchMock).toHaveBeenCalledTimes(2);
  fetchMock.mockImplementation((url: string) => url.includes("/snapshots/") ? Promise.reject(new TypeError("connection lost")) : Promise.resolve(json({ ...detail("FAILED"), investigation: { ...detail("FAILED").investigation, resultSnapshotId: other } })));
  fireEvent.click(screen.getByRole("button", { name: "刷新状态" })); await flush(); await advance(6000);
  expect(screen.getByText(/不代表本轮执行成功/)).toBeTruthy();
  expect(screen.getByText(/下方保留上次成功读取的快照/)).toBeTruthy(); expect(screen.getByText(/Synthetic test answer/)).toBeTruthy();
});

it("never renders a snapshot belonging to another investigation", async () => {
  const snapshot = makeSnapshot(other); snapshot.id = other;
  fetchMock.mockImplementation((url: string) => Promise.resolve(url.includes("/snapshots/") ? json({ snapshot, answers: [makeAnswer(snapshot)] }) : json(detail("SUCCEEDED"))));
  render(<InvestigationDetail investigationId={id} />); await flush();
  expect(screen.getByText(/快照与当前调查或快照 ID 不匹配/)).toBeTruthy(); expect(screen.queryByText(/Synthetic test answer/)).toBeNull();
});

it("does not automatically retry HTTP or schema errors as network failures", async () => {
  fetchMock.mockResolvedValueOnce(json({ error: { code: "NOT_FOUND", message: "隔离记录不存在" } }, 404)).mockResolvedValueOnce(json({ invalid: true }));
  render(<InvestigationDetail investigationId={id} />); await flush(); await advance(10000);
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(screen.getByText(/隔离记录不存在/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "刷新状态" })); await flush(); await advance(10000);
  expect(fetchMock).toHaveBeenCalledTimes(2); expect(screen.getByText(/响应未通过数据契约校验/)).toBeTruthy();
});

it("cleans the automatic network retry timer on unmount", async () => {
  fetchMock.mockRejectedValue(new TypeError("network down"));
  const view = render(<InvestigationDetail investigationId={id} />); await flush(); view.unmount();
  await advance(10000); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("does not permit a second retry while POST or the refreshed state is pending", async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(json(detail("FAILED", true))).mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; })).mockImplementation(() => new Promise(() => {}));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  fireEvent.click(screen.getByRole("button", { name: "重试调查" }));
  fireEvent.click(screen.getByRole("button", { name: "正在恢复任务…" })); await flush(); expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async () => { resolve(accepted()); }); await flush();
  expect((screen.getByRole("button", { name: "重试调查" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "重试调查" })); expect(fetchMock).toHaveBeenCalledTimes(3);
  const signal = fetchMock.mock.calls[2]![1].signal as AbortSignal;
  view.unmount(); expect(signal.aborted).toBe(true);
});

it("aborts retry POST on route change and never applies its late success to the new investigation", async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(json(detail("FAILED", true))).mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; })).mockResolvedValue(json({ ...detail("CANCELLED"), investigation: { ...detail("CANCELLED").investigation, id: other, question: "新的隔离记录" } }));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  fireEvent.click(screen.getByRole("button", { name: "重试调查" })); await flush();
  const signal = fetchMock.mock.calls[1]![1].signal as AbortSignal;
  view.rerender(<InvestigationDetail investigationId={other} />); await flush(); expect(signal.aborted).toBe(true);
  await act(async () => { resolve(accepted()); }); await flush(); expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(screen.getByText("新的隔离记录")).toBeTruthy();
});

it("aborts stale snapshot reads and never shows the prior snapshot after an ID change", async () => {
  const old = makeSnapshot(id); old.id = other;
  let resolve!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(json(detail("SUCCEEDED"))).mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; })).mockResolvedValue(json({ ...detail("CANCELLED"), investigation: { ...detail("CANCELLED").investigation, id: other } }));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  const signal = fetchMock.mock.calls[1]![1].signal as AbortSignal;
  view.rerender(<InvestigationDetail investigationId={other} />); await flush(); expect(signal.aborted).toBe(true);
  await act(async () => { resolve(json({ snapshot: old, answers: [makeAnswer(old)] })); }); await flush();
  expect(screen.queryByText(/Synthetic test answer/)).toBeNull();
});

it("confirms identity once, refreshes into PENDING and resumes polling to a real failed state", async () => {
  fetchMock.mockResolvedValueOnce(json(detail("AWAITING_CONFIRMATION"))).mockResolvedValueOnce(accepted()).mockResolvedValueOnce(json(detail())).mockResolvedValue(json(detail("FAILED")));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  for (const [label, value] of [["依据的来源链接", "https://example.com/test-only"], ["用于确认身份的原文", "隔离材料，不是产品事实"], ["原文获取时间（本机时间）", "2026-10-24T10:00"], ["确认理由", "隔离测试"]]) fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  const form = view.container.querySelector("form")!;
  fireEvent.submit(form); fireEvent.submit(form); await flush();
  expect(fetchMock.mock.calls.filter((call) => call[0].endsWith("/identity"))).toHaveLength(1);
  expect(screen.getByText("排队中")).toBeTruthy(); await advance(2000);
  expect(screen.getByText("调查失败")).toBeTruthy(); expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("cancels an in-flight identity confirmation on unmount", async () => {
  fetchMock.mockResolvedValueOnce(json(detail("AWAITING_CONFIRMATION"))).mockImplementation(() => new Promise(() => {}));
  const view = render(<InvestigationDetail investigationId={id} />); await flush();
  for (const [label, value] of [["依据的来源链接", "https://example.com/test-only"], ["用于确认身份的原文", "隔离材料，不是产品事实"], ["原文获取时间（本机时间）", "2026-10-24T10:00"], ["确认理由", "隔离测试"]]) fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.submit(view.container.querySelector("form")!); await flush();
  const signal = fetchMock.mock.calls[1]![1].signal as AbortSignal;
  view.unmount(); expect(signal.aborted).toBe(true);
});

it("shows snapshot HTTP and invalid-mapping failures as errors instead of empty successful results", async () => {
  fetchMock.mockImplementation((url: string) => Promise.resolve(url.includes("/snapshots/") ? json({ error: { code: "INVALID_STORED_DATA", message: "隔离引用映射损坏" } }, 500) : json(detail("SUCCEEDED"))));
  render(<InvestigationDetail investigationId={id} />); await flush();
  expect(screen.getByText("结果暂时无法读取")).toBeTruthy(); expect(screen.getByText("隔离引用映射损坏")).toBeTruthy();
  expect(screen.queryByText(/该快照没有证据记录/)).toBeNull();
  const snapshot = makeSnapshot(id); snapshot.id = other;
  const answer = makeAnswer(snapshot); answer.citations[0]!.quotes![0]!.originalExcerpt = "不匹配的隔离原句";
  fetchMock.mockImplementation((url: string) => Promise.resolve(url.includes("/snapshots/") ? json({ snapshot, answers: [answer] }) : json(detail("SUCCEEDED"))));
  fireEvent.click(screen.getByRole("button", { name: "重新读取结果" })); await flush();
  expect(screen.getByText(/响应未通过数据契约校验/)).toBeTruthy(); expect(screen.queryByText(/Synthetic test answer/)).toBeNull();
});

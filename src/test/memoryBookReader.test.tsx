import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { HTMLAttributes, ReactNode } from "react";
import MemoryBook from "@/components/nandini/MemoryBook";
const mocks = vi.hoisted(() => ({
  session: { user: { id: "owner" } } as { user: { id: string } } | null,
  load: vi.fn(),
  dispose: vi.fn(),
  reduced: true,
}));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ session: mocks.session }) }));
vi.mock("@/lib/memoryBook", () => ({ loadMemoryBook: mocks.load }));
vi.mock("framer-motion", () => ({
  useReducedMotion: () => mocks.reduced,
  motion: {
    div: ({
      children,
      initial,
      animate,
      transition,
      onAnimationComplete,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      children?: ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      onAnimationComplete?: () => void;
    }) => (
      <div {...props} onAnimationEnd={onAnimationComplete}>
        {children}
      </div>
    ),
  },
}));
const pages = [1, 2, 3].map((number) => ({
  number,
  path: `memory-book/page-${number}.png`,
  alt: `Handwritten Just For You letter, page ${number} of 3`,
  url: `blob:${number}`,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "owner" } };
  mocks.reduced = true;
  mocks.load.mockResolvedValue({ pages, dispose: mocks.dispose });
});
afterEach(cleanup);
const open = async () => {
  await screen.findByAltText(pages[0]!.alt);
};
it("loads inline on authenticated Home, with no popup or open step", async () => {
  mocks.session = null;
  const { rerender } = render(<MemoryBook />);
  expect(mocks.load).not.toHaveBeenCalled();
  mocks.session = { user: { id: "owner" } };
  rerender(<MemoryBook />);
  await open();
  expect(screen.getByRole("region", { name: "Friendship Notes" })).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.load).toHaveBeenCalledTimes(1);
});
it("turns 1 → 2 → 3 and back, with first and last boundaries", async () => {
  render(<MemoryBook />);
  await open();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  for (const number of [2, 3]) {
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByAltText(pages[number - 1]!.alt)).toHaveAttribute("src", `blob:${number}`);
  }
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByAltText(pages[1]!.alt)).toHaveAttribute("src", "blob:2");
});
it("supports scoped keyboard arrows and reduced motion without intercepting other tabs", async () => {
  render(<MemoryBook />);
  await open();
  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
  const reader = screen.getByRole("group", { name: "Handwritten pages" });
  reader.focus();
  fireEvent.keyDown(reader, { key: "ArrowRight" });
  expect(screen.getByAltText(pages[1]!.alt)).toBeVisible();
  fireEvent.keyDown(reader, { key: "ArrowLeft" });
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
  expect(reader).toHaveFocus();
  expect(document.querySelector('[data-motion="reduced"]')).not.toBeNull();
});
it("prevents repeated turns until the page plane completes", async () => {
  mocks.reduced = false;
  render(<MemoryBook />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  fireEvent.keyDown(screen.getByRole("group", { name: "Handwritten pages" }), {
    key: "ArrowRight",
  });
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.animationEnd(document.querySelector(".memory-turning")!);
  expect(screen.getByAltText(pages[1]!.alt)).toHaveAttribute("src", "blob:2");
});
it("supports horizontal swipe without responding to a vertical gesture", async () => {
  render(<MemoryBook />);
  await open();
  const stage = document.querySelector(".memory-stage")!;
  fireEvent.touchStart(stage, {
    touches: [{ clientX: 200, clientY: 100 }],
    changedTouches: [{ clientX: 200, clientY: 100 }],
  });
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 105 }] });
  expect(screen.getByAltText(pages[1]!.alt)).toBeVisible();
  fireEvent.touchStart(stage, {
    touches: [{ clientX: 200, clientY: 100 }],
    changedTouches: [{ clientX: 200, clientY: 100 }],
  });
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 190, clientY: 220 }] });
  expect(screen.getByAltText(pages[1]!.alt)).toBeVisible();
});
it("shows safe failure copy and retries instead of crashing Home", async () => {
  mocks.load.mockRejectedValueOnce(Error("Private backend detail"));
  render(<MemoryBook />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Pages load nahi ho paayi");
  expect(screen.queryByText("Private backend detail")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByAltText(pages[0]!.alt)).toBeVisible();
});
it("disposes loaded private pages when the session ends", async () => {
  const { rerender } = render(<MemoryBook />);
  await open();
  mocks.session = null;
  rerender(<MemoryBook />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
});
it("disposes on unmount and starts page one after mounting again", async () => {
  const view = render(<MemoryBook />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  view.unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  render(<MemoryBook />);
  await open();
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
  expect(mocks.load).toHaveBeenCalledTimes(2);
});
it("finishes reverse animation on the previous page without skipping", async () => {
  mocks.reduced = false;
  render(<MemoryBook />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByAltText(pages[1]!.alt)).toHaveAttribute("src", "blob:2");
  fireEvent.animationEnd(document.querySelector(".memory-turning")!);
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  fireEvent.keyDown(screen.getByRole("group", { name: "Handwritten pages" }), { key: "ArrowLeft" });
  expect(document.querySelector(".memory-front img")).toHaveAttribute("src", "blob:1");
  fireEvent.animationEnd(document.querySelector(".memory-turning")!);
  expect(screen.getByAltText(pages[0]!.alt)).toHaveAttribute("src", "blob:1");
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
});
it("does not turn after a cancelled swipe or a pinch gesture", async () => {
  render(<MemoryBook />);
  await open();
  const stage = document.querySelector(".memory-stage")!;
  const point = { clientX: 200, clientY: 100 };
  fireEvent.touchStart(stage, { touches: [point], changedTouches: [point] });
  fireEvent.touchCancel(stage);
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 100 }] });
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
  fireEvent.touchStart(stage, { touches: [point], changedTouches: [point] });
  fireEvent.touchMove(stage, {
    touches: [point, { clientX: 300, clientY: 100 }],
    changedTouches: [point],
  });
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 100 }] });
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
});
it("allows reading while zoomed without interpreting a pan as a page turn", async () => {
  vi.stubGlobal("visualViewport", { scale: 2 });
  try {
    render(<MemoryBook />);
    await open();
    const stage = document.querySelector(".memory-stage")!;
    const point = { clientX: 200, clientY: 100 };
    fireEvent.touchStart(stage, { touches: [point], changedTouches: [point] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
  } finally {
    vi.unstubAllGlobals();
  }
});
it("aborts a pending load on unmount and disposes a late result", async () => {
  let finish!: (book: { pages: typeof pages; dispose: () => void }) => void;
  mocks.load.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<MemoryBook />);
  const signal = mocks.load.mock.calls[0]![1] as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish({ pages, dispose: mocks.dispose });
  await waitFor(() => expect(mocks.dispose).toHaveBeenCalledTimes(1));
  expect(screen.queryByAltText(pages[0]!.alt)).toBeNull();
});
it("resets and reloads private content when the account changes", async () => {
  const { rerender } = render(<MemoryBook />);
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  mocks.session = { user: { id: "other-owner" } };
  rerender(<MemoryBook />);
  await open();
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(mocks.load).toHaveBeenLastCalledWith("other-owner", expect.any(AbortSignal));
  expect(screen.getByAltText(pages[0]!.alt)).toBeVisible();
});

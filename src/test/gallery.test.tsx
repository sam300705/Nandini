import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GalleryTab from "@/components/nandini/GalleryTab";
const auth = vi.hoisted(() => ({ uid: "owner" }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ session: { user: { id: auth.uid } } }) }));
const photo = { id: "one", src: "data:image/jpeg;base64,AAAA", caption: "Her smile" };
beforeEach(() => {
  localStorage.clear();
  auth.uid = "owner";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("starts empty with an upload option and no sample food images", () => {
  render(<GalleryTab />);
  expect(screen.getByRole("button", { name: "Upload photos" })).toBeEnabled();
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByText(/Daal Makhni/)).toBeNull();
  expect(screen.getByText(/Saved in this browser only/)).toBeVisible();
});
it("restores photos after remount, opens them, and removes them persistently", () => {
  localStorage.setItem("nandini-gallery:owner", JSON.stringify([photo]));
  const view = render(<GalleryTab />);
  fireEvent.click(screen.getByRole("button", { name: "Open Her smile" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.keyDown(document, { key: "Escape" });
  view.unmount();
  render(<GalleryTab />);
  expect(screen.getByRole("img", { name: "Her smile" })).toBeVisible();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Remove Her smile" }));
  expect(localStorage.getItem("nandini-gallery:owner")).toBe("[]");
});
it("rejects unsupported files without changing saved photos", async () => {
  localStorage.setItem("nandini-gallery:owner", JSON.stringify([photo]));
  render(<GalleryTab />);
  fireEvent.change(screen.getByLabelText("Choose photos for your gallery"), {
    target: { files: [new File(["text"], "test.svg", { type: "image/svg+xml" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Only JPEG, PNG and WebP");
  expect(JSON.parse(localStorage.getItem("nandini-gallery:owner")!)).toEqual([photo]);
});
it("stores an uploaded photo and preserves existing photos on storage failure", async () => {
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAAA");
  const file = new File([new Uint8Array([255, 216, 255, 0])], "Nandini.jpg", { type: "image/jpeg" });
  Object.defineProperty(file, "slice", {
    value: () => ({ arrayBuffer: async () => new Uint8Array([255, 216, 255, 0]).buffer }),
  });
  render(<GalleryTab />);
  const upload = () =>
    fireEvent.change(screen.getByLabelText("Choose photos for your gallery"), {
      target: { files: [file] },
    });
  upload();
  await screen.findByRole("img", { name: "Nandini" });
  const saved = localStorage.getItem("nandini-gallery:owner");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  upload();
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Photos could not be saved"),
  );
  expect(localStorage.getItem("nandini-gallery:owner")).toBe(saved);
  expect(screen.getAllByRole("img")).toHaveLength(1);
});
it("does not show another account's local gallery", () => {
  localStorage.setItem("nandini-gallery:other", JSON.stringify([photo]));
  render(<GalleryTab />);
  expect(screen.queryByRole("img")).toBeNull();
});

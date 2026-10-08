import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  isConfigured: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      onAuthStateChange: (listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));
vi.mock("@/components/nandini/LockScreen", () => ({ default: () => <p>Private sign-in gate</p> }));
vi.mock("@/components/nandini/HomeTab", () => ({ default: () => <p>Private Home</p> }));
vi.mock("@/components/nandini/DiaryTab", () => ({ default: () => <p>Private Diary</p> }));
vi.mock("@/components/nandini/TogetherDiaryTab", () => ({
  default: () => <p>Sambhav and Nandini Diary</p>,
}));
const session = {
  user: { id: "owner" },
  access_token: "test",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
const Page = Route.options.component!;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);
it("keeps private content hidden until the session is verified", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  render(<Page />);
  expect(await screen.findByText("Private sign-in gate")).toBeVisible();
  expect(screen.queryByText("Private Home")).toBeNull();
});
it("shows Home, Diary and the Sambhav-Nandini friendship diary and locks immediately on logout", async () => {
  render(<Page />);
  await screen.findByText("Private Home");
  const navigation = screen.getByRole("navigation");
  expect(navigation.querySelectorAll("button")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Chat" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Music" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Gallery" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Diary" }));
  expect(screen.getByText("Private Diary")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Friendship Diary" }));
  expect(screen.getByText("Sambhav and Nandini Diary")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Lock" }));
  expect(await screen.findByText("Private sign-in gate")).toBeVisible();
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("rejects a revoked session and reacts to sign-out events", async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: Error("revoked") });
  const view = render(<Page />);
  expect(await screen.findByText("Private sign-in gate")).toBeVisible();
  view.unmount();
  render(<Page />);
  await screen.findByText("Private Home");
  act(() => mocks.listener?.("SIGNED_OUT", null));
  expect(await screen.findByText("Private sign-in gate")).toBeVisible();
  expect(screen.queryByText("Private Home")).toBeNull();
});

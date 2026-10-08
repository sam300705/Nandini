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
vi.mock("@/components/nandini/HomeTab", () => ({
  default: ({ onOpenNote }: { onOpenNote: () => void }) => (
    <div>
      <p>Public Home</p>
      <button onClick={onOpenNote}>Open your friendship note</button>
    </div>
  ),
}));
vi.mock("@/components/nandini/FriendshipNote", () => ({
  default: ({ onBack }: { onBack: () => void }) => (
    <div>
      <p>Public friendship notebook</p>
      <button onClick={onBack}>Back to home</button>
    </div>
  ),
}));
vi.mock("@/components/nandini/DiaryTab", () => ({ default: () => <p>Private Diary</p> }));
vi.mock("@/components/nandini/TogetherDiaryTab", () => ({
  default: () => <p>Sambhav and Nandini Diary</p>,
}));
vi.mock("@/components/nandini/VoiceCompanion", () => ({
  default: () => <p>Authenticated voice companion</p>,
}));

const session = {
  user: { id: "owner" },
  access_token: "test",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
const Page = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listener = null;
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);

it("opens the public friendship home and all notebook pages without any password", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  render(<Page />);
  expect(await screen.findByText("Public Home")).toBeVisible();
  expect(screen.queryByLabelText("Password")).toBeNull();
  expect(screen.queryByText("Private Diary")).toBeNull();
  expect(screen.queryByText("Authenticated voice companion")).toBeNull();
  expect(screen.getByRole("navigation", { name: "Main navigation" }).querySelectorAll("button")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Open your friendship note" }));
  expect(screen.getByText("Public friendship notebook")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
  expect(screen.getByText("Public Home")).toBeVisible();
});

it("preserves private diaries only for a verified session, and hides them after logout", async () => {
  render(<Page />);
  await screen.findByText("Authenticated voice companion");
  const navigation = screen.getByRole("navigation", { name: "Main navigation" });
  expect(navigation.querySelectorAll("button")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Gallery" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Diary" }));
  expect(screen.getByText("Private Diary")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Friendship Diary" }));
  expect(screen.getByText("Sambhav and Nandini Diary")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Lock" }));
  expect(await screen.findByText("Public Home")).toBeVisible();
  expect(screen.queryByText("Sambhav and Nandini Diary")).toBeNull();
  expect(screen.queryByRole("button", { name: "Diary" })).toBeNull();
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("continues to show the public site if a session is revoked", async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: Error("revoked") });
  const view = render(<Page />);
  expect(await screen.findByText("Public Home")).toBeVisible();
  view.unmount();
  render(<Page />);
  await screen.findByText("Authenticated voice companion");
  act(() => mocks.listener?.("SIGNED_OUT", null));
  expect(await screen.findByText("Public Home")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Diary" })).toBeNull();
});

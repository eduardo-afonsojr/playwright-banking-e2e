/**
 * @jest-environment jsdom
 *
 * Component test for LoginForm with Testing Library: renders the real
 * component in jsdom and mocks only the boundaries (fetch, router).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { LoginForm } from "@/components/LoginForm";

const push = jest.fn();
const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

// jsdom has no Response constructor, so fetch resolves to a minimal stub
// with just the surface LoginForm uses (ok + json()).
function mockFetchOnce(status: number, body: unknown): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("posts the credentials and navigates to the dashboard on success", async () => {
    const fetchMock = mockFetchOnce(200, {
      user: { username: "jane.doe", fullName: "Jane Doe" },
    });
    render(<LoginForm />);

    await fillAndSubmit("jane.doe", "Password123!");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "jane.doe",
          password: "Password123!",
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows the API error message on failed login and does not navigate", async () => {
    mockFetchOnce(401, { error: "Invalid username or password." });
    render(<LoginForm />);

    await fillAndSubmit("jane.doe", "wrong");

    expect(
      await screen.findByText("Invalid username or password."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // The form is re-enabled for another attempt.
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows the generic error when the request itself fails", async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<LoginForm />);

    await fillAndSubmit("jane.doe", "whatever");

    expect(
      await screen.findByText("Login failed. Please try again."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<LoginForm />);

    await fillAndSubmit("jane.doe", "whatever");

    expect(
      await screen.findByText("Login failed. Please try again."),
    ).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

const login = vi.fn();
vi.mock("@/lib/resources", () => ({ login: (...args: unknown[]) => login(...args) }));

const { LoginForm } = await import("@/features/auth/login-form");

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  login.mockReset();
  searchParams = new URLSearchParams();
});

describe("LoginForm", () => {
  it("validates required fields before calling the API", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("logs in and returns to the page the user came from", async () => {
    searchParams = new URLSearchParams("next=/requests");
    login.mockResolvedValue({ username: "assessment.it", displayName: "assessment.it" });
    renderForm();

    await userEvent.type(screen.getByLabelText("Username"), "assessment.it");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(login).toHaveBeenCalledWith("assessment.it", "correct-horse");
    expect(replace).toHaveBeenCalledWith("/requests");
  });

  it("shows the server's message when login fails", async () => {
    login.mockRejectedValue(new ApiError(401, "Incorrect username or password."));
    renderForm();

    await userEvent.type(screen.getByLabelText("Username"), "assessment.it");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("can reveal the password", async () => {
    renderForm();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});

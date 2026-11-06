import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import type { Contractor } from "./types";

const account = {
  _id: "user-1",
  name: "Alex Morgan",
  email: "alex@example.test",
  token: "local-test-session",
};
const company: Contractor = {
  _id: "company-1",
  name: "Northline Materials",
  nip: "0012345678",
  phone: "+48 123 456 789",
  address: "12 Fictional Road",
  notes: "Use the side entrance.",
  priceColorless: 0,
  priceColor: 1.23456,
  contactDate: "2025-04-03T12:24:11.000Z",
  createdAt: "2025-04-01T10:00:00.000Z",
  updatedAt: "2025-04-03T12:24:11.000Z",
};
let records: Contractor[];
let handler: (
  path: string,
  method: string,
  body: Record<string, unknown>,
) => Response | Promise<Response> | undefined;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const calls: { path: string; method: string; body: Record<string, unknown> }[] =
  [];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
  records = [{ ...company }];
  calls.length = 0;
  handler = () => undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(input), "http://localhost").pathname;
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ path, method, body });
      const override = await handler(path, method, body);
      if (override) return override;
      if (path === "/api/auth/me") return json(account);
      if (path === "/api/auth/login" || path === "/api/auth/register")
        return json(account);
      if (path === "/api/contractors" && method === "GET") return json(records);
      if (path === "/api/contractors" && method === "POST") {
        const added = { _id: "company-new", ...body } as unknown as Contractor;
        records.push(added);
        return json(added, 201);
      }
      const id = path.split("/").at(-1);
      const existing = records.find((record) => record._id === id);
      if (!existing) return json({ message: "Company not found." }, 404);
      if (method === "PUT") {
        Object.assign(existing, body);
        return json(existing);
      }
      if (method === "DELETE") {
        records = records.filter((record) => record._id !== id);
        return json({ message: "Company deleted." });
      }
      return json(existing);
    }),
  );
});
function open(path: string, signedIn = true) {
  if (signedIn) {
    localStorage.setItem("userToken", account.token);
    localStorage.setItem("contractorfoil.session", JSON.stringify(account));
  }
  window.history.replaceState({}, "", path);
  return render(<App />);
}
async function fillCompany(name = "Riverbank Polymers") {
  fireEvent.change(await screen.findByLabelText(/Company name/), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(/^NIP/), {
    target: { value: "0001234567" },
  });
  fireEvent.change(screen.getByLabelText(/Phone number/), {
    target: { value: "+48 987 654 321" },
  });
  fireEvent.change(screen.getByLabelText(/^Address/), {
    target: { value: "42 Example Avenue" },
  });
}

it("restores identity from /me before showing protected company data", async () => {
  let release!: (value: Response) => void;
  handler = (path) =>
    path === "/api/auth/me"
      ? new Promise((resolve) => {
          release = resolve;
        })
      : undefined;
  open("/contractors");
  expect(screen.queryByText("Northline Materials")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(/session/i);
  await act(async () => {
    release(json(account));
  });
  expect(
    (await screen.findAllByText("Northline Materials")).length,
  ).toBeGreaterThan(0);
});
it("returns a signed-out visitor to the intended deep link after sign-in", async () => {
  open("/contractors/company-1", false);
  fireEvent.change(await screen.findByLabelText("Email address"), {
    target: { value: account.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ExamplePassword1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByRole("heading", { name: company.name }),
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe("/contractors/company-1");
});
it("registers into a persisted working session without loading CAPTCHA by default", async () => {
  open("/register", false);
  fireEvent.change(await screen.findByLabelText("Full name"), {
    target: { value: account.name },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: account.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ExamplePassword1!" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "ExamplePassword1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(
    await screen.findByRole("heading", { name: "Overview" }),
  ).toBeInTheDocument();
  expect(localStorage.getItem("userToken")).toBe(account.token);
  expect(
    calls.find((call) => call.path === "/api/auth/register")?.body,
  ).not.toHaveProperty("captchaToken");
  expect(document.querySelector('script[src*="google"]')).toBeNull();
});
it("preserves credentials when sign-in fails and exposes the error", async () => {
  handler = (path) =>
    path === "/api/auth/login"
      ? json({ message: "Email or password is incorrect." }, 401)
      : undefined;
  open("/login", false);
  fireEvent.change(await screen.findByLabelText("Email address"), {
    target: { value: account.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect.",
  );
  expect(screen.getByLabelText("Email address")).toHaveValue(account.email);
  expect(screen.getByLabelText("Password")).toHaveValue("wrong-password");
});
it("clears a rejected restored session without loading company records", async () => {
  handler = (path) =>
    path === "/api/auth/me"
      ? json({ message: "Sign in to continue." }, 401)
      : undefined;
  open("/contractors");
  expect(
    await screen.findByRole("heading", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(localStorage.getItem("userToken")).toBeNull();
  expect(calls.some((call) => call.path === "/api/contractors")).toBe(false);
});
it("distinguishes zero, missing and full-precision values on detail and edit", async () => {
  open("/contractors/company-1");
  expect(await screen.findByText("0.00 PLN/kg")).toBeInTheDocument();
  expect(screen.getByText("1.23 PLN/kg")).toBeInTheDocument();
  expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole("link", { name: /Edit company/ }));
  expect(await screen.findByLabelText(/FOD colorless/)).toHaveValue("0");
  expect(screen.getByLabelText(/^FOD color \(/)).toHaveValue("1.23456");
  expect(screen.getByLabelText(/Additional material price/)).toHaveValue("");
});
it("sends only a changed note, preserving legacy dates and price precision", async () => {
  open("/contractors/company-1/edit");
  fireEvent.change(await screen.findByLabelText("Notes"), {
    target: { value: "Call reception." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("heading", { name: company.name });
  expect(screen.getByText("Call reception.")).toBeInTheDocument();
  expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
    notes: "Call reception.",
  });
  expect(records[0].contactDate).toBe("2025-04-03T12:24:11.000Z");
  expect(records[0].priceColor).toBe(1.23456);
});
it("preserves a failed creation draft and displays field-specific feedback", async () => {
  handler = (path, method) =>
    path === "/api/contractors" && method === "POST"
      ? json(
          {
            message: "Check the company details.",
            fields: { nip: "Enter a valid NIP." },
          },
          400,
        )
      : undefined;
  open("/contractors/new");
  await fillCompany();
  fireEvent.change(screen.getByLabelText(/FOD colorless/), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Check the company details.",
  );
  expect(screen.getByLabelText(/Company name/)).toHaveValue(
    "Riverbank Polymers",
  );
  expect(screen.getByLabelText(/FOD colorless/)).toHaveValue("0");
  expect(screen.getByLabelText(/^NIP/)).toHaveAttribute("aria-invalid", "true");
});
it("prevents repeated submissions while a save is pending", async () => {
  let release!: (value: Response) => void;
  handler = (path, method) =>
    path === "/api/contractors" && method === "POST"
      ? new Promise((resolve) => {
          release = resolve;
        })
      : undefined;
  open("/contractors/new");
  await fillCompany();
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  const button = await screen.findByRole("button", { name: /Saving/ });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await act(async () => {
    const created = {
      ...company,
      _id: "company-new",
      name: "Riverbank Polymers",
    };
    records.push(created);
    release(json(created, 201));
  });
  expect(
    await screen.findByRole("heading", { name: "Riverbank Polymers" }),
  ).toBeInTheDocument();
});
it("requires visible reconciliation before an uncertain creation can be retried", async () => {
  handler = (path, method) =>
    path === "/api/contractors" && method === "POST"
      ? json({ message: "Save result unavailable." }, 503)
      : undefined;
  open("/contractors/new");
  await fillCompany();
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /confirm the save/i,
  );
  expect(screen.getByRole("button", { name: "Add company" })).toBeDisabled();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await userEvent.click(
    screen.getByRole("button", { name: "Check saved records" }),
  );
  expect(
    await screen.findByText(/No matching company was found/),
  ).toBeInTheDocument();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(screen.getByLabelText(/Company name/)).toHaveValue(
    "Riverbank Polymers",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /I checked; allow another save/ }),
  );
  expect(screen.getByRole("button", { name: "Add company" })).toBeEnabled();
});
it("finds a committed company after a lost response instead of repeating creation", async () => {
  handler = (path, method, body) => {
    if (path === "/api/contractors" && method === "POST") {
      records.push({ _id: "company-new", ...body } as unknown as Contractor);
      throw new TypeError("Connection lost");
    }
    return undefined;
  };
  open("/contractors/new");
  await fillCompany();
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Check saved records" }),
  );
  expect(
    await screen.findByRole("link", {
      name: /View saved company: Riverbank Polymers/,
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add company" })).toBeDisabled();
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
});
it("keeps an editing draft during session failure and supports sign-in in place", async () => {
  let failed = false;
  handler = (_path, method) => {
    if (method === "PUT" && !failed) {
      failed = true;
      return json({ message: "Sign in to continue." }, 401);
    }
    return undefined;
  };
  open("/contractors/company-1/edit");
  fireEvent.change(await screen.findByLabelText("Notes"), {
    target: { value: "Retain this draft." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Sign in again" }),
  );
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: account.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ExamplePassword1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText("Notes")).toHaveValue("Retain this draft.");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("heading", { name: company.name });
  expect(screen.getByText("Retain this draft.")).toBeInTheDocument();
});
it("cancels a dirty edit deliberately and resets the next edit to saved values", async () => {
  open("/contractors/company-1/edit");
  fireEvent.change(await screen.findByLabelText("Notes"), {
    target: { value: "Abandoned change" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(
    within(screen.getByRole("dialog", { name: "Discard changes?" })).getByRole(
      "button",
      { name: "Keep editing" },
    ),
  );
  expect(screen.getByLabelText("Notes")).toHaveValue("Abandoned change");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Discard changes",
    }),
  );
  await userEvent.click(
    await screen.findByRole("link", { name: /Edit company/ }),
  );
  expect(await screen.findByLabelText("Notes")).toHaveValue(
    "Use the side entrance.",
  );
});
it("keeps search active after creating a nonmatching company", async () => {
  open("/contractors?q=Northline&sort=name-desc");
  await userEvent.click(
    await screen.findByRole("link", { name: /Add company/ }),
  );
  await fillCompany();
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  await screen.findByRole("heading", { name: "Riverbank Polymers" });
  await userEvent.click(
    screen.getByRole("link", { name: "Back to companies" }),
  );
  expect(await screen.findByLabelText("Search companies")).toHaveValue(
    "Northline",
  );
  expect(
    screen.queryByRole("link", { name: "Riverbank Polymers" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Sort companies")).toHaveValue("name-desc");
});
it("shows a retryable load error separately from an empty company register", async () => {
  let failed = false;
  records = [];
  handler = (path) => {
    if (path === "/api/contractors" && !failed) {
      failed = true;
      return json({ message: "Temporarily unavailable." }, 503);
    }
    return undefined;
  };
  open("/contractors");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /Could not load companies/,
  );
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: "Add your first company" }),
  ).toBeInTheDocument();
});
it("requires a named confirmation and waits for a successful delete", async () => {
  open("/contractors/company-1");
  await userEvent.click(
    await screen.findByRole("button", { name: "Delete company" }),
  );
  const dialog = screen.getByRole("dialog", {
    name: "Delete Northline Materials?",
  });
  expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  expect(
    within(dialog).getByRole("button", { name: "Keep company" }),
  ).toHaveFocus();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Delete company" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Add your first company" }),
  ).toBeInTheDocument();
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
});

it("does not let an old session check clear a newer successful sign-in", async () => {
  let release!: (value: Response) => void;
  handler = (path) =>
    path === "/api/auth/me"
      ? new Promise((resolve) => {
          release = resolve;
        })
      : undefined;
  open("/login");
  fireEvent.change(await screen.findByLabelText("Email address"), {
    target: { value: account.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ExamplePassword1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Overview" });
  await act(async () => {
    release(json({ message: "Old session expired." }, 401));
  });
  expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  expect(localStorage.getItem("userToken")).toBe(account.token);
});

it("keeps a saved company when an earlier list request finishes after creation", async () => {
  let release!: (value: Response) => void;
  let first = true;
  handler = (path, method) => {
    if (path === "/api/contractors" && method === "GET" && first) {
      first = false;
      return new Promise((resolve) => {
        release = resolve;
      });
    }
    return undefined;
  };
  open("/contractors");
  await userEvent.click(
    await screen.findByRole("link", { name: "Add company" }),
  );
  await fillCompany();
  fireEvent.click(screen.getByRole("button", { name: "Add company" }));
  await screen.findByRole("heading", { name: "Riverbank Polymers" });
  await act(async () => {
    release(json([company]));
  });
  await userEvent.click(
    screen.getByRole("link", { name: "Back to companies" }),
  );
  expect(
    (await screen.findAllByRole("link", { name: "Riverbank Polymers" })).length,
  ).toBeGreaterThan(0);
});

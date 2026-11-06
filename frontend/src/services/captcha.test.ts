import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  document
    .querySelectorAll('script[src*="recaptcha"]')
    .forEach((script) => script.remove());
  delete (window as Window & { grecaptcha?: unknown }).grecaptcha;
});
it("returns without loading a script when account verification is disabled", async () => {
  vi.stubEnv("VITE_USE_RECAPTCHA", "false");
  const { registrationCaptcha } = await import("./captcha");
  expect(await registrationCaptcha()).toBeUndefined();
  expect(document.querySelector('script[src*="recaptcha"]')).toBeNull();
});
it("fails visibly without making a request when verification has no site key", async () => {
  vi.stubEnv("VITE_USE_RECAPTCHA", "true");
  vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "");
  const { registrationCaptcha } = await import("./captcha");
  await expect(registrationCaptcha()).rejects.toThrow(
    "Account verification is not configured.",
  );
  expect(document.querySelector('script[src*="recaptcha"]')).toBeNull();
});
it("loads verification only on explicit request and returns its registration token", async () => {
  vi.stubEnv("VITE_USE_RECAPTCHA", "true");
  vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "fictional-local-site-key");
  const execute = vi.fn(async () => "fictional-verification-token");
  (window as Window & { grecaptcha?: unknown }).grecaptcha = {
    ready: (callback: () => void) => callback(),
    execute,
  };
  const { registrationCaptcha } = await import("./captcha");
  const result = registrationCaptcha();
  const script = document.querySelector<HTMLScriptElement>(
    'script[src*="recaptcha"]',
  );
  expect(script?.src).toBe(
    "https://www.google.com/recaptcha/api.js?render=fictional-local-site-key",
  );
  script?.dispatchEvent(new Event("load"));
  expect(await result).toBe("fictional-verification-token");
  expect(execute).toHaveBeenCalledWith("fictional-local-site-key", {
    action: "register",
  });
});
it("allows a deliberate new verification request after the script fails to load", async () => {
  vi.stubEnv("VITE_USE_RECAPTCHA", "true");
  vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "fictional-local-site-key");
  const { registrationCaptcha } = await import("./captcha");
  const first = registrationCaptcha();
  document
    .querySelector('script[src*="recaptcha"]')
    ?.dispatchEvent(new Event("error"));
  await expect(first).rejects.toThrow("Account verification could not load.");
  expect(document.querySelector('script[src*="recaptcha"]')).toBeNull();
  const second = registrationCaptcha();
  (window as Window & { grecaptcha?: unknown }).grecaptcha = {
    ready: (callback: () => void) => callback(),
    execute: async () => "retry-verification-token",
  };
  document
    .querySelector('script[src*="recaptcha"]')
    ?.dispatchEvent(new Event("load"));
  expect(await second).toBe("retry-verification-token");
});

/** Explicit opt-in only; the default application never loads a third-party script. */
type Captcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};
let loading: Promise<Captcha> | undefined;
export async function registrationCaptcha(): Promise<string | undefined> {
  if (import.meta.env.VITE_USE_RECAPTCHA !== "true") return undefined;
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey)
    throw new Error(
      "Account verification is not configured. Contact the application operator.",
    );
  if (!loading)
    loading = new Promise<Captcha>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.onerror = () => {
        loading = undefined;
        script.remove();
        reject(
          new Error(
            "Account verification could not load. Check your connection and try again.",
          ),
        );
      };
      script.onload = () => {
        const captcha = (window as Window & { grecaptcha?: Captcha })
          .grecaptcha;
        if (!captcha) {
          loading = undefined;
          script.remove();
          reject(new Error("Account verification is unavailable. Try again."));
          return;
        }
        captcha.ready(() => resolve(captcha));
      };
      document.head.append(script);
    });
  const captcha = await loading;
  return captcha.execute(siteKey, { action: "register" });
}

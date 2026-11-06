import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import AOS from "aos";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import "aos/dist/aos.css";
import "../CSS/Register.css";

const Register: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [passwordValidations, setPasswordValidations] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false
    });

    const { executeRecaptcha } = useGoogleReCaptcha();
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({
            duration: 1200,
            easing: "ease-in-out-back",
        });
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset errors
        setError(null);

        // Sprawdzenie, czy wszystkie zasady hasła są spełnione
        if (!Object.values(passwordValidations).every(Boolean)) {
            setError("Password does not meet all the requirements");
            return;
        }

        // Sprawdzenie, czy hasła się zgadzają
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!executeRecaptcha) {
            setError("reCAPTCHA is not ready yet");
            return;
        }

        try {
            // Pobierz token reCAPTCHA
            const captchaToken = await executeRecaptcha("register");

            // Wyślij token captcha na backend
            const data = await registerUser(name, email, password, captchaToken);

            if ("error" in data && data.error === "User already exists") {
                setError("This email is already registered.");
            } else if (data.token) {
                navigate("/dashboard"); // Przekierowanie po udanej rejestracji
            }
        } catch (err) {
            setError("Registration failed. Try again.");
        }
    };

    // Funkcja walidacji siły hasła w czasie rzeczywistym
    const validatePassword = (password: string) => {
        setPassword(password);
        setPasswordValidations({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            specialChar: /[!@#$%^&*]/.test(password)
        });
    };

    return (
        <div data-aos="zoom-up" className="register-container">
            <h2 className="pb-8 text-4xl text-gray-700">Register</h2>
            {error && <p className="pb-5" style={{ color: "red" }}>{error}</p>}
            <form className="register-form" onSubmit={handleRegister}>
                <input
                    type="text"
                    placeholder="What's your name? :)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => validatePassword(e.target.value)} // Sprawdzanie hasła w czasie rzeczywistym
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />

                {/* Wskazówki dotyczące siły hasła */}
                {password && (
                    <div data-aos="flip-up" className="password-requirements active">
                        <p className={passwordValidations.length ? "valid" : "invalid"}>
                            Minimum 8 characters
                        </p>
                        <p className={passwordValidations.uppercase ? "valid" : "invalid"}>
                            At least one uppercase letter (A-Z)
                        </p>
                        <p className={passwordValidations.lowercase ? "valid" : "invalid"}>
                            At least one lowercase letter (a-z)
                        </p>
                        <p className={passwordValidations.number ? "valid" : "invalid"}>
                            At least one number (0-9)
                        </p>
                        <p className={passwordValidations.specialChar ? "valid" : "invalid"}>
                            At least one special character (!@#$%^&*)
                        </p>
                    </div>
                )}

                <button onClick={handleRegister} type="submit">Register</button>
            </form>
            <div className="text-center text-gray-600 register-footer">
                <div className="pt-6">
                    <p>Already have an account? <a className="text-emerald-900" href="/login">Login</a></p>
                </div>
                <div className="pt-2 text-xs text-emerald-900">
                    <a className="" href="/">Home Page</a>
                </div>
            </div>
        </div>
    );
};

// Wstawienie komponentu wewnątrz GoogleReCaptchaProvider:
const RegisterWithRecaptcha = () => (
    <GoogleReCaptchaProvider reCaptchaKey="6LeHslAqAAAAAOD-3s1rcRDwxb03uBqQ6LmvAEcX">
        <Register />
    </GoogleReCaptchaProvider>
);

export default RegisterWithRecaptcha;
import { Link } from "react-router-dom";
import { useSession } from "../context/Session";
import { Brand, Icon } from "../components/ui";

export default function HomePage() {
  const { user } = useSession();
  return (
    <div className="public-page">
      <a className="skip-link" href="#home-content">
        Skip to content
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Account navigation">
          {user ? (
            <Link className="button primary" to="/dashboard">
              Open workspace
              <Icon name="arrow" />
            </Link>
          ) : (
            <>
              <Link className="text-link" to="/login">
                Sign in
              </Link>
              <Link className="button primary" to="/register">
                Create account
                <Icon name="arrow" />
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="home-content">
        <section className="home-hero">
          <div className="home-intro">
            <h1>
              Company contacts.
              <br />
              Material prices.
              <br />
              <span>A clearer workspace.</span>
            </h1>
            <p>
              Keep company contact details, current material prices in PLN/kg, a
              contact date and notes together.
            </p>
            <Link
              className="button primary large"
              to={user ? "/contractors" : "/register"}
            >
              {user ? "View companies" : "Create your account"}
              <Icon name="arrow" />
            </Link>
            <p className="hero-note">
              A focused register for the information you work with.
            </p>
          </div>
          <div className="example-record">
            <div className="example-caption">
              <Icon name="document" />
              <span>Example company record</span>
            </div>
            <div className="example-company">
              <span className="company-monogram">NM</span>
              <div>
                <h2>Northline Materials</h2>
                <span>NIP 0012345678</span>
              </div>
            </div>
            <dl className="example-contact">
              <div>
                <dt>Phone number</dt>
                <dd>+48 123 456 789</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>12 Fictional Road, Gdańsk</dd>
              </div>
              <div>
                <dt>Contact date</dt>
                <dd>12 Nov 2026</dd>
              </div>
            </dl>
            <div className="example-prices">
              <span>Current material prices</span>
              <dl>
                <div>
                  <dt>FOD colorless</dt>
                  <dd>
                    1.25 <small>PLN/kg</small>
                  </dd>
                </div>
                <div>
                  <dt>FOD color</dt>
                  <dd>
                    0.85 <small>PLN/kg</small>
                  </dd>
                </div>
              </dl>
            </div>
            <p className="example-note">
              Fictional details shown for illustration.
            </p>
          </div>
        </section>
        <section
          className="home-details"
          aria-labelledby="home-details-heading"
        >
          <div>
            <h2 id="home-details-heading">The details, kept together.</h2>
            <p>One saved record. Ready to find, review and update.</p>
          </div>
          <dl>
            <div>
              <dt>Company contacts</dt>
              <dd>
                Names, NIP, phone numbers and addresses. Search across the
                register to find the record you need.
              </dd>
            </div>
            <div>
              <dt>Current prices</dt>
              <dd>
                FOD colorless, FOD color and an additional material. Values
                remain in PLN per kilogram.
              </dd>
            </div>
            <div>
              <dt>Contact date &amp; notes</dt>
              <dd>
                A date and room for context. Open a saved address in Google Maps
                when you need it.
              </dd>
            </div>
          </dl>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <span>Company contacts &amp; current material prices.</span>
        <Link to={user ? "/contractors" : "/login"}>
          {user ? "Open workspace" : "Sign in"}
          <Icon name="arrow" />
        </Link>
      </footer>
    </div>
  );
}

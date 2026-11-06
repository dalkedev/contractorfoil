import ReadErrorState from "../components/ReadErrorState";
import { Link } from "react-router-dom";
import { useSession } from "../context/Session";
import {
  filterAndSortContractors,
  formatContactDate,
} from "../domain/contractors";
import { useCompanyList } from "./CompaniesPage";
import { EmptyState, Icon, Loading } from "../components/ui";

export default function OverviewPage() {
  const { user } = useSession();
  const { records, loaded, loading, error, load } = useCompanyList();
  const recent = filterAndSortContractors(records, { sort: "updated-desc" })
    .filter((record) => record.updatedAt || record.createdAt)
    .slice(0, 5);
  const withPrices = records.filter((record) =>
    [record.priceColorless, record.priceColor, record.priceUnknown].some(
      (price) => price != null,
    ),
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Overview</h1>
          <p className="page-description">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Your
            company register at a glance.
          </p>
        </div>
        <Link className="button primary" to="/contractors/new">
          <Icon name="plus" />
          Add company
        </Link>
      </div>
      {!loaded && loading ? (
        <Loading />
      ) : error ? (
        <ReadErrorState
          error={error}
          title="Could not load your overview"
          message="Check your connection and try again."
          retry={() => void load()}
        />
      ) : !loaded ? (
        <Loading />
      ) : records.length === 0 ? (
        <div className="register-panel">
          <EmptyState />
        </div>
      ) : (
        <>
          <section
            className="overview-summary"
            aria-labelledby="register-summary"
          >
            <div className="summary-title">
              <h2 id="register-summary">Your register</h2>
              <Link to="/contractors">
                View all companies
                <Icon name="arrow" />
              </Link>
            </div>
            <dl className="summary-values">
              <div>
                <dt>Companies</dt>
                <dd>{records.length}</dd>
              </div>
              <div>
                <dt>With a contact date</dt>
                <dd>{records.filter((record) => record.contactDate).length}</dd>
              </div>
              <div>
                <dt>With material prices</dt>
                <dd>{withPrices}</dd>
              </div>
            </dl>
          </section>
          <div className="overview-columns">
            <section className="register-panel recent-panel">
              <div className="section-heading">
                <h2>Recently updated records</h2>
                <span>Saved record changes</span>
              </div>
              {recent.length ? (
                <ul className="recent-records">
                  {recent.map((record) => (
                    <li key={record._id}>
                      <span className="record-initial" aria-hidden="true">
                        {record.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <Link
                          className="company-title"
                          to={`/contractors/${record._id}`}
                        >
                          {record.name}
                        </Link>
                        <span className="secondary-text">NIP {record.nip}</span>
                      </div>
                      <time dateTime={record.updatedAt ?? record.createdAt}>
                        {formatContactDate(
                          record.updatedAt ?? record.createdAt,
                        )}
                      </time>
                      <Link
                        className="view-link"
                        to={`/contractors/${record._id}`}
                        aria-label={`View ${record.name}`}
                      >
                        <Icon name="arrow" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="section-body">
                  No record update dates are available.{" "}
                  <Link to="/contractors">Browse companies</Link>.
                </p>
              )}
            </section>
            <aside className="workspace-guide">
              <Icon name="document" />
              <h2>Keep the useful details close.</h2>
              <p>
                Save a note, check a current price or find a company’s contact
                details. Every company has its own record.
              </p>
              <Link className="button secondary" to="/contractors">
                Browse companies
                <Icon name="arrow" />
              </Link>
              <p className="guide-footnote">
                Prices use PLN/kg. Contact dates stay as you entered them.
              </p>
            </aside>
          </div>
        </>
      )}
    </>
  );
}

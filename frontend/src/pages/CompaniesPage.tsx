import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../context/Workspace";
import {
  filterAndSortContractors,
  formatContactDate,
  formatPrice,
  type ContractorSort,
} from "../domain/contractors";
import { EmptyState, ErrorState, Icon, Loading } from "../components/ui";
import type { Contractor } from "../types";

const sorts: { value: ContractorSort; label: string }[] = [
  { value: "name-asc", label: "Company name: A–Z" },
  { value: "name-desc", label: "Company name: Z–A" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "contact-asc", label: "Contact date: earliest first" },
  { value: "contact-desc", label: "Contact date: latest first" },
];
export function useCompanyList() {
  const workspace = useWorkspace();
  const { loaded, loading, error, load } = workspace;
  useEffect(() => {
    if (!loaded && !loading && !error) void load();
  }, [loaded, loading, error, load]);
  return workspace;
}
function CompanyCards({ records }: { records: Contractor[] }) {
  return (
    <ul className="company-cards">
      {records.map((record) => (
        <li key={record._id}>
          <div className="company-card-top">
            <div>
              <Link className="company-title" to={`/contractors/${record._id}`}>
                {record.name}
              </Link>
              <span className="secondary-text">NIP {record.nip}</span>
            </div>
            <Icon name="chevron" />
          </div>
          <dl>
            <div>
              <dt>Phone number</dt>
              <dd>
                <a href={`tel:${record.phone.replace(/[^+\d]/g, "")}`}>
                  {record.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt>Contact date</dt>
              <dd>{formatContactDate(record.contactDate)}</dd>
            </div>
            <div>
              <dt>FOD colorless</dt>
              <dd className="numeric">{formatPrice(record.priceColorless)}</dd>
            </div>
            <div>
              <dt>FOD color</dt>
              <dd className="numeric">{formatPrice(record.priceColor)}</dd>
            </div>
          </dl>
          <Link className="card-view" to={`/contractors/${record._id}`}>
            View company
            <Icon name="arrow" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
export default function CompaniesPage() {
  const { records, loaded, loading, error, load, rememberSearch } =
    useCompanyList();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const requestedSort = params.get("sort");
  const sort: ContractorSort = sorts.some(
    (option) => option.value === requestedSort,
  )
    ? (requestedSort as ContractorSort)
    : "name-asc";
  useEffect(() => {
    rememberSearch(params.size ? `?${params.toString()}` : "");
  }, [params, rememberSearch]);
  const filtered = useMemo(
    () => filterAndSortContractors(records, { query, sort }),
    [records, query, sort],
  );
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && !(key === "sort" && value === "name-asc"))
      next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Companies</h1>
          <p className="page-description">
            Your contacts, notes and current material prices.
          </p>
        </div>
        <Link className="button primary" to="/contractors/new">
          <Icon name="plus" />
          Add company
        </Link>
      </div>
      <section className="register-panel" aria-label="Company register">
        <div className="list-toolbar">
          <div className="search-field">
            <label htmlFor="company-search">Search companies</label>
            <div className="search-input">
              <Icon name="search" />
              <input
                id="company-search"
                type="search"
                placeholder="Name, NIP, phone, address or notes"
                value={query}
                onChange={(event) => setFilter("q", event.target.value)}
              />
            </div>
          </div>
          <div className="sort-field">
            <label htmlFor="company-sort">Sort companies</label>
            <select
              id="company-sort"
              value={sort}
              onChange={(event) => setFilter("sort", event.target.value)}
            >
              {sorts.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!loaded && loading ? (
          <Loading />
        ) : error ? (
          <ErrorState
            title="Could not load companies"
            message="Check your connection and try again. Your saved records have not been changed."
            retry={() => void load()}
          />
        ) : loaded && records.length === 0 ? (
          <EmptyState />
        ) : loaded && filtered.length === 0 ? (
          <EmptyState filtered clear={() => setFilter("q", "")} />
        ) : loaded ? (
          <>
            <div className="register-caption">
              <p role="status">
                {filtered.length}{" "}
                {filtered.length === 1 ? "company" : "companies"}
                {query ? ` matching “${query}”` : " in your register"}
              </p>
              <span>Current prices in PLN/kg</span>
            </div>
            <div className="table-wrap">
              <table className="company-table">
                <caption className="sr-only">
                  Companies with contact details and current material prices
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      aria-sort={
                        sort === "name-asc"
                          ? "ascending"
                          : sort === "name-desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        onClick={() =>
                          setFilter(
                            "sort",
                            sort === "name-asc" ? "name-desc" : "name-asc",
                          )
                        }
                      >
                        Company
                        <Icon name="chevron" className="sort-arrow" />
                      </button>
                    </th>
                    <th scope="col">Phone number</th>
                    <th
                      scope="col"
                      aria-sort={
                        sort === "contact-asc"
                          ? "ascending"
                          : sort === "contact-desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        onClick={() =>
                          setFilter(
                            "sort",
                            sort === "contact-asc"
                              ? "contact-desc"
                              : "contact-asc",
                          )
                        }
                      >
                        Contact date
                        <Icon name="chevron" className="sort-arrow" />
                      </button>
                    </th>
                    <th scope="col" className="price-column">
                      FOD colorless
                    </th>
                    <th scope="col" className="price-column">
                      FOD color
                    </th>
                    <th scope="col">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <Link
                          className="company-title"
                          to={`/contractors/${record._id}`}
                        >
                          {record.name}
                        </Link>
                        <span className="secondary-text">NIP {record.nip}</span>
                      </td>
                      <td>
                        <a
                          className="phone-link"
                          href={`tel:${record.phone.replace(/[^+\d]/g, "")}`}
                        >
                          {record.phone}
                        </a>
                      </td>
                      <td className="date-cell">
                        {formatContactDate(record.contactDate)}
                      </td>
                      <td className="numeric price-column">
                        {formatPrice(record.priceColorless)}
                      </td>
                      <td className="numeric price-column">
                        {formatPrice(record.priceColor)}
                      </td>
                      <td>
                        <Link
                          className="view-link"
                          to={`/contractors/${record._id}`}
                          aria-label={`View ${record.name}`}
                        >
                          <Icon name="arrow" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CompanyCards records={filtered} />
          </>
        ) : (
          <Loading />
        )}
      </section>
      <p className="list-footnote">
        Contact dates and prices reflect the values saved in each company
        record.
      </p>
    </>
  );
}

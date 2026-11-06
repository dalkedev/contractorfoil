import { Link } from "react-router-dom";
import { Brand, Icon } from "../components/ui";
import { useSession } from "../context/Session";
export default function NotFoundPage() {
  const { user } = useSession();
  return (
    <main className="not-found">
      <Brand to={user ? "/dashboard" : "/"} />
      <h1>Page not found</h1>
      <p>This address does not lead to a page in ContractorFoil.</p>
      <Link className="button primary" to={user ? "/contractors" : "/"}>
        <Icon name="back" />
        {user ? "Back to companies" : "Back to home"}
      </Link>
    </main>
  );
}

import { Link } from 'react-router';

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center rounded-md" aria-label="Gatherly home">
      <img src="/images/brand/logo.webp" alt="Gatherly" className="h-8 w-auto" />
    </Link>
  );
}

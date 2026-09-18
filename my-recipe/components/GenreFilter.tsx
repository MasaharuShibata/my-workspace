import Link from "next/link";
import { GENRES } from "@/lib/types";

export default function GenreFilter({ selected }: { selected: string | null }) {
  return (
    <div className="genre-filter">
      <Link href="/favorites" className={selected === null ? "is-active" : ""}>
        すべて
      </Link>
      {GENRES.map((g) => (
        <Link
          key={g}
          href={`/favorites?genre=${encodeURIComponent(g)}`}
          className={selected === g ? "is-active" : ""}
        >
          {g}
        </Link>
      ))}
    </div>
  );
}

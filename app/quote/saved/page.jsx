import Link from "next/link";
import SavedLists from "@/components/SavedLists";

export const metadata = {
  title: "Saved request lists",
  description:
    "Request lists saved in this browser. Restore a standing list of vessel spares, share it as a link, or delete it. No account required.",
};

export default function SavedListsPage() {
  return (
    <>
      <nav className="border-b border-primary/10 bg-surface">
        <ol className="mx-auto flex max-w-shell flex-wrap items-center gap-2 px-6 py-3 text-[12px] text-ink/70">
          <li>
            <Link href="/" className="hover:text-secondary-ink">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/quote" className="hover:text-secondary-ink">
              Quote request
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-primary">Saved lists</li>
        </ol>
      </nav>
      <SavedLists />
    </>
  );
}

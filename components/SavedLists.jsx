"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { Eyebrow, PartNumber } from "./Bits";
import {
  buildShareUrl,
  deleteSavedList,
  formatSavedDate,
  loadSavedLists,
} from "@/lib/share";

/**
 * Lists saved in this browser. The BRD deferred accounts; this gives a vessel
 * most of what an account was for — a standing list it can restore next time —
 * without a login, and without us holding anyone's data.
 */
export default function SavedLists() {
  const { applyLines, lines, setNote } = useRfq();
  const [lists, setLists] = useState(null);
  const [open, setOpen] = useState(null);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    setLists(loadSavedLists());
  }, []);

  function restore(list, mode) {
    applyLines(list.lines, mode);
    if (list.note) setNote(list.note);
    setPending(null);
    setMessage(
      mode === "replace"
        ? `“${list.name}” is now your request — ${list.lines.length} lines.`
        : `“${list.name}” merged into your request.`
    );
  }

  function onRestore(list) {
    if (lines.length === 0) restore(list, "replace");
    else setPending(list);
  }

  function onDelete(key) {
    setLists(deleteSavedList(key));
    setConfirmDelete(null);
    setMessage("List deleted.");
  }

  function copyLink(list) {
    const url = buildShareUrl(window.location.origin, list.lines, list.note || "");
    navigator.clipboard?.writeText(url);
    setCopied(list.key);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-12">
      <div className="max-w-2xl">
        <Eyebrow>Saved lists</Eyebrow>
        <h1 className="h-display mt-3 text-[30px] text-primary md:text-[40px]">
          Lists saved on this device
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
          Saved in this browser, not on our servers. Clearing site data removes them — for anything
          you need to keep, use the shareable link or the downloadable list file, both of which
          survive a new machine.
        </p>
      </div>

      {message && (
        <p className="mt-8 border border-secondary-ink/40 bg-surface p-4 text-[13px] text-ink/80">
          <span aria-hidden className="data mr-2 font-semibold text-secondary-ink">
            ✓
          </span>
          {message}{" "}
          <Link href="/quote" className="font-semibold text-secondary-ink hover:underline">
            Go to your request →
          </Link>
        </p>
      )}

      {pending && (
        <div className="mt-8 border border-accent bg-accent/[0.07] p-5">
          <p className="text-[14px] font-semibold text-primary">
            You already have {lines.length} line{lines.length === 1 ? "" : "s"} in your request.
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
            Restoring “{pending.name}” can add to what you have, or take its place.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => restore(pending, "merge")}
              className="bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
            >
              Merge into my request
            </button>
            <button
              type="button"
              onClick={() => restore(pending, "replace")}
              className="border border-primary/25 px-4 py-2 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
            >
              Replace my request
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-2 text-[13px] text-ink/70 hover:text-accent-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {lists === null ? (
        <p className="mt-10 text-[14px] text-ink/70">Reading saved lists…</p>
      ) : lists.length === 0 ? (
        <div className="mt-10 border border-primary/12 bg-surface p-10 text-center">
          <p className="h-display text-[19px] text-primary">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink/75">
            Build a request, then use “Save this list” on the request page. Useful for a standing
            list of consumables a vessel reorders every drydock.
          </p>
          <Link
            href="/quote"
            className="mt-5 inline-block bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
          >
            Build a request
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {lists.map((list) => {
            const units = list.lines.reduce((n, l) => n + (l.qty || 1), 0);
            const expanded = open === list.key;
            return (
              <li key={list.key} className="border border-primary/12 bg-base">
                <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <h2 className="h-display text-[18px] leading-tight text-primary">{list.name}</h2>
                    <p className="data mt-1.5 text-[12px] text-ink/70">
                      {formatSavedDate(list.savedAt)} · {list.lines.length} line
                      {list.lines.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
                    </p>
                    {list.note && (
                      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/75">
                        {list.note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(list)}
                      className="border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-base hover:text-accent-ink"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => copyLink(list)}
                      className="border border-primary/20 px-4 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink"
                    >
                      {copied === list.key ? "Link copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : list.key)}
                      aria-expanded={expanded}
                      className="border border-primary/20 px-4 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink"
                    >
                      {expanded ? "Hide lines" : "View lines"}
                    </button>
                    {confirmDelete === list.key ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onDelete(list.key)}
                          className="border border-accent-ink px-3 py-2 text-[13px] font-semibold text-accent-ink hover:bg-accent/10"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 text-[13px] text-ink/70 hover:text-primary"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(list.key)}
                        className="px-3 py-2 text-[13px] font-semibold text-ink/70 hover:text-accent-ink"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <ul className="divide-y divide-primary/8 border-t border-primary/10">
                    {list.lines.map((l) => (
                      <li key={l.id} className="flex items-center gap-4 px-5 py-2.5">
                        {l.freeText ? (
                          <span className="data w-36 shrink-0 truncate border border-accent/40 bg-accent/[0.07] px-1.5 py-0.5 text-[11px] text-primary">
                            {l.partNumber}
                          </span>
                        ) : (
                          <span className="w-36 shrink-0">
                            <PartNumber value={l.partNumber} size="xs" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink/75">
                          {l.name}
                        </span>
                        <span className="data shrink-0 text-[12px] text-ink/70">× {l.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 text-[12px] leading-relaxed text-ink/70">
        Demonstration build. In production a reorder link is included in every quotation email, so a
        vessel can repeat an order without rebuilding the list — see the confirmation screen after
        sending a request.
      </p>
    </div>
  );
}

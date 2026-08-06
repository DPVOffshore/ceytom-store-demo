"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "./Bits";
import { basketToFile, buildShareUrl, fileToBasket, saveList, URL_LIMIT } from "@/lib/share";

function download(filename, contents) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Share and save, without accounts.
 *
 * The list travels in the URL **hash**, so it is never sent to a server — a
 * vessel's parts list is commercially sensitive and there is no reason for it to
 * land in anyone's access log. Long lists outgrow what an email client will keep
 * intact, so past ~2000 characters we say so plainly and hand over a file instead.
 */
export default function ShareTools({ lines, note, setNote, onImport }) {
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef(null);

  // the basket changed under us — an old link would be misleading
  useEffect(() => {
    setLink(null);
    setCopied(false);
    setSaved(null);
  }, [lines, note]);

  const empty = lines.length === 0;

  function makeLink() {
    setLink(buildShareUrl(window.location.origin, lines, note));
    setCopied(false);
  }

  function copy() {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function save(e) {
    e.preventDefault();
    const entry = saveList(name || `Request list ${new Date().toLocaleDateString("en-GB")}`, lines, note);
    setSaved(entry ? entry.name : null);
    if (entry) setName("");
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = fileToBasket(String(reader.result || ""));
      if (!parsed) {
        setImportError("That file is not a Ceytom request list.");
        return;
      }
      setImportError("");
      onImport(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const tooLong = link != null && link.length > URL_LIMIT;

  return (
    <section className="border border-primary/12 bg-base">
      <div className="border-b border-primary/10 bg-surface px-6 py-4">
        <Eyebrow>Keep this list</Eyebrow>
        <h2 className="h-display mt-2 text-[20px] text-primary">Share, save or reorder</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink/75">
          No account needed. A shared link carries the list in the address itself — nothing is sent
          to a server, so it is safe to forward to the chief engineer or the office.
        </p>
      </div>

      <div className="space-y-6 p-6">
        {/* ── share ── */}
        <div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={makeLink}
              disabled={empty}
              className="border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink disabled:cursor-not-allowed disabled:border-primary/12 disabled:text-ink/70"
            >
              Share this list
            </button>
            <button
              type="button"
              onClick={() => download("ceytom-request-list.json", basketToFile(lines, note))}
              disabled={empty}
              className="border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink disabled:cursor-not-allowed disabled:border-primary/12 disabled:text-ink/70"
            >
              Download as file
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-[13px] font-semibold text-secondary-ink hover:underline"
            >
              Import a list file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={onFile}
              className="hidden"
            />
          </div>

          {importError && <p className="mt-2 text-[13px] text-accent-ink">{importError}</p>}

          {link && (
            <div className="mt-4">
              {tooLong ? (
                <div className="border border-accent/30 bg-accent/[0.05] p-4">
                  <p className="text-[13px] font-semibold text-primary">
                    This list is too long for a link.
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
                    At {lines.length} lines the address runs to {link.length} characters, and mail
                    clients and ticketing systems truncate anything past about {URL_LIMIT}. Use the
                    file instead — it imports back into this page with the button above.
                  </p>
                  <button
                    type="button"
                    onClick={() => download("ceytom-request-list.json", basketToFile(lines, note))}
                    className="mt-3 bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
                  >
                    Download the list file
                  </button>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="text-[12px] text-ink/75">
                      Copyable link · {link.length} characters
                    </span>
                    <div className="mt-1.5 flex">
                      <input
                        readOnly
                        value={link}
                        onFocus={(e) => e.target.select()}
                        aria-label="Shareable link to this list"
                        className="data min-w-0 flex-1 border border-primary/15 bg-surface px-3 py-2 text-[12px] text-primary focus:border-secondary-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={copy}
                        className="shrink-0 bg-primary-soft px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-secondary-ink"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </label>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink/70">
                    Opening this link restores the {lines.length} line
                    {lines.length === 1 ? "" : "s"} on any device. If the recipient already has a
                    list, they are asked whether to merge or replace.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── save ── */}
        <form onSubmit={save} className="border-t border-primary/10 pt-6">
          <label className="block">
            <span className="text-[13px] font-medium text-primary">Save this list on this device</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-ink/70">
              Stored in this browser only. Useful for a standing list of consumables a vessel
              reorders every drydock.
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MV Example — bridge panel spares"
                aria-label="Name for this saved list"
                className="min-w-[200px] flex-1 border border-primary/15 bg-base px-3.5 py-2.5 text-[14px] text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none"
              />
              <button
                type="submit"
                disabled={empty}
                className="shrink-0 border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink disabled:cursor-not-allowed disabled:border-primary/12 disabled:text-ink/70"
              >
                Save list
              </button>
            </div>
          </label>
          {saved && (
            <p className="mt-2 text-[13px] text-secondary-ink">
              Saved as “{saved}”.{" "}
              <Link href="/quote/saved" className="font-semibold hover:underline">
                View saved lists →
              </Link>
            </p>
          )}
          {!saved && (
            <p className="mt-2 text-[12px] text-ink/70">
              <Link href="/quote/saved" className="font-semibold text-secondary-ink hover:underline">
                View saved lists →
              </Link>
            </p>
          )}
        </form>

        {/* ── note that travels with the list ── */}
        <div className="border-t border-primary/10 pt-6">
          <label className="block">
            <span className="text-[13px] font-medium text-primary">Note attached to the list</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-ink/70">
              Travels with a shared link and a saved list — panel reference, drawing number, who
              asked for it.
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Main switchboard MSB-2, drawing E-114 rev C"
              aria-label="Note attached to this list"
              className="mt-2 w-full border border-primary/15 bg-base px-3.5 py-2.5 text-[14px] text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

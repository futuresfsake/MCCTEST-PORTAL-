import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StaleChecklistError,
  getRequirementDetail,
  updateRequirement,
  type DocumentFlags,
  type HistoryEntry,
  type RequirementDetail,
} from '../../../../api/requirements.api';
import { DOCUMENT_KEYS, DOCUMENT_LABELS } from './documents';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

/** Groups history (already newest first) by local calendar day. */
function groupByDay(entries: HistoryEntry[]) {
  const days: { key: string; label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const date = new Date(entry.changedAt);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      days.push({
        key,
        label: date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
        entries: [entry],
      });
    }
  }
  return days;
}

/** The distinct remarks saved on a day, newest first, with who and when. */
function uniqueRemarks(entries: HistoryEntry[]) {
  const seen = new Set<string>();
  const out: { text: string; by: string | null; at: string }[] = [];
  for (const entry of entries) {
    const text = entry.remarks?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push({ text, by: entry.changedBy, at: entry.changedAt });
  }
  return out;
}

type Props = {
  enrollmentId: string;
  onClose: () => void;
  /** Called after a successful save so the list can refresh. */
  onSaved: () => void;
};

export function RequirementChecklistPanel({ enrollmentId, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentFlags | null>(null);
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  // History dates the user has opened. Every date starts closed.
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const historyDays = useMemo(() => groupByDay(history), [history]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStale(false);
    try {
      const result = await getRequirementDetail(enrollmentId);
      setDetail(result);
      setDocuments(result.checklist.documents);
      setRemarks('');
      setHistory(result.history.data);
      setNextCursor(result.history.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadMoreHistory = async () => {
    if (!nextCursor) return;
    try {
      const more = await getRequirementDetail(enrollmentId, nextCursor);
      setHistory((current) => [...current, ...more.history.data]);
      setNextCursor(more.history.nextCursor);
    } catch (moreError) {
      setError(moreError instanceof Error ? moreError.message : 'Failed to load history');
    }
  };

  const save = async () => {
    if (!detail || !documents) return;
    setSaving(true);
    setError(null);
    try {
      await updateRequirement(enrollmentId, {
        bcNsoPsaCopy: documents.bc_nso_psa_copy,
        diplomaTor: documents.diploma_tor,
        brgyClearance: documents.brgy_clearance,
        oneByOnePic: documents.one_by_one_pic,
        twoByTwoPic: documents.two_by_two_pic,
        passportSize: documents.passport_size,
        commitmentFee: documents.commitment_fee,
        // An empty box leaves the saved remark unchanged.
        remarks: remarks.trim() || undefined,
        expectedCheckedAt: detail.checklist.checkedAt,
      });
      onSaved();
      await load();
    } catch (saveError) {
      if (saveError instanceof StaleChecklistError) setStale(true);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    !!detail &&
    !!documents &&
    (DOCUMENT_KEYS.some((key) => documents[key] !== detail.checklist.documents[key]) ||
      remarks.trim() !== '');
  const submitted = documents ? DOCUMENT_KEYS.filter((key) => documents[key]).length : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Requirements checklist">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Requirements</p>
            <p className="text-lg font-bold text-slate-900">{detail?.traineeName ?? 'Loading…'}</p>
            {detail ? (
              <p className="mt-1 text-xs text-slate-500">
                {detail.program} · {detail.batch} · {detail.idCardNumber ?? 'No ID card'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {loading ? <p className="text-sm text-slate-500">Loading checklist…</p> : null}

          {error ? (
            <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {stale ? (
                <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">
                  Reload latest
                </button>
              ) : null}
            </div>
          ) : null}

          {documents && detail ? (
            <>
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
                  <span className="text-xs font-medium text-slate-500">{submitted} / {DOCUMENT_KEYS.length} submitted</span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200">
                  {DOCUMENT_KEYS.map((key) => (
                    <label key={key} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={documents[key]}
                        onChange={(event) => setDocuments({ ...documents, [key]: event.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className="flex-1">{DOCUMENT_LABELS[key]}</span>
                      {!documents[key] ? (
                        <span className="bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Missing</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <label htmlFor="requirement-remarks" className="mb-2 block text-sm font-semibold text-slate-900">
                  Add a remark
                </label>
                <textarea
                  id="requirement-remarks"
                  value={remarks}
                  maxLength={2000}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-900"
                />
                {detail.checklist.remarks ? (
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-semibold">Latest remark:</span> {detail.checklist.remarks}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Last checked by {detail.checklist.checkedBy ?? '—'} on {formatDateTime(detail.checklist.checkedAt)}
                </p>
              </section>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!dirty || saving}
                  className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={onClose} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Close
                </button>
              </div>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">History</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500">No changes recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200">
                    {historyDays.map((day) => {
                      const isOpen = openDays[day.key] ?? false;
                      const dayRemarks = uniqueRemarks(day.entries);
                      const completed = day.entries.filter((entry) => entry.newValue).length;
                      return (
                        <div key={day.key}>
                          <button
                            type="button"
                            onClick={() => setOpenDays({ ...openDays, [day.key]: !isOpen })}
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                          >
                            <span className="font-medium text-slate-900">{day.label}</span>
                            <span className="flex items-center gap-2 text-xs text-slate-500">
                              {completed} completed
                              {day.entries.length > completed ? `, ${day.entries.length - completed} unchecked` : ''}
                              <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="bg-slate-50/60">
                              <div className="border-b border-slate-100 px-4 py-2.5 text-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
                                {dayRemarks.length === 0 ? (
                                  <p className="mt-0.5 text-slate-500">No remarks.</p>
                                ) : (
                                  dayRemarks.map((remark) => (
                                    <p key={remark.text} className="mt-0.5 text-slate-800">
                                      {remark.text}
                                      <span className="block text-xs text-slate-500">
                                        by {remark.by ?? 'Unknown'}, {formatTime(remark.at)}
                                      </span>
                                    </p>
                                  ))
                                )}
                              </div>
                              <p className="px-4 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Logs</p>
                              <ul className="divide-y divide-slate-50">
                              {day.entries.map((entry) => (
                                <li key={entry.id} className="px-4 py-2.5 text-sm text-slate-700">
                                  <span className="font-medium text-slate-900">
                                    {DOCUMENT_LABELS[entry.document] ?? entry.document}
                                  </span>
                                  : {entry.oldValue ? 'Submitted' : 'Missing'} → {entry.newValue ? 'Submitted' : 'Missing'}
                                  <span className="block text-xs text-slate-500">
                                    by {entry.changedBy ?? 'Unknown'}, {formatTime(entry.changedAt)}
                                  </span>
                                </li>
                              ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
                {nextCursor ? (
                  <button type="button" onClick={() => void loadMoreHistory()} className="mt-3 text-sm font-semibold text-blue-900 underline">
                    Load more
                  </button>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

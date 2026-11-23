import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../../../components/layout/Header";
import Sidebar from "../../../../components/layout/Sidebar";
import Footer from "../../../../components/layout/Footer";
import {
  trainerApi,
  type AttendanceDetail,
  type AttendanceEntry,
  type AttendanceStatus,
} from "../../../../api/users/trainer.api";

const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const today = new Date().toISOString().slice(0, 10);

export default function TrainerAttendancePage() {
  const [batches, setBatches] = useState<
    Awaited<ReturnType<typeof trainerApi.attendanceBatches>>
  >([]);
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(today);
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [hours, setHours] = useState(0);
  const [sessions, setSessions] = useState<
    Awaited<ReturnType<typeof trainerApi.attendanceSessions>>
  >([]);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof trainerApi.attendanceSummary>
  > | null>(null);
  const [reason, setReason] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(
    async (id = batchId, selectedDate = date) => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [nextDetail, nextSessions, nextSummary] = await Promise.all([
          trainerApi.attendanceSession(id, selectedDate),
          trainerApi.attendanceSessions(id),
          trainerApi.attendanceSummary(id),
        ]);
        setDetail(nextDetail);
        setEntries(nextDetail.entries);
        setHours(nextDetail.session?.hours ?? nextDetail.suggestedHours);
        setSessions(nextSessions);
        setSummary(nextSummary);
        setReason("");
      } catch (reasonValue) {
        setError(
          reasonValue instanceof Error
            ? reasonValue.message
            : "Unable to load attendance.",
        );
      } finally {
        setLoading(false);
      }
    },
    [batchId, date],
  );

  useEffect(() => {
    trainerApi
      .attendanceBatches()
      .then((items) => {
        setBatches(items);
        if (items[0]) {
          setBatchId(items[0].id);
          void loadSession(items[0].id, today);
        } else {
          setLoading(false);
        }
      })
      .catch((reasonValue) => {
        setError(
          reasonValue instanceof Error
            ? reasonValue.message
            : "Unable to load batches.",
        );
        setLoading(false);
      });
    // The initial batch load intentionally runs once; later changes call loadSession directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () =>
      entries.reduce(
        (result, entry) => {
          if (entry.status) result[entry.status] += 1;
          return result;
        },
        { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
      ),
    [entries],
  );

  const setAllPresent = () =>
    setEntries((current) =>
      current.map((entry) =>
        entry.readOnly ? entry : { ...entry, status: "PRESENT" },
      ),
    );
  const updateEntry = (
    enrollmentId: string,
    update: Partial<AttendanceEntry>,
  ) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.enrollmentId === enrollmentId ? { ...entry, ...update } : entry,
      ),
    );
  };

  const save = async () => {
    if (!detail || entries.some((entry) => !entry.status)) {
      setError("Every enrolled trainee must have a status before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await trainerApi.saveAttendance(batchId, {
        sessionDate: date,
        hours,
        entries: entries.map((entry) => ({
          enrollmentId: entry.enrollmentId,
          status: entry.status,
          remark: entry.remark || undefined,
        })),
        reason: reason || undefined,
        expectedUpdatedAt: detail.session?.updatedAt,
      });
      setMessage(
        `Attendance saved at ${new Date(result.updatedAt).toLocaleTimeString()}.`,
      );
      await loadSession();
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Unable to save attendance.",
      );
    } finally {
      setSaving(false);
    }
  };

  const printSheet = () => window.print();
  const exportAttendance = async () => {
    try {
      const blob = await trainerApi.downloadAttendanceExport(
        batchId,
        exportFrom || undefined,
        exportTo || undefined,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${batchId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Unable to export attendance.",
      );
    }
  };
  const selectedBatch = batches.find((batch) => batch.id === batchId);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <style>{`@media print { header, aside, footer, button, input, select { display: none !important; } main { width: 100% !important; background: white !important; } section { break-inside: avoid; box-shadow: none !important; } }`}</style>
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainer" />
        <main className="min-w-0 flex-1 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Trainer Portal
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">
                  Attendance
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Record training attendance and hours for your ongoing batches.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printSheet}
                  className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Print sheet
                </button>
                {batchId && (
                  <button
                    type="button"
                    onClick={() => void exportAttendance()}
                    className="border border-blue-900 bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>
            {error && (
              <div className="mb-5 border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-5 border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700">
                {message}
              </div>
            )}
            {!batches.length && !loading ? (
              <div className="border border-slate-200 bg-white p-8 text-sm text-slate-500">
                No ongoing batches are assigned to you.
              </div>
            ) : (
              <div className="space-y-6">
                <section className="border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-[1fr_180px_140px] md:items-end">
                    <label className="text-sm font-medium text-slate-700">
                      Batch
                      <select
                        value={batchId}
                        onChange={(event) => {
                          setBatchId(event.target.value);
                          void loadSession(event.target.value, date);
                        }}
                        className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      >
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} — {batch.programName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Session date
                      <input
                        type="date"
                        value={date}
                        max={today}
                        min={selectedBatch?.startDate}
                        onChange={(event) => {
                          setDate(event.target.value);
                          void loadSession(batchId, event.target.value);
                        }}
                        className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Hours
                      <input
                        type="number"
                        min="0.01"
                        max="24"
                        step="0.25"
                        value={hours}
                        onChange={(event) =>
                          setHours(Number(event.target.value))
                        }
                        className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {detail?.scheduled
                      ? "Scheduled class day"
                      : "Extra session day"}{" "}
                    · Default hours come from the program schedule.
                  </p>
                  <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Export from
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(event) => setExportFrom(event.target.value)}
                        className="mt-1 block w-full border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Export to
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(event) => setExportTo(event.target.value)}
                        className="mt-1 block w-full border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"
                      />
                    </label>
                  </div>
                </section>
                {loading ? (
                  <p className="text-sm text-slate-500">
                    Loading attendance...
                  </p>
                ) : (
                  detail && (
                    <section className="border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                        <div>
                          <h2 className="text-lg font-bold text-slate-950">
                            {selectedBatch?.name}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {selectedBatch?.programName} · {date}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={setAllPresent}
                          className="border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900"
                        >
                          Mark all present
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-5 sm:grid-cols-4">
                        {statuses.map((status) => (
                          <div key={status} className="bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wider text-slate-500">
                              {status}
                            </p>
                            <p className="mt-1 text-xl font-bold text-slate-900">
                              {counts[status]}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3">Trainee</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Remark</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {entries.map((entry) => (
                              <tr key={entry.enrollmentId}>
                                <td className="px-5 py-3 font-medium text-slate-800">
                                  {entry.traineeName}
                                  {entry.readOnly && (
                                    <span className="ml-2 text-xs text-slate-400">
                                      (read-only)
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <select
                                    disabled={entry.readOnly}
                                    value={entry.status ?? ""}
                                    onChange={(event) =>
                                      updateEntry(entry.enrollmentId, {
                                        status: event.target
                                          .value as AttendanceStatus,
                                      })
                                    }
                                    className="border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                                  >
                                    <option value="" disabled>
                                      Select status
                                    </option>
                                    {statuses.map((status) => (
                                      <option key={status}>{status}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-5 py-3">
                                  <input
                                    disabled={entry.readOnly}
                                    value={entry.remark}
                                    onChange={(event) =>
                                      updateEntry(entry.enrollmentId, {
                                        remark: event.target.value,
                                      })
                                    }
                                    maxLength={500}
                                    className="w-full border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                                    placeholder="Optional"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {date < today && (
                        <div className="border-t border-slate-200 p-5">
                          <label className="text-sm font-medium text-slate-700">
                            Reason for changing a past session
                            <input
                              value={reason}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                              className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm"
                              placeholder="Required for past dates"
                            />
                          </label>
                        </div>
                      )}
                      <div className="flex justify-end border-t border-slate-200 p-5">
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={saving}
                          className="border border-blue-900 bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save attendance"}
                        </button>
                      </div>
                    </section>
                  )
                )}
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-950">
                      Session list
                    </h2>
                    {sessions.length ? (
                      <div className="space-y-2">
                        {sessions.map((session) => (
                          <button
                            type="button"
                            key={session.id}
                            onClick={() => {
                              setDate(session.date);
                              void loadSession(batchId, session.date);
                            }}
                            className="flex w-full items-center justify-between border-b border-slate-100 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span>
                              {session.date}{" "}
                              {!session.scheduled && (
                                <span className="text-xs text-amber-700">
                                  extra
                                </span>
                              )}
                            </span>
                            <span className="text-slate-500">
                              {session.hours}h · {session.counts.PRESENT}{" "}
                              present
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No saved sessions yet.
                      </p>
                    )}
                  </section>
                  <section className="border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-bold text-slate-950">
                      Trainee summary
                    </h2>
                    {summary?.trainees.length ? (
                      <div className="space-y-3">
                        {summary.trainees.map((trainee) => (
                          <div
                            key={trainee.traineeName}
                            className="border-b border-slate-100 pb-3"
                          >
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="font-medium">
                                {trainee.traineeName}
                              </span>
                              <span>
                                {trainee.hoursCompleted.toFixed(2)}h{" "}
                                {trainee.percentage === null
                                  ? ""
                                  : `(${trainee.percentage.toFixed(1)}%)`}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              P {trainee.counts.PRESENT} · A{" "}
                              {trainee.counts.ABSENT} · L {trainee.counts.LATE}{" "}
                              · E {trainee.counts.EXCUSED}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No trainee summary available.
                      </p>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

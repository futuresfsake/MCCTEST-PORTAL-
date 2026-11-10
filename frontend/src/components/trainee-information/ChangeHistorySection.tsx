import React, { useEffect, useState } from 'react';
import { getTraineeChangeHistory, isRequestCancelled, requestErrorMessage } from '../../api/trainee-information.api';
import type { ChangeHistoryEntry, ChangeHistoryPlace, ChangeHistoryType, TraineeInformationRole } from '../../types/trainee-information.type';

const TYPE_LABELS: Record<ChangeHistoryType, string> = {
  BATCH_CHANGE: 'Batch Change',
  PROGRAM_CHANGE: 'Program Change',
};

const Place: React.FC<{ place: ChangeHistoryPlace }> = ({ place }) => (
  <>
    <span className="block font-medium text-slate-900">{place.programName}</span>
    <span className="block text-slate-500">{place.batchName}</span>
  </>
);

interface ChangeHistorySectionProps {
  role: TraineeInformationRole;
  traineeId: string;
  /** Changes when the profile reloads after a save. */
  reloadKey: number;
}

/** Read-only list of a trainee's batch and program changes, newest first. */
const ChangeHistorySection: React.FC<ChangeHistorySectionProps> = ({ role, traineeId, reloadKey }) => {
  const [entries, setEntries] = useState<ChangeHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getTraineeChangeHistory(role, traineeId, controller.signal)
      .then(setEntries)
      .catch((err: unknown) => {
        if (isRequestCancelled(err)) return;
        setError(requestErrorMessage(err, 'Failed to load the change history.'));
      });
    return () => controller.abort();
  }, [role, traineeId, reloadKey]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Change History</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {error && <p className="p-5 text-sm text-red-700">{error}</p>}
        {!error && !entries && <p className="p-5 text-sm text-slate-500">Loading the change history...</p>}
        {!error && entries?.length === 0 && <p className="p-5 text-sm text-slate-500">No batch or program changes on record.</p>}
        {!error && entries && entries.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Date and Time</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">From</th>
                <th scope="col" className="px-4 py-3">To</th>
                <th scope="col" className="px-4 py-3">Reason</th>
                <th scope="col" className="px-4 py-3">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{TYPE_LABELS[entry.type]}</td>
                  <td className="px-4 py-3"><Place place={entry.from} /></td>
                  <td className="px-4 py-3"><Place place={entry.to} /></td>
                  <td className="min-w-[16rem] whitespace-pre-wrap px-4 py-3 text-slate-700">{entry.reason}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{entry.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default ChangeHistorySection;

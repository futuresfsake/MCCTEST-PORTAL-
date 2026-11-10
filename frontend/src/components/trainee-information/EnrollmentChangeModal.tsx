import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  changeBatch,
  changeProgram,
  getChangeOptions,
  isRequestCancelled,
  requestErrorMessage,
} from '../../api/trainee-information.api';
import { PAYMENT_METHODS, UNIFORM_SIZES } from '../../types/trainee-information.type';
import type { ChangeBatchOption, ChangeOptions, ChangeProgramPayload, PaymentMethod, UniformSize } from '../../types/trainee-information.type';
import { enumLabel, formatDateOnly, formatTime } from './format';
import ProfileModal, { FormField, inputClass, primaryButtonClass, secondaryButtonClass } from './ProfileModal';

type ChangeType = 'batch' | 'program';
type PaymentChoice = 'carry' | 'new';

function batchLabel(batch: ChangeBatchOption): string {
  const slots = `${batch.remainingSlots} ${batch.remainingSlots === 1 ? 'slot' : 'slots'} left`;
  return `${batch.name} · ${formatDateOnly(batch.startDate)} – ${formatDateOnly(batch.endDate)} · ${slots}`;
}

const BatchSchedule: React.FC<{ batch: ChangeBatchOption }> = ({ batch }) => (
  <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
    {batch.schedules.length === 0 && <li>No schedule on record.</li>}
    {batch.schedules.map((schedule) => (
      <li key={`${schedule.name}-${schedule.startTime}`}>
        {schedule.name}: {schedule.days.map(enumLabel).join(', ')} · {formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}
      </li>
    ))}
  </ul>
);

const SummaryRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{children}</dd>
  </div>
);

interface EnrollmentChangeModalProps {
  enrollmentId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Moves an enrollment to another batch or program, after a "From → To" confirmation. */
const EnrollmentChangeModal: React.FC<EnrollmentChangeModalProps> = ({ enrollmentId, onClose, onSaved }) => {
  const [options, setOptions] = useState<ChangeOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [changeType, setChangeType] = useState<ChangeType>('batch');
  const [programId, setProgramId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('carry');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [uniformGiven, setUniformGiven] = useState(false);
  const [uniformSize, setUniformSize] = useState<UniformSize | ''>('');

  useEffect(() => {
    const controller = new AbortController();
    getChangeOptions(enrollmentId, controller.signal)
      .then((loaded) => {
        setOptions(loaded);
        setUniformSize(loaded.enrollment.uniformSize ?? '');
      })
      .catch((err: unknown) => {
        if (isRequestCancelled(err)) return;
        setLoadError(requestErrorMessage(err, 'Failed to load the available batches.'));
      });
    return () => controller.abort();
  }, [enrollmentId]);

  const programs = useMemo(() => {
    const byId = new Map<string, string>();
    options?.otherProgramBatches.forEach((batch) => byId.set(batch.programId, batch.programName));
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const batchChoices =
    changeType === 'batch'
      ? (options?.sameProgramBatches ?? [])
      : (options?.otherProgramBatches ?? []).filter((batch) => batch.programId === programId);
  const selectedBatch = batchChoices.find((batch) => batch.id === batchId) ?? null;

  const selectChangeType = (next: ChangeType) => {
    setChangeType(next);
    setProgramId('');
    setBatchId('');
    setError(null);
  };

  const validate = (): string | null => {
    if (!selectedBatch) return 'Select the batch to move to.';
    if (!reason.trim()) return 'A reason is required.';
    if (changeType === 'program') {
      if (paymentChoice === 'new' && !(Number(amount) > 0)) return 'Enter the amount of the new payment.';
      if (uniformGiven && !uniformSize) return 'Select the uniform size to give.';
    }
    return null;
  };

  const handleReview = () => {
    const problem = validate();
    setError(problem);
    if (!problem) setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selectedBatch) return;
    setSaving(true);
    setError(null);
    try {
      if (changeType === 'batch') {
        await changeBatch(enrollmentId, { batchId: selectedBatch.id, reason });
        onSaved(`Moved to ${selectedBatch.name}.`);
        return;
      }

      const payload: ChangeProgramPayload = {
        batchId: selectedBatch.id,
        reason,
        uniformGiven,
        ...(uniformSize ? { uniformSize } : {}),
        ...(paymentChoice === 'new' ? { payment: { processPayment: true as const, amount: Number(amount), paymentMethod } } : {}),
      };
      const result = await changeProgram(enrollmentId, payload);
      onSaved(`Shifted to ${selectedBatch.programName}. New ID card number: ${result.idCardNumber ?? '—'}.`);
    } catch (err: unknown) {
      // Back to the form, so the admin can pick something else.
      setError(requestErrorMessage(err, 'Failed to save the change. Nothing was changed.'));
      setConfirming(false);
      setSaving(false);
    }
  };

  const footer = confirming ? (
    <>
      <button type="button" onClick={() => setConfirming(false)} disabled={saving} className={secondaryButtonClass}>
        Back
      </button>
      <button type="button" onClick={() => void handleConfirm()} disabled={saving} className={primaryButtonClass}>
        {saving ? 'Saving...' : 'Confirm Change'}
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={onClose} className={secondaryButtonClass}>
        Cancel
      </button>
      <button type="button" onClick={handleReview} disabled={!options} className={primaryButtonClass}>
        Review Change
      </button>
    </>
  );

  return (
    <ProfileModal title="Change Batch / Program" busy={saving} onClose={onClose} footer={footer}>
      {loadError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      {!loadError && !options && <p className="py-8 text-center text-sm text-slate-600">Loading the available batches...</p>}

      {options && confirming && selectedBatch && (
        <div className="space-y-5">
          <div className="grid items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto_1fr]">
            <SummaryRow label="From">
              <span className="font-medium">{options.enrollment.programName}</span>
              {'\n'}
              {options.enrollment.batchName}
            </SummaryRow>
            <ArrowRight aria-label="to" className="h-5 w-5 text-blue-900" />
            <SummaryRow label="To">
              <span className="font-medium">{selectedBatch.programName}</span>
              {'\n'}
              {selectedBatch.name}
            </SummaryRow>
          </div>
          <dl className="space-y-3">
            <SummaryRow label="Reason">{reason.trim()}</SummaryRow>
            {changeType === 'batch' ? (
              <p className="text-sm text-slate-600">The ID card number, payment, uniform, documents and attendance stay the same.</p>
            ) : (
              <>
                <SummaryRow label="Payment">
                  {paymentChoice === 'carry' ? 'Carried over, no new OR' : `New payment of ${amount} by ${enumLabel(paymentMethod)}`}
                </SummaryRow>
                <SummaryRow label="Uniform">{uniformGiven ? `Give size ${uniformSize} now (takes 1 from stock)` : 'Not given now'}</SummaryRow>
                <p className="text-sm text-slate-600">
                  The current enrollment becomes Withdrawn. A new enrollment gets a new ID card number and a copy of the requirement checklist.
                </p>
              </>
            )}
          </dl>
        </div>
      )}

      {options && !confirming && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Currently in <span className="font-medium text-slate-900">{options.enrollment.programName}</span>, {options.enrollment.batchName}.
          </p>

          <div role="radiogroup" aria-label="Type of change" className="inline-flex rounded-lg border border-slate-300 p-1">
            {(['batch', 'program'] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={changeType === type}
                onClick={() => selectChangeType(type)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${changeType === type ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-blue-900'}`}
              >
                {type === 'batch' ? 'Change Batch' : 'Change Program'}
              </button>
            ))}
          </div>

          {changeType === 'program' && (
            <FormField label="Program *">
              <select
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setBatchId('');
                }}
                className={inputClass}
              >
                <option value="">{programs.length ? 'Select a program' : 'No other program has an eligible batch'}</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div>
            <FormField label="Batch *">
              <select value={batchId} onChange={(event) => setBatchId(event.target.value)} disabled={changeType === 'program' && !programId} className={inputClass}>
                <option value="">
                  {changeType === 'program' && !programId ? 'Select a program first' : batchChoices.length ? 'Select a batch' : 'No eligible batch'}
                </option>
                {batchChoices.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batchLabel(batch)}
                  </option>
                ))}
              </select>
            </FormField>
            {selectedBatch && <BatchSchedule batch={selectedBatch} />}
          </div>

          <FormField label="Reason *">
            <textarea value={reason} maxLength={500} rows={3} onChange={(event) => setReason(event.target.value)} className={inputClass} />
          </FormField>

          {changeType === 'program' && (
            <>
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-600">Payment</legend>
                <div className="space-y-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="payment" checked={paymentChoice === 'carry'} onChange={() => setPaymentChoice('carry')} />
                    Carry over the current payment (no new OR)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="payment" checked={paymentChoice === 'new'} onChange={() => setPaymentChoice('new')} />
                    Record a new payment
                  </label>
                </div>
                {paymentChoice === 'new' && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <FormField label="Amount *">
                      <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
                    </FormField>
                    <FormField label="Payment Method *">
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className={inputClass}>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {enumLabel(method)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-600">Uniform</legend>
                <div className="grid items-end gap-4 sm:grid-cols-2">
                  <FormField label={uniformGiven ? 'Size *' : 'Size'}>
                    <select value={uniformSize} onChange={(event) => setUniformSize(event.target.value as UniformSize | '')} className={inputClass}>
                      <option value="">Select a size</option>
                      {UNIFORM_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                    <input type="checkbox" checked={uniformGiven} onChange={(event) => setUniformGiven(event.target.checked)} className="h-4 w-4" />
                    Give the new program's uniform now
                  </label>
                </div>
              </fieldset>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </ProfileModal>
  );
};

export default EnrollmentChangeModal;

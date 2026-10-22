import { useEffect, useMemo, useState } from 'react';
import { getPaymentTraineeOptions, createPayment } from '../../api/payments.api';

const reasonOptions = [
  { value: 'PROCESSING_FEE', label: 'Processing Fee', icon: 'fa-solid fa-file-invoice' },
  { value: 'UNIFORM_ID_FEE', label: 'Uniform/ID Fee', icon: 'fa-solid fa-id-card' },
  { value: 'ASSESSMENT_DEPOSIT', label: 'Assessment Deposit', icon: 'fa-solid fa-clipboard-check' },
  { value: 'EXTERNAL_FEES', label: 'External Fees', icon: 'fa-solid fa-arrow-up-right-from-square' },
];

const methodOptions = [
  { value: 'CASH', label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
  { value: 'GCASH', label: 'GCash', icon: 'fa-solid fa-mobile-screen' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'fa-solid fa-building-columns' },
  { value: 'CHECK', label: 'Check', icon: 'fa-solid fa-money-check' },
];

const isValidAmount = (value: string) =>
  /^(?=.*[1-9])\d{1,8}(?:\.\d{1,2})?$/.test(value);

function formatCurrency(value: string | number) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function StepIndicator({ step, current, label }: { step: number; current: number; label: string }) {
  const isActive = current === step;
  const isDone = current > step;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center text-xs font-bold transition ${
        isDone
          ? 'bg-emerald-600 text-white'
          : isActive
            ? 'bg-blue-900 text-white'
            : 'border border-slate-200 bg-slate-50 text-slate-400'
      }`}>
        {isDone ? <i className="fa-solid fa-check text-[10px]" /> : step}
      </div>
      <span className={`hidden text-xs font-semibold sm:block ${isActive ? 'text-slate-900' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function StepConnector() {
  return <div className="hidden h-px w-8 bg-slate-200 sm:block" />;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
      {required ? <span className="ml-0.5 text-red-400">*</span> : null}
    </label>
  );
}

const inputClass = 'w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

export function PaymentFormModal({ role, onClose, onSaved }: { role: 'admin' | 'registrar'; onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState('');
  const [traineeResults, setTraineeResults] = useState<any[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [reason, setReason] = useState('PROCESSING_FEE');
  const [baseFee, setBaseFee] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [traineeSearchLoading, setTraineeSearchLoading] = useState(false);
  const [traineeSearchError, setTraineeSearchError] = useState<string | null>(null);

  const currentStep = !selectedTrainee || !selectedEnrollment ? 1 : (!isValidAmount(baseFee) || !isValidAmount(amount)) ? 2 : 3;

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (selectedTrainee && search === selectedTrainee.label) {
        setTraineeResults([]);
        setTraineeSearchLoading(false);
        setTraineeSearchError(null);
        return;
      }

      if (search.trim().length < 2) {
        setTraineeResults([]);
        setTraineeSearchLoading(false);
        setTraineeSearchError(null);
        return;
      }

      setTraineeSearchLoading(true);
      setTraineeSearchError(null);
      try {
        const results = await getPaymentTraineeOptions(role, search);
        if (!cancelled) setTraineeResults(Array.isArray(results) ? results : []);
      } catch (requestError) {
        if (!cancelled) {
          setTraineeSearchError(requestError instanceof Error ? requestError.message : 'Unable to search trainees');
          setTraineeResults([]);
        }
      } finally {
        if (!cancelled) setTraineeSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, role, selectedTrainee]);

  const enrollmentChoices = useMemo(() => {
    if (!selectedTrainee) return [];
    return selectedTrainee.enrollments ?? [];
  }, [selectedTrainee]);

  const submitDisabled = loading || !selectedTrainee || !selectedEnrollment || !isValidAmount(baseFee) || !isValidAmount(amount);

  async function handleSubmit() {
    if (submitDisabled) return;
    setLoading(true);
    setError(null);

    try {
      await createPayment(role, {
        enrollment_id: selectedEnrollment.id,
        idempotency_key: idempotencyKey,
        reason_of_dues: reason,
        base_fee: baseFee,
        amount,
        payment_method: method,
        payment_date: paymentDate,
        remarks,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Unable to save payment');
    } finally {
      setLoading(false);
    }
  }

  const balance = isValidAmount(baseFee) && isValidAmount(amount)
    ? Number(baseFee) - Number(amount)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Record payment">
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
        <div className="max-h-[94vh] w-full overflow-y-auto border border-slate-200 bg-white shadow-2xl">

          {/* ── Header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-blue-50">
                  <i className="fa-solid fa-file-invoice-dollar text-sm text-blue-900" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800">Record Payment</p>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">Official Receipt</h3>
                </div>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* ── Step indicators ── */}
            <div className="mt-4 flex items-center gap-2">
              <StepIndicator step={1} current={currentStep} label="Trainee" />
              <StepConnector />
              <StepIndicator step={2} current={currentStep} label="Payment" />
              <StepConnector />
              <StepIndicator step={3} current={currentStep} label="Review" />
            </div>
          </div>

          <div className="p-5 sm:p-6">

            {/* ── Section 1: Trainee Selection ── */}
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-2">
                <i className="fa-solid fa-user text-xs text-blue-900" />
                <h4 className="text-sm font-bold text-slate-900">Trainee & Enrollment</h4>
              </div>

              <div className="border border-slate-200 bg-slate-50/50 p-4">
                <FieldLabel required>Search trainee</FieldLabel>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setTraineeResults([]);
                      setSelectedTrainee(null);
                      setSelectedEnrollment(null);
                    }}
                    placeholder="Type a name or system ID..."
                    className={`${inputClass} pl-9`}
                  />
                </div>

                {search.trim().length > 0 && search.trim().length < 2 ? (
                  <p className="mt-2 text-xs text-slate-400">Type at least 2 characters to search.</p>
                ) : null}

                {traineeSearchLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
                    Searching trainees...
                  </div>
                ) : null}

                {traineeSearchError ? (
                  <div className="mt-3 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2">
                    <i className="fa-solid fa-circle-exclamation text-xs text-red-500" />
                    <p className="text-xs text-red-700">{traineeSearchError}</p>
                  </div>
                ) : null}

                {traineeResults.length > 0 ? (
                  <div className="mt-3 max-h-52 overflow-auto border border-slate-200 bg-white">
                    {traineeResults.map((trainee: any) => (
                      <button
                        key={trainee.id}
                        type="button"
                        onClick={() => {
                          setSelectedTrainee(trainee);
                          setSelectedEnrollment(trainee.enrollments?.[0] ?? null);
                          setSearch(trainee.label);
                        }}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center bg-slate-100">
                            <i className="fa-solid fa-user text-[10px] text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{trainee.label}</p>
                            <p className="text-[11px] text-slate-400">{trainee.system_id}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <i className="fa-solid fa-graduation-cap text-[9px]" />
                          {trainee.enrollments?.length ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {!selectedTrainee && !traineeSearchLoading && !traineeSearchError && !traineeResults.length && search.trim().length >= 2 ? (
                  <div className="mt-3 flex items-center gap-2 border border-dashed border-slate-200 bg-white px-4 py-3">
                    <i className="fa-solid fa-user-slash text-xs text-slate-300" />
                    <p className="text-xs text-slate-400">No matching trainee found.</p>
                  </div>
                ) : null}

                {selectedTrainee ? (
                  <div className="mt-4 flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center bg-emerald-100">
                      <i className="fa-solid fa-user-check text-xs text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-900">{selectedTrainee.label}</p>
                      <p className="text-[11px] text-emerald-700">{selectedTrainee.system_id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSelectedTrainee(null);
                        setSelectedEnrollment(null);
                      }}
                      className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                    >
                      Change
                    </button>
                  </div>
                ) : null}

                {selectedTrainee && enrollmentChoices.length === 0 ? (
                  <div className="mt-3 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5">
                    <i className="fa-solid fa-triangle-exclamation text-xs text-amber-600" />
                    <p className="text-xs text-amber-700">This trainee has no enrollment available for a payment.</p>
                  </div>
                ) : null}

                {selectedTrainee && enrollmentChoices.length > 0 ? (
                  <div className="mt-4">
                    <FieldLabel required>Enrollment</FieldLabel>
                    <select
                      value={selectedEnrollment?.id ?? ''}
                      onChange={(e) => setSelectedEnrollment(enrollmentChoices.find((item: any) => item.id === e.target.value) ?? null)}
                      className={inputClass}
                    >
                      <option value="">Select an enrollment</option>
                      {enrollmentChoices.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.program_name ?? item.batch_name ?? item.id}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Section 2: Payment Details ── */}
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-2">
                <i className="fa-solid fa-credit-card text-xs text-blue-900" />
                <h4 className="text-sm font-bold text-slate-900">Payment Details</h4>
              </div>

              <div className="border border-slate-200 bg-slate-50/50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Reason of dues</FieldLabel>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
                      {reasonOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel required>Payment method</FieldLabel>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                      {methodOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel required>Amount due</FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">PHP</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={baseFee}
                        onChange={(e) => setBaseFee(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass} pl-12 text-right tabular-nums`}
                      />
                    </div>
                    {baseFee && !isValidAmount(baseFee) ? (
                      <p className="mt-1 text-[11px] text-red-500">Enter a valid amount greater than zero.</p>
                    ) : null}
                  </div>

                  <div>
                    <FieldLabel required>Amount paid</FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">PHP</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass} pl-12 text-right tabular-nums`}
                      />
                    </div>
                    {amount && !isValidAmount(amount) ? (
                      <p className="mt-1 text-[11px] text-red-500">Enter a valid amount greater than zero.</p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel required>Payment date</FieldLabel>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>Remarks</FieldLabel>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Optional notes about this payment..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Summary ── */}
            {selectedTrainee && selectedEnrollment && isValidAmount(baseFee) && isValidAmount(amount) ? (
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-xs text-blue-900" />
                  <h4 className="text-sm font-bold text-slate-900">Payment Summary</h4>
                </div>

                <div className="border border-blue-200 bg-gradient-to-br from-blue-50/60 to-slate-50 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trainee</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedTrainee.label}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Enrollment</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEnrollment.program_name ?? selectedEnrollment.batch_name ?? selectedEnrollment.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Reason</p>
                      <p className="mt-1 text-sm text-slate-700">{reasonOptions.find(r => r.value === reason)?.label}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Method</p>
                      <p className="mt-1 text-sm text-slate-700">{methodOptions.find(m => m.value === method)?.label}</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-blue-200 pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Due</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(baseFee)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Paid</p>
                            <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(amount)}</p>
                          </div>
                        </div>
                      </div>
                      {balance !== null && balance > 0 ? (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Balance</p>
                          <p className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(balance)}</p>
                        </div>
                      ) : balance !== null && balance < 0 ? (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600">Overpayment</p>
                          <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(Math.abs(balance))}</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">Fully Paid</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-700"><i className="fa-solid fa-circle-check mr-1" />No balance</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Error ── */}
            {error ? (
              <div className="mb-5 flex items-center gap-2.5 border border-red-200 bg-red-50 px-4 py-3">
                <i className="fa-solid fa-circle-exclamation text-sm text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {/* ── Actions ── */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitDisabled}
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs" />
                    Save Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

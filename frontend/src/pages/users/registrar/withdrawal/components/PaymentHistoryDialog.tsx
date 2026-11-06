import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { RegistrarPayment } from '../../../../../types/withdrawal.type'
import { formatDate, formatPeso } from '../../../../../components/withdrawal/withdrawal-pipeline'

const REASON_LABELS: Record<RegistrarPayment['reason'], string> = {
  ENROLLMENT: 'Enrollment fee',
  PROCESSING_FEE: 'Processing fee',
  UNIFORM_ID_FEE: 'Uniform and ID fee',
  ASSESSMENT_DEPOSIT: 'Assessment deposit',
  EXTERNAL_FEES: 'External fees',
}

const METHOD_LABELS: Record<RegistrarPayment['method'], string> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank transfer',
  CHECK: 'Check',
}

type Props = {
  traineeName: string | null
  payments: RegistrarPayment[]
  onClose: () => void
}

/**
 * A pop-up over the side panel with every payment of the trainee's enrollment, so the
 * registrar can judge "finances cleared" without leaving the page. It only
 * reads. Closing it (button, backdrop or Escape) brings the panel back as it was.
 */
export default function PaymentHistoryDialog({ traineeName, payments, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close payment history"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-history-title"
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="payment-history-title" className="text-lg font-bold text-slate-900">
              Payment history
            </h2>
            {traineeName && <p className="truncate text-sm text-slate-500">{traineeName}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-auto px-5 py-4">
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600">No payments are recorded for this enrollment.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="whitespace-nowrap py-2 pr-4">Date</th>
                  <th scope="col" className="whitespace-nowrap py-2 pr-4">Receipt</th>
                  <th scope="col" className="whitespace-nowrap py-2 pr-4">For</th>
                  <th scope="col" className="whitespace-nowrap py-2 pr-4">Method</th>
                  <th scope="col" className="whitespace-nowrap py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.orNumber}>
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-700">{formatDate(payment.paymentDate)}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-900">{payment.orNumber}</td>
                    <td className="py-2 pr-4">
                      <span className="text-slate-800">{REASON_LABELS[payment.reason]}</span>
                      {payment.reason === 'ENROLLMENT' && (
                        <span className="ml-2 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-800">
                          counts as paid
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-700">{METHOD_LABELS[payment.method]}</td>
                    <td className="whitespace-nowrap py-2 text-right font-medium text-slate-900">
                      {formatPeso(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-xs text-slate-500">
            For information only. Only the enrollment fee decides "Paid" in the panel. You still decide whether
            finances are cleared.
          </p>
        </div>
      </div>
    </div>
  )
}

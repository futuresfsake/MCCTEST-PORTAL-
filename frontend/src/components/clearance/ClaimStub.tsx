import type { ClearanceDetail } from '../../types/clearance.type'
import { certificateText, formatDate } from './clearance-format'

/**
 * The claim stub of the paper form. Printing the page prints only this block
 * (see `.print-area` in index.css).
 */
export default function ClaimStub({ detail }: { detail: ClearanceDetail }) {
  return (
    <div className="print-area border-2 border-dashed border-slate-400 bg-white p-6">
      <p className="text-center text-sm font-bold uppercase text-slate-900">
        Mandaue City College Technological and Entrepreneurial Skills Training Center (MCCTEST)
      </p>
      <p className="text-center text-xs text-slate-600">J.M. Ceniza St., Looc, Mandaue City</p>
      <h2 className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-900">Claim stub</h2>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="font-semibold text-slate-900">{detail.form.trainee.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Control No.</dt>
          <dd className="font-semibold text-slate-900">{detail.controlNumber}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Schedule release date</dt>
          <dd className="font-semibold text-slate-900">
            {detail.scheduleReleaseDate ? formatDate(detail.scheduleReleaseDate) : 'Not set'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Certificate request</dt>
          <dd className="font-semibold text-slate-900">
            <ul>
              {detail.certificates.map((certificate) => (
                <li key={certificate.type}>{certificateText(certificate)}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-slate-300 pt-3 text-xs text-slate-700">
        <p className="font-bold uppercase">Important reminders</p>
        <p className="mt-1">
          Present this claim stub upon claiming the document. Documents will only be released on the scheduled date.
          Lost stub may result in delayed processing.
        </p>
        <p className="mt-1">
          Processing time: 3-5 business days | Monday - Friday 8:00 AM - 8:30 PM | Saturday 8:00 AM - 5:00 PM
        </p>
      </div>
    </div>
  )
}

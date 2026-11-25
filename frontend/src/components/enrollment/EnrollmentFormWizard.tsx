import React, { useState } from 'react';
import type { EnrollmentFormData, TraineeData, RequirementChecklistData, BatchInfo } from '../../types/enrollment.type';
import { useEnrollmentApi } from '../../context/EnrollmentApiContext';
import EnrollmentStatusBadge from './EnrollmentStatusBadge';
import { getUniformAvailability } from '../../api/inventory.api';

interface EnrollmentFormWizardProps {
  onSuccess: (result: any) => void;
  onCancel: () => void;
}

const getTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const isValidBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = getTodayDate();

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    value <= today
  );
};

const EnrollmentFormWizard: React.FC<EnrollmentFormWizardProps> = ({
  onSuccess,
  onCancel,
}) => {
  // API calls for this page's role (registrar or admin routes)
  const { createEnrollment } = useEnrollmentApi();
  const [selectedBatchProgramId, setSelectedBatchProgramId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<EnrollmentFormData>({
    trainee: {
      id: undefined,
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'MALE',
      contactNumber: '',
      streetAddress: '',
      barangay: '',
      municipality: '',
      district: '',
      province: '',
      placeOfBirth: '',
      citizenship: 'FILIPINO',
      motherName: '',
      fatherName: '',
      civilStatus: '',
      highestEducation: '',
      pwd: false,
      employmentStatus: '',
      employmentType: '',
      isExistingTrainee: false,
      beneficiary: {
        firstName: '',
        middleName: '',
        lastName: '',
        relationship: '',
        contactNumber: '',
        address: '',
        idNumber: '',
      },
    },
    batchId: '',
    requirementChecklist: {
      bcNsoPsaCopy: false,
      diplomaTor: false,
      brgyClearance: false,
      oneByOnePic: false,
      twoByTwoPic: false,
      passportSize: false,
    },
    uniformSize: 'M',
    uniformGiven: false,
    remarks: '',
    payment: {
      processPayment: false,
      amount: '',
      paymentMethod: '',
      reasonOfDues: 'ENROLLMENT',
      remarks: '',
    },
  });

  const handleTraineeChange = (updates: Partial<TraineeData>) => {
    setFormData((prev) => ({
      ...prev,
      trainee: { ...prev.trainee, ...updates },
    }));
  };

  const handleChecklistChange = (updates: Partial<RequirementChecklistData>) => {
    setFormData((prev) => ({
      ...prev,
      requirementChecklist: { ...prev.requirementChecklist, ...updates },
    }));
  };

  const handleSubmit = async () => {
    const requiredFields: Array<[string, string]> = [
      ['firstName', 'First Name'],
      ['lastName', 'Last Name'],
      ['dateOfBirth', 'Date of Birth'],
      ['contactNumber', 'Contact Number'],
      ['barangay', 'Barangay'],
      ['municipality', 'Municipality'],
      ['province', 'Province'],
      ['placeOfBirth', 'Place of Birth'],
      ['civilStatus', 'Civil Status'],
      ['highestEducation', 'Highest Education'],
      ['employmentStatus', 'Employment Status'],
      ['employmentType', 'Employment Type'],
      ['beneficiary.firstName', 'Beneficiary First Name'],
      ['beneficiary.lastName', 'Beneficiary Last Name'],
      ['beneficiary.relationship', 'Beneficiary Relationship'],
      ['beneficiary.contactNumber', 'Beneficiary Contact Number'],
      ['beneficiary.address', 'Beneficiary Address'],
      ['beneficiary.idNumber', 'Beneficiary ID No.'],
    ];
    const missing = requiredFields
      .filter(([field]) => {
        if (field === 'contactNumber') return formData.trainee.contactNumber.replace(/\D/g, '').length < 12;
        if (field === 'beneficiary.contactNumber') return formData.trainee.beneficiary.contactNumber.replace(/\D/g, '').length < 12;
        if (field.startsWith('beneficiary.')) {
          const beneficiaryField = field.split('.')[1] as keyof TraineeData['beneficiary'];
          return !String(formData.trainee.beneficiary[beneficiaryField] || '').trim();
        }
        return !String(formData.trainee[field as keyof TraineeData] || '').trim();
      })
      .map(([, label]) => label);
    if (
      formData.trainee.dateOfBirth &&
      !isValidBirthDate(formData.trainee.dateOfBirth)
    ) {
      missing.push('Valid Date of Birth');
    }
    if (!formData.batchId) missing.push('Training Batch');
    if (formData.payment.processPayment && (!formData.payment.amount || !formData.payment.paymentMethod)) missing.push('Payment details');
    setMissingFields(missing);
    if (missing.length > 0) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const response = await createEnrollment({
        trainee: formData.trainee,
        batchId: formData.batchId,
        requirementChecklist: formData.requirementChecklist,
        uniformSize: formData.uniformSize,
        uniformGiven: formData.uniformGiven,
        remarks: formData.remarks,
        payment: {
          ...formData.payment,
          amount: formData.payment.amount ? Number(formData.payment.amount) : undefined,
        },
      });

      setSubmitSuccess(true);
      setSuccessResult(response);
    } catch (error: any) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          'Failed to create enrollment'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success screen
  if (submitSuccess) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <i className="fas fa-check text-green-600 text-2xl"></i>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Enrollment Created Successfully!
          </h2>
          <p className="text-slate-600 mb-6">
            The enrollment has been successfully processed and committed to the database.
          </p>

          {successResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Trainee Name
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {formData.trainee.firstName} {formData.trainee.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    ID Card Number
                  </p>
                  <p className="text-sm font-medium text-slate-900 font-mono">
                    {successResult.idCardNumber || 'Generating...'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Status
                  </p>
                  <p className="text-sm">
                    <EnrollmentStatusBadge status={successResult.enrollment_status || 'PENDING'} />
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    OR Number
                  </p>
                  <p className="text-sm font-medium text-slate-900 font-mono">
                    {successResult.orNumber || 'Generated'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Portal login, large and high-contrast so the trainee can take a photo of it */}
          {successResult?.portalAccount?.username && (
            <div className="mb-6 rounded-lg border-2 border-blue-900 bg-blue-50 p-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                Trainee Portal Login
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {formData.trainee.firstName} {formData.trainee.lastName}: please take a photo of this box.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Username</p>
                  <p className="break-all font-mono text-xl font-bold text-slate-950">{successResult.portalAccount.username}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Password</p>
                  {successResult.portalAccount.isNewAccount ? (
                    <p className="break-all font-mono text-xl font-bold text-slate-950">{successResult.portalAccount.temporaryPassword}</p>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Unchanged: use your current password</p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-600">
                {successResult.portalAccount.isNewAccount
                  ? 'New account. Keep these details private.'
                  : 'Existing account: this enrollment was added to it.'}
              </p>
            </div>
          )}

          <button type="button" onClick={() => onSuccess(successResult)} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-md transition">
            Return to Enrollment Module
          </button>
        </div>
      </div>
    );
  }

  // Keep the workflow on one page so staff can review the complete record before committing it.
  return (
    <div className="space-y-4">
      {/* Error display */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Error:</p>
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="1" title="Trainee Encoding Form" subtitle="Personal and demographic details saved to the trainee record." tone="blue" />
        <Step1TraineeInfo traineeData={formData.trainee} onTraineeChange={handleTraineeChange} missingFields={new Set(missingFields)} />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="2" title="Training Batch Selection" subtitle="Choose an available batch." tone="indigo" />
        <Step2BatchSelection
          traineeId={formData.trainee.id}
          batchId={formData.batchId}
          onBatchChange={(batchId, programId) => {
            setFormData((prev) => ({
              ...prev,
              batchId,
              uniformGiven:
                programId !== selectedBatchProgramId
                  ? false
                  : prev.uniformGiven,
            }));
            setSelectedBatchProgramId(programId);
          }}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="3" title="Requirements Checklist" subtitle="Record the documents received." tone="amber" />
        <Step3DocumentChecklist checklistData={formData.requirementChecklist} onChecklistChange={handleChecklistChange} />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="4" title="Uniform Size and Distribution" subtitle="The selected size and handover decision are committed with the enrollment." tone="emerald" />
        <Step4UniformId
          programId={selectedBatchProgramId}
          uniformSize={formData.uniformSize}
          uniformGiven={formData.uniformGiven}
          onUniformChange={(uniformSize) =>
            setFormData((prev) => ({
              ...prev,
              uniformSize: uniformSize as EnrollmentFormData['uniformSize'],
              uniformGiven: false,
            }))
          }
          onUniformGivenChange={(uniformGiven) =>
            setFormData((prev) => ({ ...prev, uniformGiven }))
          }
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="5" title="Payment" subtitle="Process the official receipt and annual insurance coverage when payment is received." tone="blue" />
        <Step5Payment
          payment={formData.payment}
          hasActiveInsurance={formData.trainee.hasActiveInsurance}
          onPaymentChange={(payment) => setFormData((prev) => ({ ...prev, payment }))}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeading step="6" title="Review and Database Commit" subtitle="Verify the complete record before creating the enrollment." tone="slate" />
        <Step5Review formData={formData} />
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition">Cancel</button>
          <div className="flex items-center gap-4">
            {missingFields.length > 0 && <p className="text-xs font-semibold text-blue-900">Complete the highlighted fields before committing: {formatMissingFields(missingFields)}.</p>}
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-3 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition">
            <i className="fas fa-database mr-2"></i>{isSubmitting ? 'Committing...' : 'Commit to Database'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const SectionHeading: React.FC<{ step: string; title: string; subtitle: string; tone: string }> = ({ step, title, subtitle, tone }) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone] || 'bg-slate-100 text-slate-700';

  return (
  <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between gap-4">
    <div><h3 className="text-sm font-bold text-slate-900">{step}. {title}</h3><p className="text-[11px] text-slate-500 mt-1">{subtitle}</p></div>
    <span className={`px-2.5 py-1 ${toneClass} text-[10px] font-bold rounded`}>STEP {step}</span>
  </div>
  );
};

/**
 * Step 1: Trainee Information
 */
const Step1TraineeInfo: React.FC<{
  traineeData: TraineeData;
  onTraineeChange: (updates: Partial<TraineeData>) => void;
  missingFields: Set<string>;
}> = ({ traineeData, onTraineeChange, missingFields }) => {
  // API calls for this page's role (registrar or admin routes)
  const { searchTrainees } = useEnrollmentApi();  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchTrainees(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching trainees:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExistingTrainee = (trainee: any) => {
    onTraineeChange({
      id: trainee.id,
      firstName: trainee.users?.first_name || '',
      middleName: trainee.users?.middle_name || '',
      lastName: trainee.users?.last_name || '',
      streetAddress: trainee.street_address || '',
      barangay: trainee.barangay || '',
      municipality: trainee.municipality || '',
      district: trainee.district || '',
      province: trainee.province || '',
      placeOfBirth: trainee.place_of_birth || '',
      citizenship: trainee.citizenship || 'FILIPINO',
      motherName: trainee.mother_name || '',
      fatherName: trainee.father_name || '',
      civilStatus: trainee.civil_status || '',
      highestEducation: trainee.highest_education || '',
      employmentStatus: trainee.employment_status || '',
      employmentType: trainee.employment_type || '',
      pwd: trainee.pwd || false,
      contactNumber: trainee.contact_number || '',
      dateOfBirth: trainee.date_of_birth ? String(trainee.date_of_birth).slice(0, 10) : '',
      gender: trainee.gender || 'MALE',
      hasActiveInsurance: trainee.hasActiveInsurance,
      isExistingTrainee: true,
      // Pre-fill the saved beneficiary; staff can still edit it
      beneficiary: {
        firstName: trainee.trainee_beneficiaries?.first_name || '',
        middleName: trainee.trainee_beneficiaries?.middle_name || '',
        lastName: trainee.trainee_beneficiaries?.last_name || '',
        relationship: trainee.trainee_beneficiaries?.relationship || '',
        contactNumber: trainee.trainee_beneficiaries?.contact_number || '',
        address: trainee.trainee_beneficiaries?.address || '',
        idNumber: trainee.trainee_beneficiaries?.id_number || '',
      },
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateNewTrainee = () => {
    onTraineeChange({
      id: undefined,
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'MALE',
      contactNumber: '',
      streetAddress: '',
      barangay: '',
      municipality: '',
      district: '',
      province: '',
      placeOfBirth: '',
      citizenship: 'FILIPINO',
      motherName: '',
      fatherName: '',
      civilStatus: '',
      highestEducation: '',
      pwd: false,
      employmentStatus: '',
      employmentType: '',
      hasActiveInsurance: false,
      isExistingTrainee: false,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Search Existing Trainee">
          <input type="search" placeholder="Name or contact number" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className={inputClass} />
        </Field>
        <button type="button" onClick={handleCreateNewTrainee} className="h-10 px-4 text-xs font-semibold text-blue-900 border border-blue-900 rounded-md hover:bg-blue-50 transition">Create New Trainee</button>
      </div>

      {isSearching && <p className="text-xs text-slate-500">Searching trainees...</p>}
      {searchResults.length > 0 && <div className="grid gap-2 md:grid-cols-2">{searchResults.map((trainee) => <button type="button" key={trainee.id} className="text-left border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50" onClick={() => handleSelectExistingTrainee(trainee)}><span className="block text-sm font-semibold text-slate-900">{trainee.users?.first_name} {trainee.users?.last_name}</span><span className="text-xs text-slate-500">{trainee.contact_number}</span></button>)}</div>}
      {searchQuery && searchResults.length === 0 && !isSearching && <p className="text-xs text-slate-500">No trainees found.</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="First Name "><input type="text" placeholder="First name" value={traineeData.firstName} onChange={(e) => onTraineeChange({ firstName: e.target.value })} className={fieldClass(missingFields.has('First Name'))} /></Field>
        <Field label="Middle Name"><input type="text" placeholder="Middle name" value={traineeData.middleName} onChange={(e) => onTraineeChange({ middleName: e.target.value })} className={inputClass} /></Field>
        <Field label="Last Name "><input type="text" placeholder="Last name" value={traineeData.lastName} onChange={(e) => onTraineeChange({ lastName: e.target.value })} className={fieldClass(missingFields.has('Last Name'))} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Date of Birth "><input type="date" max={getTodayDate()} value={traineeData.dateOfBirth} onChange={(e) => onTraineeChange({ dateOfBirth: e.target.value })} className={fieldClass(missingFields.has('Date of Birth') || missingFields.has('Valid Date of Birth'))} /></Field>
        <Field label="Gender "><select value={traineeData.gender} onChange={(e) => onTraineeChange({ gender: e.target.value as TraineeData['gender'] })} className={inputClass}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
        <Field label="Contact Number ">
          <div className={`${fieldClass(missingFields.has('Contact Number'))} flex items-center px-0`}>
            <span className="border-r border-slate-300 px-3 text-sm text-slate-500">+63</span>
            <input type="tel" inputMode="numeric" maxLength={10} placeholder="9171234567" value={traineeData.contactNumber.replace(/^\+63\s?/, '')} onChange={(e) => onTraineeChange({ contactNumber: `+63${e.target.value.replace(/\D/g, '').slice(0, 10)}` })} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          </div>
        </Field>
      </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Street Address "><input type="text" placeholder="Purok / street name" value={traineeData.streetAddress} onChange={(e) => onTraineeChange({ streetAddress: e.target.value })} className={inputClass} /></Field>
          <Field label="Barangay "><input type="text" placeholder="Barangay" value={traineeData.barangay} onChange={(e) => onTraineeChange({ barangay: e.target.value })} className={fieldClass(missingFields.has('Barangay'))} /></Field>
          <Field label="Municipality "><input type="text" placeholder="Municipality" value={traineeData.municipality} onChange={(e) => onTraineeChange({ municipality: e.target.value })} className={fieldClass(missingFields.has('Municipality'))} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="District "><input type="text" placeholder="District" value={traineeData.district} onChange={(e) => onTraineeChange({ district: e.target.value })} className={inputClass} /></Field>
          <Field label="Province "><input type="text" placeholder="Province" value={traineeData.province} onChange={(e) => onTraineeChange({ province: e.target.value })} className={fieldClass(missingFields.has('Province'))} /></Field>
          <Field label="Place of Birth "><input type="text" placeholder="City / municipality" value={traineeData.placeOfBirth} onChange={(e) => onTraineeChange({ placeOfBirth: e.target.value })} className={fieldClass(missingFields.has('Place of Birth'))} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Citizenship "><input type="text" placeholder="Filipino" value={traineeData.citizenship || ''} onChange={(e) => onTraineeChange({ citizenship: e.target.value })} className={inputClass} /></Field>
          <Field label="Mother's Name "><input type="text" placeholder="Full maiden name" value={traineeData.motherName} onChange={(e) => onTraineeChange({ motherName: e.target.value })} className={inputClass} /></Field>
          <Field label="Father's Name "><input type="text" placeholder="Full name" value={traineeData.fatherName} onChange={(e) => onTraineeChange({ fatherName: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 ">
          <Field label="Civil Status "><select value={traineeData.civilStatus} onChange={(e) => onTraineeChange({ civilStatus: e.target.value as TraineeData['civilStatus'] })} className={fieldClass(missingFields.has('Civil Status'))}><option value="" disabled>Civil Status</option><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="WIDOWED">Widowed</option><option value="SEPARATED">Separated</option><option value="DIVORCED">Divorced</option></select></Field>
          <SelectField label="Highest Education " value={traineeData.highestEducation} invalid={missingFields.has('Highest Education')} onChange={(value) => onTraineeChange({ highestEducation: value as TraineeData['highestEducation'] })} options={[['ELEMENTARY', 'Elementary'], ['HIGH_SCHOOL', 'High School'], ['VOCATIONAL', 'Vocational'], ['COLLEGE', 'College'], ['POST_GRADUATE', 'Post Graduate'], ['NA', 'N/A']]} />
          <SelectField label="Employment Status " value={traineeData.employmentStatus} invalid={missingFields.has('Employment Status')} onChange={(value) => onTraineeChange({ employmentStatus: value as TraineeData['employmentStatus'] })} options={[['EMPLOYED', 'Employed'], ['UNEMPLOYED', 'Unemployed'], ['SELF_EMPLOYED', 'Self Employed'], ['STUDENT', 'Student'], ['NA', 'N/A']]} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SelectField label="Employment Type " value={traineeData.employmentType} invalid={missingFields.has('Employment Type')} onChange={(value) => onTraineeChange({ employmentType: value as TraineeData['employmentType'] })} options={[['FULL_TIME', 'Full Time'], ['PART_TIME', 'Part Time'], ['CASUAL', 'Casual'], ['CONTRACTUAL', 'Contractual'], ['SEASONAL', 'Seasonal'], ['NA', 'N/A']]} />
          <label className="flex h-10 items-center gap-2 self-end text-xs font-medium text-slate-700"><input type="checkbox" checked={traineeData.pwd} onChange={(e) => onTraineeChange({ pwd: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> PWD (Person with Disability)</label>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Beneficiary</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="First Name *"><input type="text" value={traineeData.beneficiary.firstName} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, firstName: e.target.value } })} className={fieldClass(missingFields.has('Beneficiary First Name'))} /></Field>
            <Field label="Middle Name"><input type="text" value={traineeData.beneficiary.middleName} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, middleName: e.target.value } })} className={inputClass} /></Field>
            <Field label="Last Name *"><input type="text" value={traineeData.beneficiary.lastName} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, lastName: e.target.value } })} className={fieldClass(missingFields.has('Beneficiary Last Name'))} /></Field>
            <Field label="Relationship *"><input type="text" value={traineeData.beneficiary.relationship} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, relationship: e.target.value } })} className={fieldClass(missingFields.has('Beneficiary Relationship'))} /></Field>
            <Field label="Contact # *"><input type="tel" value={traineeData.beneficiary.contactNumber.replace(/^\+63/, '')} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, contactNumber: `+63${e.target.value.replace(/\D/g, '').slice(0, 10)}` } })} className={fieldClass(missingFields.has('Beneficiary Contact Number'))} placeholder="9171234567" /></Field>
            <Field label="ID No. *"><input type="text" value={traineeData.beneficiary.idNumber} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, idNumber: e.target.value } })} className={fieldClass(missingFields.has('Beneficiary ID No.'))} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Address *"><input type="text" value={traineeData.beneficiary.address} onChange={(e) => onTraineeChange({ beneficiary: { ...traineeData.beneficiary, address: e.target.value } })} className={fieldClass(missingFields.has('Beneficiary Address'))} /></Field>
          </div>
        </div>
    </div>
  );
};

const inputClass = 'w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:bg-slate-100 disabled:text-slate-500';
const fieldClass = (invalid: boolean) => `${inputClass} ${invalid ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900' : ''}`;
const formatMissingFields = (fields: string[]) => fields.length === 1
  ? fields[0]
  : `${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}`;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-xs font-semibold text-slate-700">
    <span className="mb-1.5 block">{label}</span>
    {children}
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[][];
  invalid?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, options, invalid, onChange }) => (
  <Field label={label}>
    <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass(Boolean(invalid))}>
      <option value="" disabled>{label.replace(' *', '')}</option>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </Field>
);

/**
 * Step 2: Batch Selection
 */
const Step2BatchSelection: React.FC<{
  traineeId?: string;
  batchId: string;
  onBatchChange: (batchId: string, programId: string) => void;
}> = ({ traineeId, batchId, onBatchChange }) => {
  // API calls for this page's role (registrar or admin routes)
  const { getAvailableBatches } = useEnrollmentApi();  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [programQuery, setProgramQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const batchData: BatchInfo[] = (await getAvailableBatches(traineeId)) || [];
      setBatches(batchData);
      setError(null);
    } catch (err) {
      console.error('Error loading batches:', err);
      const responseMessage = (err as any)?.response?.data?.message;
      setError(responseMessage || 'Failed to load available batches. Check that the backend is running and your session is active.');
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAvailableBatches, traineeId]);
  React.useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  // A previously chosen batch may no longer be allowed (e.g. another trainee was selected).
  // Runs only after loading, and stops once the selection has been cleared.
  React.useEffect(() => {
    if (!isLoading && batchId && !batches.some((batch) => batch.id === batchId && batch.eligible)) {
      onBatchChange('', '');
    }
  }, [isLoading, batches, batchId, onBatchChange]);
  // One entry per program that has an open batch, built from the batches themselves
  const programSummaries = Array.from(
    batches.reduce((summaries, batch) => {
      const summary = summaries.get(batch.programId) ?? {
        id: batch.programId,
        name: batch.programName,
        prefix: batch.programPrefix,
        isAccredited: batch.programIsAccredited,
        available: 0,
        blocked: 0,
      };
      if (batch.eligible) summary.available += 1;
      else summary.blocked += 1;
      return summaries.set(batch.programId, summary);
    }, new Map<string, { id: string; name: string; prefix: string; isAccredited: boolean; available: number; blocked: number }>()).values(),
  ).sort((a, b) => Number(b.available > 0) - Number(a.available > 0) || a.name.localeCompare(b.name));

  const query = programQuery.trim().toLowerCase();
  const filteredPrograms = programSummaries.filter((program) => !query || program.name.toLowerCase().includes(query) || program.prefix.toLowerCase().includes(query));
  const selectedProgram = programSummaries.find((program) => program.id === selectedProgramId);
  const selectedBatches = batches
    .filter((batch) => batch.programId === selectedProgramId)
    .sort((a, b) => Number(b.eligible) - Number(a.eligible));
  const formatSchedules = (batch: BatchInfo) =>
    batch.schedules.length
      ? batch.schedules.map((schedule) => `${schedule.days.join('/')} ${schedule.startTime}–${schedule.endTime}`).join(' + ')
      : 'No schedule set';

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-900 mb-2"></div>
        <p className="text-slate-600">Loading available batches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadBatches}
          className="mt-2 text-sm text-red-700 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batches.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-slate-600">No open batches at this time</p>
          <button
            type="button"
            onClick={loadBatches}
            className="mt-2 text-sm text-blue-700 hover:underline font-medium"
          >
            Refresh batches
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)\_minmax(0,3fr)]">
          {/* Program box */}
          <section className="rounded-md border border-slate-200" aria-label="Programs">
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              <input type="search" value={programQuery} onChange={(event) => setProgramQuery(event.target.value)} placeholder="Search program or prefix" aria-label="Search program" className={inputClass} />
              <button
                type="button"
                onClick={loadBatches}
                disabled={isLoading}
                className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-96 divide-y divide-slate-200 overflow-y-auto">
              {filteredPrograms.length === 0 && <p className="p-3 text-sm text-slate-500">No programs match “{programQuery.trim()}”.</p>}
              {filteredPrograms.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => { if (program.id !== selectedProgramId) { setSelectedProgramId(program.id); onBatchChange('', ''); } }}
                  aria-pressed={program.id === selectedProgramId}
                  className={`block w-full px-3 py-2.5 text-left transition ${program.id === selectedProgramId ? 'bg-blue-50 ring-1 ring-inset ring-blue-700' : 'hover:bg-slate-50'}`}
                >
                  <span className="block font-medium text-slate-900">{program.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {program.isAccredited ? 'Accredited' : 'Non-accredited'} · {program.available} available
                    {program.blocked > 0 && <span className="text-red-700"> · {program.blocked} blocked</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Batch box */}
          <section className="rounded-md border border-slate-200" aria-label="Batches">
            <h4 className="border-b border-slate-200 p-3 text-sm font-semibold text-slate-900">
              {selectedProgram ? `Batches: ${selectedProgram.name}` : 'Batches'}
            </h4>
            {!selectedProgram ? (
              <p className="p-3 text-sm text-slate-500">Select a program to see its batches.</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto p-3">
                {selectedBatches.map((batch) => {
                  const details = (
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{batch.batchName}</span>
                      <span className="block text-xs">
                        {new Date(batch.startDate).toLocaleDateString()} – {new Date(batch.endDate).toLocaleDateString()} · {formatSchedules(batch)}
                      </span>
                      <span className="block text-xs">Remaining slots: {batch.remainingCapacity} / {batch.capacity}</span>
                      {!batch.eligible && <span className="mt-1 block text-xs font-medium">{batch.blockedReason}</span>}
                    </span>
                  );

                  return batch.eligible ? (
                    <label key={batch.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition ${batchId === batch.id ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      <input type="radio" name="batch" value={batch.id} checked={batchId === batch.id} onChange={() => onBatchChange(batch.id, batch.programId)} className="mt-1 h-3.5 w-3.5" />
                      {details}
                    </label>
                  ) : (
                    <div key={batch.id} aria-disabled="true" className="flex cursor-not-allowed items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <input type="radio" name="batch" value={batch.id} disabled aria-label={`${batch.batchName} (unavailable)`} className="mt-1 h-3.5 w-3.5" />
                      {details}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

/**
 * Step 3: Document Checklist
 */
const Step3DocumentChecklist: React.FC<{
  checklistData: RequirementChecklistData;
  onChecklistChange: (updates: Partial<RequirementChecklistData>) => void;
}> = ({ checklistData, onChecklistChange }) => {
  const requirements = [
    { key: 'bcNsoPsaCopy', label: 'BC/NSO PSA Copy' },
    { key: 'diplomaTor', label: 'Diploma/TOR' },
    { key: 'brgyClearance', label: 'Barangay Clearance' },
    { key: 'oneByOnePic', label: '1x1 Picture' },
    { key: 'twoByTwoPic', label: '2x2 Picture' },
    { key: 'passportSize', label: 'Passport Size Picture' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {requirements.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={(checklistData as any)[key] || false}
              onChange={(e) =>
                onChecklistChange({ [key]: e.target.checked })
              }
              className="w-4 h-4 rounded"
            />
            <span className="text-xs font-medium text-slate-900">{label}</span>
          </label>
        ))}
      </div>

      <Field label="Additional Remarks (Optional)">
        <textarea placeholder="Add a note about the submitted requirements" value={checklistData.remarks || ''} onChange={(e) => onChecklistChange({ remarks: e.target.value })} className={`${inputClass} h-20 py-2`} rows={3} />
      </Field>
    </div>
  );
};

/**
 * Step 4: Uniform & ID
 */
const Step4UniformId: React.FC<{
  programId: string;
  uniformSize: string;
  uniformGiven: boolean;
  onUniformChange: (size: string) => void;
  onUniformGivenChange: (given: boolean) => void;
}> = ({
  programId,
  uniformSize,
  uniformGiven,
  onUniformChange,
  onUniformGivenChange,
}) => {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const [stockState, setStockState] = useState<{
    programId: string;
    size: string;
    status: 'loading' | 'success' | 'error';
    quantity?: number;
    message?: string;
  } | null>(null);

  React.useEffect(() => {
    if (!programId) {
      setStockState(null);
      return;
    }

    const controller = new AbortController();

    setStockState({
      programId,
      size: uniformSize,
      status: 'loading',
    });

    const loadAvailability = async () => {
      try {
        const result = await getUniformAvailability(
          programId,
          uniformSize,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setStockState({
          programId,
          size: uniformSize,
          status: 'success',
          quantity: result.available_quantity,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setStockState({
          programId,
          size: uniformSize,
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to check uniform availability.',
        });
      }
    };

    void loadAvailability();

    return () => controller.abort();
  }, [programId, uniformSize]);

  // Ignore a previous request's result while the current selection is loading.
  const isCurrentStock =
    stockState?.programId === programId &&
    stockState?.size === uniformSize;

  const isLoadingStock =
    Boolean(programId) &&
    (!isCurrentStock || stockState?.status === 'loading');

  const availableQuantity =
    isCurrentStock && stockState?.status === 'success'
      ? stockState.quantity ?? 0
      : null;

  const stockError =
    isCurrentStock && stockState?.status === 'error'
      ? stockState.message
      : null;

  const isOutOfStock = availableQuantity === 0;
  const canDistribute = availableQuantity !== null && availableQuantity > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Uniform Size *
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onUniformChange(size)}
              className={`h-10 rounded-md border-2 font-semibold text-xs transition ${
                uniformSize === size
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-700">
          Stock Availability
        </p>

        {!programId ? (
          <p className="mt-1 text-xs text-slate-500">
            Select a training batch to check uniform availability.
          </p>
        ) : isLoadingStock ? (
          <p className="mt-1 text-xs text-slate-500">
            Checking available stock...
          </p>
        ) : stockError ? (
          <p className="mt-1 text-xs text-red-600">
            Unable to check stock: {stockError}
          </p>
        ) : availableQuantity !== null ? (
          <p
            className={`mt-1 text-sm font-medium ${
              isOutOfStock ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {isOutOfStock
              ? `Size ${uniformSize} is out of stock.`
              : `${availableQuantity} unit(s) available for size ${uniformSize}.`}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label
          className={`flex items-start gap-3 rounded-md border p-3 ${
            uniformGiven
              ? 'border-emerald-600 bg-emerald-50'
              : canDistribute
                ? 'cursor-pointer border-slate-200'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
          }`}
        >
          <input
            type="radio"
            name="uniformGiven"
            checked={uniformGiven}
            disabled={!canDistribute}
            onChange={() => onUniformGivenChange(true)}
            className="mt-1"
          />
          <span>
            <strong className="block text-sm text-slate-900">
              Distributed now
            </strong>
            <span className="text-xs text-slate-600">
              {canDistribute
                ? 'The uniform is in stock and handed to the trainee during enrollment.'
                : 'Unavailable until stock is confirmed for the selected size.'}
            </span>
          </span>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
            !uniformGiven
              ? 'border-slate-600 bg-slate-50'
              : 'border-slate-200'
          }`}
        >
          <input
            type="radio"
            name="uniformGiven"
            checked={!uniformGiven}
            onChange={() => onUniformGivenChange(false)}
            className="mt-1"
          />
          <span>
            <strong className="block text-sm text-slate-900">
              Not distributed
            </strong>
            <span className="text-xs text-slate-600">
              Keep the requested size on the enrollment for later distribution.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};

const Step5Payment: React.FC<{
  payment: EnrollmentFormData['payment'];
  hasActiveInsurance?: boolean;
  onPaymentChange: (payment: EnrollmentFormData['payment']) => void;
}> = ({ payment, hasActiveInsurance, onPaymentChange }) => {
  const baseFee = hasActiveInsurance ? 450 : 500;

  return (
    <div className="space-y-4">
      <label className={`flex items-start gap-3 border rounded-md p-3 cursor-pointer ${payment.processPayment ? 'border-blue-900 bg-blue-50' : 'border-slate-200'}`}>
        <input type="checkbox" checked={payment.processPayment} onChange={(event) => onPaymentChange({ ...payment, processPayment: event.target.checked })} className="mt-1 h-4 w-4" />
        <span><strong className="block text-sm text-slate-900">Process Payment</strong><span className="text-xs text-slate-600">Create the official receipt and insurance record for this enrollment.</span></span>
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Reason of Dues">
          <select value={payment.reasonOfDues} onChange={(event) => onPaymentChange({ ...payment, reasonOfDues: event.target.value as EnrollmentFormData['payment']['reasonOfDues'] })} className={inputClass}>
            <option value="ENROLLMENT">Enrollment</option><option value="PROCESSING_FEE">Processing Fee</option><option value="UNIFORM_ID_FEE">Uniform / ID Fee</option><option value="ASSESSMENT_DEPOSIT">Assessment Deposit</option><option value="EXTERNAL_FEES">External Fees</option>
          </select>
        </Field>
        <Field label="Remarks"><input type="text" value={payment.remarks} onChange={(event) => onPaymentChange({ ...payment, remarks: event.target.value })} className={inputClass} placeholder="Payment remarks" /></Field>
      </div>

      {payment.processPayment && <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
        <Field label="Base Fee"><input type="text" value={`PHP ${baseFee.toFixed(2)}`} readOnly className={`${inputClass} bg-slate-100 font-semibold`} /></Field>
        <Field label="Amount *"><input type="number" min="1" step="0.01" value={payment.amount} onChange={(event) => onPaymentChange({ ...payment, amount: event.target.value })} className={inputClass} placeholder="Amount received" /></Field>
        <Field label="Payment Method *">
          <select value={payment.paymentMethod} onChange={(event) => onPaymentChange({ ...payment, paymentMethod: event.target.value as EnrollmentFormData['payment']['paymentMethod'] })} className={inputClass}>
            <option value="" disabled>Select method</option><option value="CASH">Cash</option><option value="GCASH">GCash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="CHECK">Check</option>
          </select>
        </Field>
      </div>}
    </div>
  );
};

/**
 * Step 5: Review & Submit
 */
const Step5Review: React.FC<{
  formData: EnrollmentFormData;
}> = ({ formData }) => {
  const traineeFullName = `${formData.trainee.firstName} ${formData.trainee.middleName} ${formData.trainee.lastName}`.trim();
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Trainee Section */}
        <div className="border border-slate-200 rounded-md p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Trainee Information</h4>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="font-medium text-slate-600">Name</p>
              <p className="text-slate-900">{traineeFullName}</p>
            </div>
            <div>
              <p className="font-medium text-slate-600">Contact</p>
              <p className="text-slate-900">{formData.trainee.contactNumber}</p>
            </div>
            <div>
              <p className="font-medium text-slate-600">Date of Birth</p>
              <p className="text-slate-900">
                {new Date(formData.trainee.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-600">Gender</p>
              <p className="text-slate-900">{formData.trainee.gender}</p>
            </div>
          </div>
        </div>

        {/* Document Checklist Summary */}
        <div className="border border-slate-200 rounded-md p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Documents Submitted</h4>
          <div className="grid grid-cols-1 gap-1.5 text-xs md:grid-cols-3">
            {Object.entries(formData.requirementChecklist).map(([key, value]) => {
              if (key === 'remarks') return null;
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .toUpperCase()
                .trim();
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="text-slate-700">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Uniform Size */}
        <div className="border border-slate-200 rounded-md p-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Uniform</h4>
          <p className="text-slate-900 font-mono">{formData.uniformSize} - {formData.uniformGiven ? 'Distributed' : 'Not distributed'}</p>
        </div>

        {/* ID & OR Information */}
        <div className="border border-blue-200 rounded-md p-3 bg-blue-50">
          <h4 className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-2">Generated Information</h4>
          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            <div>
              <p className="font-medium text-blue-800">ID Card Number</p>
              <p className="text-blue-900 font-mono">
                Generated automatically upon successful submission
              </p>
            </div>
            <div>
              <p className="font-medium text-blue-800">Official Receipt (OR)</p>
              <p className="text-blue-900">
                Generated automatically upon successful submission
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-xs text-yellow-900 font-medium">
          Please review all information carefully before submitting. Changes cannot be made after submission.
        </p>
      </div>
    </div>
  );
};

export default EnrollmentFormWizard;

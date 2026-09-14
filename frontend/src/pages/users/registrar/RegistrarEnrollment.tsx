import React, { useState } from 'react';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import EnrollmentTable from './enrollments/components/EnrollmentTable';
import EnrollmentFormWizard from './enrollments/components/EnrollmentFormWizard';
import EnrollmentDetail from './enrollments/components/EnrollmentDetail';

type TabType = 'list' | 'create';

const RegistrarEnrollment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEnrollmentCreated = () => {
    setRefreshKey((previous) => previous + 1);
    setActiveTab('list');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="registrar" />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Registrar Module</p>
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">
                    Enrollment
                    <span className="block text-blue-900">Management</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Manage trainee enrollments, view enrollment records, and process new enrollments.
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-6 lg:ml-auto lg:max-w-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Current Tab</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {activeTab === 'list' ? 'Enrollment List' : 'New Enrollment'}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {activeTab === 'list' ? 'View and manage existing enrollments' : 'Create and submit new enrollment'}
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="flex gap-8">
                <button onClick={() => setActiveTab('list')} className={`border-b-2 px-2 py-4 text-sm font-medium transition ${activeTab === 'list' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}>
                  Enrollment List
                </button>
                <button onClick={() => setActiveTab('create')} className={`border-b-2 px-2 py-4 text-sm font-medium transition ${activeTab === 'create' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}>
                  New Enrollment
                </button>
              </div>
            </div>
          </section>
          <section className="bg-slate-50 px-6 py-12 lg:px-8">
            <div className="mx-auto max-w-7xl">
              {activeTab === 'list' && (
                <div key={refreshKey}>
                  <h2 className="mb-6 text-2xl font-bold text-slate-900">Enrollment Records</h2>
                  <EnrollmentTable onSelectEnrollment={setSelectedEnrollmentId} />
                </div>
              )}
              {activeTab === 'create' && (
                <div>
                  <h2 className="mb-6 text-2xl font-bold text-slate-900">Create New Enrollment</h2>
                  <EnrollmentFormWizard onSuccess={handleEnrollmentCreated} onCancel={() => setActiveTab('list')} />
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      <Footer />
      {selectedEnrollmentId && (
        <EnrollmentDetail enrollmentId={selectedEnrollmentId} onClose={() => setSelectedEnrollmentId(null)} />
      )}
    </div>
  );
};

export default RegistrarEnrollment;

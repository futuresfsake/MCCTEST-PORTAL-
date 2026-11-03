import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Footer from '../layout/Footer';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import type { TraineeInformationRole } from '../../types/trainee-information.type';
import TraineeListView from './TraineeListView';
import TraineeProfileView from './TraineeProfileView';

/**
 * What each role gets from the shared module. Both are read-only until
 * MP-42 adds editing; flip canEdit there.
 */
export const TRAINEE_INFORMATION_ACCESS: Record<
  TraineeInformationRole,
  { basePath: string; canEdit: boolean; moduleLabel: string }
> = {
  admin: { basePath: '/admin/trainees', canEdit: false, moduleLabel: 'Admin Module' },
  registrar: { basePath: '/registrar/trainees', canEdit: false, moduleLabel: 'Registrar Module' },
  trainer: { basePath: '/trainer/trainees', canEdit: false, moduleLabel: 'Trainer Module' },
  encoder: { basePath: '/encoder/trainees', canEdit: false, moduleLabel: 'Encoder Module' },
};

const TraineeInformationLayout: React.FC<{
  role: TraineeInformationRole;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ role, title, description, children }) => (
  <div className="flex min-h-screen flex-col bg-white text-slate-900">
    <Header />
    <div className="relative flex min-h-0 flex-1">
      <Sidebar variant={role} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
              {TRAINEE_INFORMATION_ACCESS[role].moduleLabel}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
          </div>
        </section>
        <section className="bg-slate-50 px-6 py-10 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </main>
    </div>
    <Footer />
  </div>
);

export const TraineeInformationListPage: React.FC<{ role: TraineeInformationRole }> = ({ role }) => (
  <TraineeInformationLayout
    role={role}
    title="Trainee Information"
    description="Search and review trainee records. Select a trainee to view their full profile and enrollments."
  >
    <TraineeListView role={role} basePath={TRAINEE_INFORMATION_ACCESS[role].basePath} />
  </TraineeInformationLayout>
);

export const TraineeInformationProfilePage: React.FC<{ role: TraineeInformationRole }> = ({ role }) => {
  const { id } = useParams<{ id: string }>();
  const { basePath, canEdit } = TRAINEE_INFORMATION_ACCESS[role];
  if (!id) return <Navigate to={basePath} replace />;

  return (
    <TraineeInformationLayout
      role={role}
      title="Trainee Profile"
      description="Personal details, family, education, beneficiary, insurance, and every program enrollment."
    >
      {/* key: a different trainee starts from a clean state */}
      <TraineeProfileView key={id} role={role} traineeId={id} basePath={basePath} canEdit={canEdit} />
    </TraineeInformationLayout>
  );
};

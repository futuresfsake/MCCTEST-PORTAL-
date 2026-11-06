import Header from '../../../../components/layout/Header';
import Sidebar from '../../../../components/layout/Sidebar';
import Footer from '../../../../components/layout/Footer';
import { RequirementsListPage } from '../../../../components/requirements/RequirementsListPage';

export default function RegistrarRequirementsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="registrar" />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <section className="bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
              <RequirementsListPage role="registrar" />
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}

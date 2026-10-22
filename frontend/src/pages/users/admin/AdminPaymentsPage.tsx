import { useState } from 'react';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import { PaymentListPage } from '../../../components/payments/PaymentListPage';
import { PaymentFormModal } from '../../../components/payments/PaymentFormModal';

export default function AdminPaymentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="admin" />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <section className="bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
              <PaymentListPage role="admin" onRecordPayment={() => setShowCreate(true)} refreshKey={listRefreshKey} />
            </div>
          </section>
        </main>
      </div>

      <Footer />

      {showCreate ? (
        <PaymentFormModal
          role="admin"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            setListRefreshKey((key) => key + 1);
          }}
        />
      ) : null}
    </div>
  );
}

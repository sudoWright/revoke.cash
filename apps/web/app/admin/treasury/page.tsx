import FeeBalancesSection from 'components/admin/treasury/FeeBalancesSection';
import SubscriptionBalancesSection from 'components/admin/treasury/SubscriptionBalancesSection';

const AdminTreasuryPage = () => (
  <div className="flex flex-col gap-6">
    <SubscriptionBalancesSection />
    <FeeBalancesSection />
  </div>
);

export default AdminTreasuryPage;

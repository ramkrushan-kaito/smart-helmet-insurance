import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerFormPage } from '../admin/CustomerFormPage';
import { CustomersPage } from '../admin/CustomersPage';
import { HelmetFormPage, HelmetsPage } from '../admin/HelmetPages';
import { AuditPage, ClaimsAdminPage, NotificationsPage, PaymentsPage, PoliciesPage, ProductsPage, SettingsPage, StaffPage, VehiclesPage } from '../admin/OperationsPages';
import { QrGalleryPage, QrGeneratePage, QrManagementPage } from '../admin/QrPages';
import { ClaimDetailPage, HelmetDetailPage, MyClaimsPage, MyHelmetsPage, MyPoliciesPage, MyVehiclesPage, PolicyDetailPage, PolicyDocumentsPage, ProfilePage, RenewalPage, SubmitClaimPage } from '../customer/PortalPages';
import { ShellLayout } from '../layouts/ShellLayout';
import { AdminLoginPage, OtpLoginPage } from '../pages/AuthPages';
import { AdminDashboardPage, CustomerDashboardPage } from '../pages/DashboardPages';
import { AccessDeniedPage, InvalidQrPage, LandingPage, NotFoundPage } from '../pages/PublicPages';
import { CoverDetailsPage } from '../pages/CoverDetailsPage';
import { CoverPage, CoverPaymentPage, CoverSuccessPage } from '../pages/CoverPage';
import { ScanPage, ScanRedirect } from '../pages/ScanPage';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

const adminItems = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/helmets', label: 'Helmets' },
  { to: '/admin/qr', label: 'QR codes' },
  { to: '/admin/qr/gallery', label: 'QR gallery' },
  { to: '/admin/vehicles', label: 'Vehicles' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/policies', label: 'Policies' },
  { to: '/admin/claims', label: 'Claims' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/audit-logs', label: 'Audit logs' },
  { to: '/admin/settings', label: 'Settings' },
];

const customerItems = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/profile', label: 'Profile' },
  { to: '/app/helmets', label: 'My helmets' },
  { to: '/app/vehicles', label: 'My vehicles' },
  { to: '/app/policies', label: 'My policies' },
  { to: '/app/claims', label: 'My claims' },
  { to: '/app/claims/new', label: 'Submit claim' },
  { to: '/app/renewal', label: 'Renewal' },
  { to: '/app/notifications', label: 'Notifications' },
];

function AdminShell() {
  const { user } = useAuth();
  const items = user?.role === 'SUPER_ADMIN' ? [...adminItems, { to: '/admin/staff', label: 'Staff' }] : adminItems;
  return <ShellLayout home="/admin" items={items} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/scan/:token" element={<ScanRedirect />} />
      <Route path="/cover/:token" element={<CoverPage />} />
      <Route path="/cover/:token/details/:code" element={<CoverDetailsPage />} />
      <Route path="/cover/:token/pay/:code" element={<CoverPaymentPage />} />
      <Route path="/cover/:token/success" element={<CoverSuccessPage />} />
      <Route path="/invalid-qr" element={<InvalidQrPage />} />
      <Route path="/login" element={<OtpLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']} />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/:id" element={<CustomerFormPage />} />
          <Route path="helmets" element={<HelmetsPage />} />
          <Route path="helmets/new" element={<HelmetFormPage />} />
          <Route path="helmets/:id" element={<HelmetFormPage />} />
          <Route path="qr" element={<QrManagementPage />} />
          <Route path="qr/generate" element={<QrGeneratePage />} />
          <Route path="qr/gallery" element={<QrGalleryPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="claims" element={<ClaimsAdminPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="notifications" element={<NotificationsPage admin />} />
          <Route path="audit-logs" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
        <Route path="/app" element={<ShellLayout home="/app" items={customerItems} />}>
          <Route index element={<CustomerDashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="helmets" element={<MyHelmetsPage />} />
          <Route path="helmets/:id" element={<HelmetDetailPage />} />
          <Route path="vehicles" element={<MyVehiclesPage />} />
          <Route path="policies" element={<MyPoliciesPage />} />
          <Route path="policies/:id" element={<PolicyDetailPage />} />
          <Route path="policies/:id/documents" element={<PolicyDocumentsPage />} />
          <Route path="claims" element={<MyClaimsPage />} />
          <Route path="claims/new" element={<SubmitClaimPage />} />
          <Route path="claims/:id" element={<ClaimDetailPage />} />
          <Route path="renewal" element={<RenewalPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

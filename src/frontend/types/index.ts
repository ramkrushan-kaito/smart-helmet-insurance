export type Page<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export type SessionUser = {
  id: string;
  email: string | null;
  mobile: string | null;
  fullName: string;
  role: Role;
  customerId: string | null;
  customerCode?: string | null;
};

export type Customer = {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  dateOfBirth: string | null;
  userId: string;
};

export type Helmet = {
  id: string;
  helmetCode: string;
  brand: string;
  model: string;
  color: string;
  size: string;
  serialNumber: string;
  manufactureYear: number;
  status: string;
  customerId: string | null;
  customer?: { id: string; fullName: string; customerCode: string; mobile: string } | null;
  qrCode?: { id: string; token: string; status: string; scanUrl: string } | null;
  vehicleMapping?: { vehicle: Vehicle } | null;
};

export type Vehicle = {
  id: string;
  vehicleCode: string;
  registrationNumber: string;
  type: string;
  make: string;
  model: string;
  year: number;
  color: string;
  chassisNumber: string;
  engineNumber: string;
  customerId: string;
  customer?: { id: string; fullName: string; customerCode: string };
};

export type Product = {
  id: string;
  code: string;
  name: string;
  description: string;
  coverageAmount: string;
  premiumAmount: string;
  durationMonths: number;
  isActive: boolean;
};

export type Policy = {
  id: string;
  policyNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  premiumAmount: string;
  coverageAmount: string;
  customerId: string;
  customer?: { id: string; fullName: string; customerCode: string };
  vehicle?: Vehicle;
  product?: Product;
  helmet?: { id: string; helmetCode: string; brand: string; model: string } | null;
  documents?: DocumentRow[];
};

export type DocumentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

export type Claim = {
  id: string;
  claimNumber: string;
  status: string;
  incidentDate: string;
  description: string;
  claimAmount: string;
  approvedAmount: string | null;
  rejectionReason: string | null;
  policyId: string;
  customerId: string;
  customer?: { fullName: string; customerCode: string };
  policy?: { policyNumber: string; product?: Product; vehicle?: Vehicle };
  documents?: DocumentRow[];
};

export type Payment = {
  id: string;
  paymentRef: string;
  amount: string;
  purpose: string;
  status: string;
  method: string;
  paidAt: string | null;
  createdAt: string;
  customer?: { fullName: string; customerCode: string };
  policy?: { policyNumber: string } | null;
  claim?: { claimNumber: string } | null;
};

export type QrRow = {
  id: string;
  token: string;
  status: string;
  scanUrl: string;
  scanCount: number;
  helmet: { id: string; helmetCode: string; brand: string; model: string; status: string };
};

export type ScanClaim = {
  claimNumber: string;
  status: string;
  claimAmount: string;
  incidentDate: string;
};

export type ScanPolicy = {
  policyNumber: string;
  status: string;
  productName: string;
  startDate: string;
  endDate: string;
  premiumAmount: string;
  coverageAmount: string;
  claims: ScanClaim[];
};

export type ScanOffer = {
  id: string;
  name: string;
  premiumAmount: string;
  coverageAmount: string;
  durationMonths: number;
};

export type ScanCompany = {
  code: string;
  name: string;
  line: string;
  premium: number;
  coverage: number;
  months: number;
};

export type ScanResult = {
  valid: boolean;
  assigned: boolean;
  message: string;
  helmet: { helmetCode: string; brand: string; model: string; color: string; size: string; status: string };
  customer: { fullName: string | null; mobileMasked: string | null } | null;
  vehicle: { registrationNumber: string; make: string; model: string; type: string } | null;
  policy: ScanPolicy | null;
  policies: ScanPolicy[];
  offers: ScanOffer[];
  companies: ScanCompany[];
};

import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import QRCode from 'qrcode';

const prisma = new PrismaClient();
const qrBase = (process.env.QR_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const customers = [
  ['DEMO DATA Aarav Sharma', '9000000001', 'aarav.sharma@demo.helmet.test', '12 Demo Residency, Andheri', 'Mumbai', 'Maharashtra', '400053', '1994-03-14'],
  ['DEMO DATA Diya Patel', '9000000002', 'diya.patel@demo.helmet.test', '44 Sample Lane, Navrangpura', 'Ahmedabad', 'Gujarat', '380009', '1996-07-22'],
  ['DEMO DATA Rohan Iyer', '9000000003', 'rohan.iyer@demo.helmet.test', '8 Fictional Cross, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '1991-11-02'],
  ['DEMO DATA Meera Nair', '9000000004', 'meera.nair@demo.helmet.test', '19 Demo Villa, Panampilly', 'Kochi', 'Kerala', '682036', '1998-01-30'],
  ['DEMO DATA Kabir Singh', '9000000005', 'kabir.singh@demo.helmet.test', '3 Story Road, C-Scheme', 'Jaipur', 'Rajasthan', '302001', '1990-09-18'],
  ['DEMO DATA Ananya Reddy', '9000000006', 'ananya.reddy@demo.helmet.test', '71 Example Street, Banjara', 'Hyderabad', 'Telangana', '500034', '1995-05-09'],
  ['DEMO DATA Vikram Joshi', '9000000007', 'vikram.joshi@demo.helmet.test', '15 Practice Nagar, Kothrud', 'Pune', 'Maharashtra', '411038', '1988-12-11'],
  ['DEMO DATA Sara Khan', '9000000008', 'sara.khan@demo.helmet.test', '90 Demo Block, Hazratganj', 'Lucknow', 'Uttar Pradesh', '226001', '1997-04-25'],
  ['DEMO DATA Arjun Menon', '9000000009', 'arjun.menon@demo.helmet.test', '6 Fictional Avenue, Adyar', 'Chennai', 'Tamil Nadu', '600020', '1993-08-16'],
  ['DEMO DATA Neha Kapoor', '9000000010', 'neha.kapoor@demo.helmet.test', '28 Sample Marg, Karol Bagh', 'Delhi', 'Delhi', '110005', '1999-02-07'],
] as const;

const helmetPlan = [
  { code: 'HM10001', customer: 0, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10002', customer: 0, qr: 'ACTIVE' as const, link: false },
  { code: 'HM10003', customer: 1, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10004', customer: 1, qr: 'ACTIVE' as const, link: false },
  { code: 'HM10005', customer: 2, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10006', customer: 3, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10007', customer: 4, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10008', customer: 5, qr: 'INACTIVE' as const, link: true },
  { code: 'HM10009', customer: 6, qr: 'REVOKED' as const, link: true },
  { code: 'HM10010', customer: 7, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10011', customer: 8, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10012', customer: 9, qr: 'ACTIVE' as const, link: true },
  { code: 'HM10013', customer: null, qr: 'ACTIVE' as const, link: false },
  { code: 'HM10014', customer: null, qr: 'ACTIVE' as const, link: false },
  { code: 'HM10015', customer: null, qr: 'ACTIVE' as const, link: false },
];

const brands = ['NexusGuard', 'AeroShield', 'StreetLite'];
const colors = ['Matte Black', 'White', 'Signal Red', 'Slate Blue', 'Graphite'];
const policyStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRED', 'EXPIRED', 'PENDING', 'PENDING', 'CANCELLED'] as const;
const claimStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'] as const;

function day(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function tokenFor(code: string, qr: string, assigned: boolean) {
  if (!assigned) return `unassigned-demo-token-${code.toLowerCase()}`;
  if (qr === 'INACTIVE') return `inactive-demo-token-${code.toLowerCase()}`;
  if (qr === 'REVOKED') return `revoked-demo-token-${code.toLowerCase()}`;
  return `active-demo-token-${code.toLowerCase()}`;
}

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.error('Database already has data. Refusing to seed over existing rows.');
    console.error('To delete the local demo data and load it again, run: CONFIRM_DB_RESET=YES npm run db:reset');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const superRole = await prisma.role.create({
    data: { name: 'SUPER_ADMIN', description: 'Full demo access, including staff management.', permissions: ['*'] },
  });
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Demo operations for customers, helmets, QR codes, policies and claims.',
      permissions: ['customers', 'helmets', 'qr', 'vehicles', 'policies', 'claims', 'dashboard'],
    },
  });
  const customerRole = await prisma.role.create({
    data: { name: 'CUSTOMER', description: 'Own helmets, vehicles, policies and claims only.', permissions: ['self'] },
  });

  const superAdmin = await prisma.user.create({
    data: {
      fullName: 'DEMO DATA Super Admin',
      email: 'superadmin@demo.helmet.test',
      passwordHash,
      roleId: superRole.id,
    },
  });
  const admin = await prisma.user.create({
    data: { fullName: 'DEMO DATA Admin', email: 'admin@demo.helmet.test', passwordHash, roleId: adminRole.id },
  });

  const customerRows = [];
  for (let i = 0; i < customers.length; i += 1) {
    const [fullName, mobile, email, address, city, state, pincode, dob] = customers[i];
    const user = await prisma.user.create({ data: { fullName, mobile, email, roleId: customerRole.id } });
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        customerCode: `CUST${10001 + i}`,
        fullName,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        dateOfBirth: day(dob),
        kycStatus: i % 4 === 0 ? 'VERIFIED' : 'PENDING',
        isDemo: true,
      },
    });
    customerRows.push({ user, customer });
  }

  const products = await Promise.all(
    [
      ['SH-COMP', 'DEMO DATA Comprehensive Helmet Cover', 'Fictional cover for helmet damage and rider injury. Not a real policy.', '150000.00', '2499.00'],
      ['SH-TPL', 'DEMO DATA Third Party Liability', 'Fictional third-party cover linked to a demo two-wheeler. Not a real policy.', '500000.00', '999.00'],
      ['SH-PAR', 'DEMO DATA Personal Accident Rider', 'Fictional personal accident rider. Not a real policy.', '1000000.00', '1499.00'],
    ].map(([code, name, description, coverage, premium]) =>
      prisma.insuranceProduct.create({
        data: {
          code,
          name,
          description,
          coverageAmount: new Prisma.Decimal(coverage),
          premiumAmount: new Prisma.Decimal(premium),
          durationMonths: 12,
          isDemo: true,
        },
      }),
    ),
  );

  const vehicleMakes = [
    ['DemoMoto', 'City 150', 'MOTORCYCLE'],
    ['SampleRide', 'Ridge 220', 'MOTORCYCLE'],
    ['FictoScoot', 'Pulse 110', 'SCOOTER'],
    ['DemoMoto', 'Metro 125', 'SCOOTER'],
    ['SampleRide', 'Hill 200', 'MOTORCYCLE'],
    ['FictoScoot', 'Campus 100', 'MOPED'],
    ['DemoMoto', 'Coast 160', 'MOTORCYCLE'],
    ['SampleRide', 'Lane 110', 'SCOOTER'],
    ['FictoScoot', 'Yard 150', 'MOTORCYCLE'],
    ['DemoMoto', 'Park 90', 'MOPED'],
  ] as const;
  const vehicles = [];
  for (let i = 0; i < vehicleMakes.length; i += 1) {
    const [make, model, type] = vehicleMakes[i];
    vehicles.push(
      await prisma.vehicle.create({
        data: {
          vehicleCode: `VH${10001 + i}`,
          customerId: customerRows[i].customer.id,
          registrationNumber: `DEMO${1001 + i}`,
          type,
          make,
          model,
          year: 2022 + (i % 4),
          color: colors[i % colors.length],
          chassisNumber: `DEMOCHASSIS${1001 + i}`,
          engineNumber: `DEMOENG${1001 + i}`,
          isDemo: true,
        },
      }),
    );
  }

  await mkdir(resolve('public/qr-codes'), { recursive: true });
  const helmets = [];
  for (let i = 0; i < helmetPlan.length; i += 1) {
    const plan = helmetPlan[i];
    const customer = plan.customer === null ? null : customerRows[plan.customer];
    const helmet = await prisma.helmet.create({
      data: {
        helmetCode: plan.code,
        customerId: customer?.customer.id,
        brand: brands[i % brands.length],
        model: `Demo ${plan.code.slice(-2)}`,
        color: colors[i % colors.length],
        size: ['M', 'L', 'XL'][i % 3],
        serialNumber: `DEMO-SN-${plan.code}`,
        manufactureYear: 2023 + (i % 3),
        status: customer ? 'ASSIGNED' : 'UNASSIGNED',
        isDemo: true,
      },
    });
    const token = tokenFor(plan.code, plan.qr, Boolean(customer));
    const scanUrl = `${qrBase}/scan/${token}`;
    const imagePath = `${token}.png`;
    await QRCode.toFile(resolve('public/qr-codes', imagePath), scanUrl, { width: 512, margin: 2, errorCorrectionLevel: 'M' });
    await prisma.helmetQrCode.create({
      data: {
        helmetId: helmet.id,
        token,
        status: plan.qr,
        scanUrl,
        imagePath,
        revokedAt: plan.qr === 'REVOKED' ? new Date() : null,
        revokedReason: plan.qr === 'REVOKED' ? 'DEMO DATA: revoked sample sticker' : null,
      },
    });
    if (plan.link && customer) {
      await prisma.helmetVehicleMapping.create({
        data: { helmetId: helmet.id, vehicleId: vehicles[plan.customer as number].id },
      });
    }
    helmets.push(helmet);
  }

  const policyDates: Record<(typeof policyStatuses)[number], [string, string]> = {
    ACTIVE: ['2026-05-01', '2027-05-01'],
    EXPIRED: ['2024-01-01', '2025-01-01'],
    PENDING: ['2026-12-01', '2027-12-01'],
    CANCELLED: ['2026-01-01', '2027-01-01'],
  };
  const policies = [];
  for (let i = 0; i < 10; i += 1) {
    const status = policyStatuses[i];
    const [start, end] = policyDates[status];
    const product = products[i % products.length];
    const primary = helmets.find((helmet) => helmet.helmetCode === helmetPlan.find((plan) => plan.customer === i && plan.link)?.code);
    policies.push(
      await prisma.insurancePolicy.create({
        data: {
          policyNumber: `POL${10001 + i}`,
          customerId: customerRows[i].customer.id,
          vehicleId: vehicles[i].id,
          productId: product.id,
          helmetId: primary?.id,
          status,
          startDate: day(start),
          endDate: day(end),
          premiumAmount: product.premiumAmount,
          coverageAmount: product.coverageAmount,
          isDemo: true,
        },
      }),
    );
  }

  await mkdir(resolve('public/documents'), { recursive: true });
  for (let i = 0; i < 3; i += 1) {
    const storedName = `demo-policy-${policies[i].policyNumber}.txt`;
    const body = `DEMO DATA — not a real insurance document.\nPolicy ${policies[i].policyNumber}\nThis file was generated for the local demo.\n`;
    await writeFile(resolve('public/documents', storedName), body);
    await prisma.policyDocument.create({
      data: {
        policyId: policies[i].id,
        fileName: `${policies[i].policyNumber}-schedule.txt`,
        storedName,
        mimeType: 'text/plain',
      },
    });
  }

  const claims = [];
  for (let i = 0; i < claimStatuses.length; i += 1) {
    const status = claimStatuses[i];
    claims.push(
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: `CLM${10001 + i}`,
          policyId: policies[i].id,
          customerId: customerRows[i].customer.id,
          status,
          incidentDate: day(`2026-0${i + 1}-15`),
          description: `DEMO DATA: fictional ${status.toLowerCase().replace('_', ' ')} incident for ${policies[i].policyNumber}. No real loss occurred.`,
          claimAmount: new Prisma.Decimal(String(8000 + i * 1500)),
          approvedAmount: status === 'APPROVED' || status === 'SETTLED' ? new Prisma.Decimal(String(7000 + i * 1000)) : null,
          rejectionReason: status === 'REJECTED' ? 'DEMO DATA: sample rejection, documents were incomplete.' : null,
          isDemo: true,
        },
      }),
    );
  }
  const claimFile = 'demo-claim-CLM10001.txt';
  await writeFile(resolve('public/documents', claimFile), 'DEMO DATA — fictional claim note. Not evidence of a real incident.\n');
  await prisma.claimDocument.create({
    data: { claimId: claims[0].id, fileName: 'claim-note.txt', storedName: claimFile, mimeType: 'text/plain' },
  });

  const paymentPlan = [
    { customer: 0, policy: 0, claim: null, amount: '2499.00', purpose: 'PREMIUM' as const, status: 'SUCCESS' as const, method: 'DEMO_UPI' },
    { customer: 1, policy: 1, claim: null, amount: '999.00', purpose: 'PREMIUM' as const, status: 'SUCCESS' as const, method: 'DEMO_CARD' },
    { customer: 2, policy: 2, claim: null, amount: '1499.00', purpose: 'PREMIUM' as const, status: 'PENDING' as const, method: 'DEMO_NETBANKING' },
    { customer: 3, policy: 3, claim: null, amount: '2499.00', purpose: 'RENEWAL' as const, status: 'SUCCESS' as const, method: 'DEMO_UPI' },
    { customer: 4, policy: 4, claim: 4, amount: '11000.00', purpose: 'CLAIM_SETTLEMENT' as const, status: 'SUCCESS' as const, method: 'DEMO_NETBANKING' },
  ];
  for (let i = 0; i < paymentPlan.length; i += 1) {
    const item = paymentPlan[i];
    await prisma.payment.create({
      data: {
        paymentRef: `PAY${10001 + i}`,
        customerId: customerRows[item.customer].customer.id,
        policyId: policies[item.policy].id,
        claimId: item.claim === null ? null : claims[item.claim].id,
        amount: new Prisma.Decimal(item.amount),
        purpose: item.purpose,
        status: item.status,
        method: item.method,
        isDemo: true,
        paidAt: item.status === 'SUCCESS' ? new Date() : null,
      },
    });
  }

  await prisma.renewalRequest.create({
    data: {
      policyId: policies[5].id,
      customerId: customerRows[5].customer.id,
      status: 'PENDING',
      note: 'DEMO DATA: please renew the expired sample policy. No payment taken.',
    },
  });

  await prisma.notification.createMany({
    data: [
      ...customerRows.map((row) => ({
        userId: row.user.id,
        title: 'Welcome',
        message: 'DEMO DATA: this is a fictional helmet insurance profile. Sign in with OTP 123456. No SMS is sent.',
        channel: 'IN_APP' as const,
      })),
      { userId: superAdmin.id, title: 'Demo database ready', message: 'DEMO DATA was loaded into local PostgreSQL.', channel: 'IN_APP' as const },
      { userId: admin.id, title: 'Renewal waiting', message: 'DEMO DATA: one renewal request is pending review.', channel: 'IN_APP' as const },
      ...claims.map((claim, index) => ({
        userId: customerRows[index].user.id,
        title: 'Claim sample',
        message: `DEMO DATA: ${claim.claimNumber} is ${claimStatuses[index]}.`,
        channel: 'IN_APP' as const,
      })),
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: superAdmin.id, action: 'CREATE', entity: 'users', entityId: admin.id, metadata: { demo: true, role: 'ADMIN' } },
      { userId: superAdmin.id, action: 'CREATE', entity: 'customers', metadata: { demo: true, count: 10 } },
      { userId: admin.id, action: 'CREATE', entity: 'helmets', metadata: { demo: true, count: 15 } },
      { userId: admin.id, action: 'CREATE', entity: 'helmet_qr_codes', metadata: { demo: true, states: ['ACTIVE', 'INACTIVE', 'REVOKED', 'UNASSIGNED'] } },
      { userId: admin.id, action: 'CREATE', entity: 'vehicles', metadata: { demo: true, count: 10 } },
      { userId: admin.id, action: 'CREATE', entity: 'insurance_policies', metadata: { demo: true, count: 10 } },
      { userId: admin.id, action: 'CREATE', entity: 'insurance_claims', metadata: { demo: true, count: 5 } },
      { userId: admin.id, action: 'CREATE', entity: 'payments', metadata: { demo: true, count: 5, moneyCollected: false } },
      { userId: null, action: 'SCAN', entity: 'helmet_qr_codes', metadata: { demo: true, note: 'Sample audit row for a public scan.' } },
      { userId: superAdmin.id, action: 'LOGIN', entity: 'users', entityId: superAdmin.id, metadata: { demo: true } },
    ],
  });

  await prisma.appSetting.createMany({
    data: [
      { key: 'app_name', value: 'Smart Helmet Insurance' },
      { key: 'support_email', value: 'demo-support@helmqr.example' },
      { key: 'demo_mode', value: 'true' },
    ],
  });
  await prisma.sequence.createMany({
    data: [
      { name: 'customer', value: 10010 },
      { name: 'helmet', value: 10015 },
      { name: 'vehicle', value: 10010 },
      { name: 'policy', value: 10010 },
      { name: 'claim', value: 10005 },
      { name: 'payment', value: 10005 },
    ],
  });

  console.log('Demo data loaded into local PostgreSQL.');
  console.log('Super admin: superadmin@demo.helmet.test / Admin@12345');
  console.log('Admin:       admin@demo.helmet.test / Admin@12345');
  console.log('Customer OTP for 9000000001–9000000010: 123456 (no SMS is sent)');
  console.log('Sample QR tokens:');
  console.log('  active-demo-token-hm10001');
  console.log('  inactive-demo-token-hm10008');
  console.log('  revoked-demo-token-hm10009');
  console.log('  unassigned-demo-token-hm10013');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

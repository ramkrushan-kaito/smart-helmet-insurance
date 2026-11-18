import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ShieldIcon from '@mui/icons-material/Shield';
import SportsMotorsportsIcon from '@mui/icons-material/SportsMotorsports';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingBlock, PublicBar } from '../components/ui';
import { api, cleanName, day, errorMessage, money } from '../services/api';
import { brand } from '../theme';
import { ScanCompany, ScanPurchase, ScanResult } from '../types';

const GST_RATE = 0.18;

const PLAN_COLORS: Record<string, string> = {
  NEXUS: '#2457F5',
  KAITO: '#7C3AED',
  APEX: '#0EA5A4',
  METRO: '#F97316',
  SENTINEL: '#0B1F3A',
};

function useScan(token: string) {
  const navigate = useNavigate();
  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    api
      .post<ScanResult>('/qr-codes/scan', { token })
      .then((response) => {
        if (live) setResult(response.data);
      })
      .catch((reason) => {
        if (!live) return;
        const message = errorMessage(reason);
        const status = axios.isAxiosError(reason) ? reason.response?.status : undefined;
        navigate('/invalid-qr', { replace: true, state: { message, status } });
      });
    return () => {
      live = false;
    };
  }, [token, navigate]);

  return result;
}

function Page({ children, hero }: { children: ReactNode; hero?: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicBar />
      {hero ? (
        <Box sx={{ background: brand.gradient, color: '#fff', px: 2, pt: { xs: 3, md: 4 }, pb: { xs: 9, md: 10 } }}>
          <Box sx={{ maxWidth: 1040, mx: 'auto' }}>{hero}</Box>
        </Box>
      ) : null}
      <Box sx={{ maxWidth: 1040, mx: 'auto', px: 2, pb: 6, pt: hero ? 0 : { xs: 3, md: 4 }, mt: hero ? { xs: -6, md: -7 } : 0 }}>
        {children}
      </Box>
    </Box>
  );
}

function Steps({ active, light }: { active: 0 | 1 | 2; light?: boolean }) {
  const labels = ['Choose plan', 'Payment', 'Policy issued'];
  const base = light ? 'rgba(255,255,255,' : 'rgba(11,31,58,';
  return (
    <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
      {labels.map((label, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <Stack key={label} direction="row" alignItems="center" sx={{ flex: index < labels.length - 1 ? 1 : 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  bgcolor: done || current ? (light ? '#fff' : 'primary.main') : 'transparent',
                  color: done || current ? (light ? brand.navy : '#fff') : `${base}0.6)`,
                  border: done || current ? 'none' : `1.5px solid ${base}0.35)`,
                }}
              >
                {done ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
              </Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: current ? 700 : 500, color: light ? (current ? '#fff' : `${base}0.7)`) : current ? 'text.primary' : 'text.secondary', display: { xs: current ? 'block' : 'none', sm: 'block' }, whiteSpace: 'nowrap' }}
              >
                {label}
              </Typography>
            </Stack>
            {index < labels.length - 1 ? (
              <Box sx={{ flex: 1, height: 2, mx: 1.5, borderRadius: 1, bgcolor: done ? (light ? '#fff' : 'primary.main') : `${base}0.2)` }} />
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
}

function HelmetCard({ result }: { result: ScanResult }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: '20px', boxShadow: brand.shadow, mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ background: brand.accentGradient, color: '#fff', borderRadius: '14px', width: 52, height: 52, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <SportsMotorsportsIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>Genuine helmet verified</Typography>
            </Stack>
            <Typography variant="h6" noWrap>{result.helmet.brand} {result.helmet.model}</Typography>
            <Typography variant="body2" color="text.secondary">{result.helmet.helmetCode} · {result.helmet.color} · Size {result.helmet.size}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <InfoPill icon={<SportsMotorsportsIcon sx={{ fontSize: 16 }} />} text={result.customer?.fullName ? cleanName(result.customer.fullName) : 'Rider not linked'} />
          {result.vehicle ? <InfoPill icon={<TwoWheelerIcon sx={{ fontSize: 16 }} />} text={result.vehicle.registrationNumber} /> : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ bgcolor: brand.soft, border: `1px solid ${brand.border}`, borderRadius: 999, px: 1.5, py: 0.6 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" fontWeight={600}>{text}</Typography>
    </Stack>
  );
}

function withGst(premium: number) {
  const gst = Math.round(premium * GST_RATE);
  return { gst, total: premium + gst };
}

function PlanLogo({ plan, size = 48 }: { plan: ScanCompany; size?: number }) {
  const color = PLAN_COLORS[plan.code] ?? brand.blue;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '14px',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        boxShadow: `0 6px 16px ${color}40`,
      }}
    >
      {plan.name.charAt(0)}
    </Box>
  );
}

export function CoverPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const result = useScan(token);
  const [open, setOpen] = useState<string | null>(null);

  if (!result) return <Page><LoadingBlock /></Page>;

  const plans = [...result.companies].sort((a, b) => a.premium - b.premium);

  return (
    <Page
      hero={
        <>
          <Steps active={0} light />
          <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 34 } }}>Choose your helmet cover</Typography>
          <Typography sx={{ opacity: 0.8, mt: 0.5 }}>
            {plans.length ? `${plans.length} plans from trusted insurers · cover starts today` : 'Plans appear once the helmet is linked to a rider'}
          </Typography>
        </>
      }
    >
      <HelmetCard result={result} />

      {!plans.length ? (
        <Alert severity="info" sx={{ borderRadius: '14px' }}>
          This helmet is not linked to a rider and vehicle yet, so a policy cannot be bought. Ask the dealer to assign it.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {plans.map((plan, index) => {
          const expanded = open === plan.code;
          return (
            <Paper
              key={plan.code}
              sx={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1.5px solid',
                borderColor: plan.tag === 'Best seller' ? 'primary.main' : 'divider',
                boxShadow: brand.shadow,
                transition: 'transform .2s ease, box-shadow .2s ease',
                animation: `fade-up .4s ease ${index * 0.06}s both`,
                '&:hover': { transform: 'translateY(-2px)', boxShadow: brand.shadowHover },
              }}
            >
              {plan.tag ? (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 20,
                    px: 1.5,
                    py: 0.5,
                    fontSize: 12,
                    fontWeight: 800,
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                    color: plan.tag === 'Best seller' ? '#fff' : '#2A1A00',
                    background: plan.tag === 'Best seller' ? brand.accentGradient : brand.amber,
                  }}
                >
                  {plan.tag}
                </Box>
              ) : null}
              <Box
                sx={{
                  p: { xs: 2, md: 2.5 },
                  pt: plan.tag ? { xs: 3.5, md: 3 } : { xs: 2, md: 2.5 },
                  display: 'grid',
                  gap: { xs: 2, md: 3 },
                  alignItems: 'center',
                  gridTemplateColumns: { xs: '1fr 1fr 1fr', md: '1.7fr 1fr 1fr 1fr 190px' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                  <PlanLogo plan={plan} />
                  <Box>
                    <Typography variant="h6" sx={{ lineHeight: 1.25 }}>{plan.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{plan.line}</Typography>
                  </Box>
                </Stack>
                <Metric label="Cover" value={compactMoney(plan.coverage)} />
                <Metric label="Claims settled" value={`${plan.claimRatio}%`} highlight />
                <Metric label="Term" value={`${plan.months} months`} />
                <Box
                  sx={{
                    gridColumn: { xs: '1 / -1', md: 'auto' },
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    alignItems: { xs: 'center', md: 'stretch' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    pt: { xs: 2, md: 0 },
                    borderTop: { xs: `1px dashed ${brand.border}`, md: 'none' },
                  }}
                >
                  <Box sx={{ textAlign: { md: 'right' } }}>
                    <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: -0.5 }}>{money(plan.premium)}</Typography>
                    <Typography variant="caption" color="text.secondary">for {plan.months} months + GST</Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ minWidth: 140 }}
                    onClick={() => navigate(`/cover/${encodeURIComponent(token)}/pay/${plan.code}`, { state: { plan, result } })}
                  >
                    Buy now
                  </Button>
                </Box>
              </Box>
              <Box sx={{ bgcolor: brand.soft, borderTop: `1px solid ${brand.border}` }}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => setOpen(expanded ? null : plan.code)}
                  endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
                  sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.2, borderRadius: 0, color: 'primary.main' }}
                >
                  {expanded ? 'Hide what’s covered' : 'See what’s covered'}
                </Button>
                <Collapse in={expanded}>
                  <Box sx={{ px: 2.5, pb: 2.5, display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                    {plan.features.map((feature) => (
                      <Stack key={feature} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#DCF7E9', color: 'success.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <CheckIcon sx={{ fontSize: 14 }} />
                        </Box>
                        <Typography variant="body2" fontWeight={500}>{feature}</Typography>
                      </Stack>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Page>
  );
}

function compactMoney(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 ? 1 : 0)} lakh`;
  return money(value);
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{label}</Typography>
      <Typography fontWeight={800} sx={{ color: highlight ? 'success.main' : 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

type Method = 'UPI' | 'CARD' | 'NETBANKING';

const METHODS: { id: Method; label: string; hint: string; icon: ReactNode }[] = [
  { id: 'UPI', label: 'UPI', hint: 'GPay, PhonePe, Paytm and more', icon: <QrCode2Icon /> },
  { id: 'CARD', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay', icon: <CreditCardIcon /> },
  { id: 'NETBANKING', label: 'Net banking', hint: 'All major banks', icon: <AccountBalanceIcon /> },
];

export function CoverPaymentPage() {
  const { token = '', code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { plan?: ScanCompany; result?: ScanResult } };
  const fetched = useScan(location.state?.result ? '' : token);
  const result = location.state?.result ?? fetched;
  const plan = location.state?.plan ?? result?.companies.find((item) => item.code === code) ?? null;
  const [method, setMethod] = useState<Method>('UPI');
  const [upi, setUpi] = useState('rider@okdemo');
  const [card, setCard] = useState({ number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123', name: 'Demo Rider' });
  const [bank, setBank] = useState('HDFC Bank');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!result) return <Page><LoadingBlock /></Page>;
  if (!plan) {
    return (
      <Page>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '14px' }}>This plan is not available for this helmet.</Alert>
        <Button variant="contained" onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)}>Back to plans</Button>
      </Page>
    );
  }

  const { gst, total } = withGst(plan.premium);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!plan) return;
    setPaying(true);
    setError(null);
    try {
      // Demo gateway: short pause so the "processing" state is visible.
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const response = await api.post<ScanPurchase>('/qr-codes/scan/buy', {
        token,
        companyCode: plan.code,
        paymentMethod: method,
      });
      navigate(`/cover/${encodeURIComponent(token)}/success`, {
        replace: true,
        state: { purchase: response.data, plan, method, total, helmetCode: result?.helmet.helmetCode },
      });
    } catch (reason) {
      setError(errorMessage(reason));
      setPaying(false);
    }
  }

  return (
    <Page
      hero={
        <>
          <Steps active={1} light />
          <Button
            onClick={() => navigate(`/cover/${encodeURIComponent(token)}`)}
            disabled={paying}
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'rgba(255,255,255,0.85)', ml: -1, mb: 0.5 }}
          >
            Change plan
          </Button>
          <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 34 } }}>Complete payment</Typography>
        </>
      }
    >
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, alignItems: 'start' }}>
        <Paper component="form" onSubmit={pay} sx={{ p: { xs: 2, md: 3 }, borderRadius: '20px', boxShadow: brand.shadow, order: { xs: 2, md: 1 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Payment method</Typography>
          <Stack spacing={1.5}>
            {METHODS.map((item) => {
              const selected = method === item.id;
              return (
                <Box
                  key={item.id}
                  onClick={() => !paying && setMethod(item.id)}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    cursor: paying ? 'default' : 'pointer',
                    border: '1.5px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? '#F3F6FF' : '#fff',
                    transition: 'all .15s ease',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 42, height: 42, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: selected ? 'primary.main' : brand.soft, color: selected ? '#fff' : 'primary.main', transition: 'all .15s ease' }}>
                      {item.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography fontWeight={700}>{item.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.hint}</Typography>
                    </Box>
                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: selected ? 'primary.main' : '#C5CEDD', display: 'grid', placeItems: 'center' }}>
                      {selected ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} /> : null}
                    </Box>
                  </Stack>
                  <Collapse in={selected}>
                    <Box sx={{ pt: 2 }} onClick={(event) => event.stopPropagation()}>
                      {item.id === 'UPI' ? (
                        <TextField fullWidth size="small" label="UPI ID" value={upi} onChange={(event) => setUpi(event.target.value)} disabled={paying} />
                      ) : null}
                      {item.id === 'CARD' ? (
                        <Stack spacing={1.5}>
                          <TextField size="small" label="Card number" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} disabled={paying} />
                          <Stack direction="row" spacing={1.5}>
                            <TextField size="small" label="Expiry" value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} disabled={paying} />
                            <TextField size="small" label="CVV" type="password" value={card.cvv} onChange={(event) => setCard({ ...card, cvv: event.target.value })} disabled={paying} />
                          </Stack>
                          <TextField size="small" label="Name on card" value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} disabled={paying} />
                        </Stack>
                      ) : null}
                      {item.id === 'NETBANKING' ? (
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Bank"
                          value={bank}
                          onChange={(event) => setBank(event.target.value)}
                          disabled={paying}
                          SelectProps={{ native: true }}
                        >
                          {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'].map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </TextField>
                      ) : null}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
          {error ? <Alert severity="error" sx={{ mt: 2, borderRadius: '14px' }}>{error}</Alert> : null}
          <Button type="submit" variant="contained" size="large" fullWidth disabled={paying} sx={{ mt: 3, py: 1.6, fontSize: 17 }}>
            {paying ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={20} color="inherit" />
                <span>Processing payment…</span>
              </Stack>
            ) : (
              `Pay ${money(total)}`
            )}
          </Button>
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
            <LockIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={600}>Demo checkout · no money is charged</Typography>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: brand.shadow, order: { xs: 1, md: 2 }, position: { md: 'sticky' }, top: { md: 88 } }}>
          <Box sx={{ p: { xs: 2, md: 2.5 }, borderBottom: `1px solid ${brand.border}` }}>
            <Typography variant="overline" color="text.secondary">Order summary</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
              <PlanLogo plan={plan} size={44} />
              <Box>
                <Typography fontWeight={800}>{plan.name}</Typography>
                <Typography variant="body2" color="text.secondary">{plan.line}</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Row label="Helmet" value={result.helmet.helmetCode} />
            <Row label="Cover amount" value={money(plan.coverage)} />
            <Row label="Policy term" value={`${plan.months} months`} />
            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
            <Row label="Premium" value={money(plan.premium)} />
            <Row label="GST (18%)" value={money(gst)} />
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: brand.soft, borderTop: `1px solid ${brand.border}` }}>
            <Typography fontWeight={700}>Total payable</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'primary.main' }}>{money(total)}</Typography>
          </Stack>
        </Paper>
      </Box>
    </Page>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }} spacing={2}>
      <Typography variant="body2" color={strong ? 'text.primary' : 'text.secondary'} fontWeight={strong ? 700 : 500}>{label}</Typography>
      <Typography variant="body2" fontWeight={strong ? 800 : 700} sx={{ textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

const METHOD_LABEL: Record<Method, string> = { UPI: 'UPI', CARD: 'Card', NETBANKING: 'Net banking' };

export function CoverSuccessPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { purchase: ScanPurchase; plan: ScanCompany; method: Method; total: number; helmetCode?: string };
  };
  const state = location.state;

  if (!state) {
    return (
      <Page>
        <Alert severity="info" sx={{ mb: 2, borderRadius: '14px' }}>Your policy is saved. Scan the helmet again to buy another plan.</Alert>
        <Button variant="contained" onClick={() => navigate(`/cover/${encodeURIComponent(token)}`, { replace: true })}>Back to plans</Button>
      </Page>
    );
  }

  const { purchase, plan, method, total, helmetCode } = state;

  return (
    <Page
      hero={
        <>
          <Steps active={2} light />
          <Stack alignItems="center" sx={{ textAlign: 'center', pt: 1 }}>
            <Box sx={{ position: 'relative', width: 84, height: 84, mb: 2 }}>
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'rgba(18,161,95,0.5)', animation: 'pulse-ring 1.6s ease-out infinite' }} />
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: '#12A15F', display: 'grid', placeItems: 'center', animation: 'pop-in .5s ease both', boxShadow: '0 10px 30px rgba(18,161,95,0.45)' }}>
                <CheckIcon sx={{ fontSize: 48, color: '#fff' }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 34 } }}>Payment successful</Typography>
            <Typography sx={{ opacity: 0.85, mt: 0.5 }}>
              You’re covered! {plan.name} is active{helmetCode ? ` on helmet ${helmetCode}` : ''}.
            </Typography>
          </Stack>
        </>
      }
    >
      <Paper sx={{ maxWidth: 560, mx: 'auto', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(11,31,58,0.16)', animation: 'fade-up .5s ease .15s both' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2.5 }}>
          <PlanLogo plan={plan} size={44} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary">Policy number</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>{purchase.policyNumber}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ bgcolor: '#DCF7E9', color: 'success.main', px: 1.25, py: 0.5, borderRadius: 999 }}>
            <ShieldIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={800}>ACTIVE</Typography>
          </Stack>
        </Stack>
        <Box sx={{ position: 'relative', borderTop: `2px dashed ${brand.border}` }}>
          <Box sx={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: '50%', bgcolor: 'background.default' }} />
          <Box sx={{ position: 'absolute', right: -12, top: -12, width: 24, height: 24, borderRadius: '50%', bgcolor: 'background.default' }} />
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Row label="Plan" value={plan.name} />
          <Row label="Cover amount" value={money(purchase.coverageAmount)} />
          <Row label="Valid from" value={day(purchase.startDate)} />
          <Row label="Valid until" value={day(purchase.endDate)} />
          <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
          <Row label="Payment ref" value={purchase.paymentRef} />
          <Row label="Paid via" value={METHOD_LABEL[method]} />
          <Row label="Amount paid" value={money(total)} strong />
        </Box>
        <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2.5, pt: 0 }}>
          <Button variant="contained" fullWidth size="large" startIcon={<CheckCircleIcon />} onClick={() => window.print()}>Download receipt</Button>
          <Button variant="outlined" fullWidth size="large" onClick={() => navigate('/scan')}>Scan another helmet</Button>
        </Stack>
      </Paper>
    </Page>
  );
}

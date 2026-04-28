import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  KeyRound, ArrowLeft, Copy, Check, Loader2, ShieldCheck, Mail, Lock,
} from 'lucide-react';

type Step =
  | 'loading'
  | 'pin'              // trusted device, just enter PIN
  | 'setup_request'    // no PIN yet — send OTP to set one
  | 'setup_otp'        // enter OTP + choose new PIN
  | 'enroll_request'   // PIN exists, untrusted device — send OTP
  | 'enroll_otp'       // enter OTP + existing PIN to trust device
  | 'codes'
  | 'locked'
  | 'error';

interface Props {
  employeeId: string;       // UUID or employee_id string
  onBack: () => void;
}

const tokenKey = (id: string) => `qr_device_token:${id}`;

export const QRCodeAccess: React.FC<Props> = ({ employeeId, onBack }) => {
  const [step, setStep] = useState<Step>('loading');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string>('');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [otp, setOtp] = useState('');
  const [codes, setCodes] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const deviceToken = useMemo(() => localStorage.getItem(tokenKey(employeeId)) || '', [employeeId]);

  const call = async (action: string, payload: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('qr-access', {
      body: { action, lookup: employeeId, ...payload },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const loadStatus = async () => {
    setStep('loading');
    setErr(null);
    try {
      const r = await call('status', { device_token: deviceToken || null });
      if (!r?.ok) throw new Error(r?.error || 'failed');
      setEmailMasked(r.email_masked || '');
      if (r.locked_until && new Date(r.locked_until).getTime() > Date.now()) {
        setLockedUntil(r.locked_until);
        setStep('locked');
        return;
      }
      if (!r.has_pin) setStep('setup_request');
      else if (r.device_trusted) setStep('pin');
      else setStep('enroll_request');
    } catch (e: any) {
      setErr(e.message); setStep('error');
    }
  };

  useEffect(() => { loadStatus(); /* eslint-disable-next-line */ }, [employeeId]);

  // tick for code countdowns
  useEffect(() => {
    if (step !== 'codes') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => {
    if (step !== 'codes') return;
    setCodes((prev) => prev.filter((c) => new Date(c.expires_at).getTime() > now));
  }, [now, step]);

  const requestOtp = async (purpose: 'setup_pin' | 'enroll_device') => {
    setBusy(true); setErr(null);
    try {
      const r = await call('request_otp', { purpose });
      if (!r?.ok) throw new Error(r?.error || 'failed');
      if (r.email_masked) setEmailMasked(r.email_masked);
      setStep(purpose === 'setup_pin' ? 'setup_otp' : 'enroll_otp');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitSetupPin = async () => {
    if (pin !== pin2) { setErr('PINs do not match'); return; }
    if (!/^\d{4}$/.test(pin)) { setErr('PIN must be 4 digits'); return; }
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code from email'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await call('set_pin', { otp, pin });
      if (!r?.ok) throw new Error(humanize(r?.error));
      localStorage.setItem(tokenKey(employeeId), r.device_token);
      setPin(''); setPin2(''); setOtp('');
      await fetchCodesWithPin(r.device_token, /* skip prompt */ undefined);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitEnroll = async () => {
    if (!/^\d{4}$/.test(pin)) { setErr('PIN must be 4 digits'); return; }
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code from email'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await call('enroll_device', { otp, pin, device_label: navigator.userAgent.slice(0, 60) });
      if (!r?.ok) {
        if (r?.error === 'locked') { setLockedUntil(r.locked_until); setStep('locked'); return; }
        throw new Error(humanize(r?.error));
      }
      localStorage.setItem(tokenKey(employeeId), r.device_token);
      await fetchCodesWithPin(r.device_token, pin);
      setPin(''); setOtp('');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitPin = async () => {
    if (!/^\d{4}$/.test(pin)) { setErr('PIN must be 4 digits'); return; }
    setBusy(true); setErr(null);
    try {
      await fetchCodesWithPin(deviceToken, pin);
      setPin('');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const fetchCodesWithPin = async (token: string, pinValue?: string) => {
    // After set_pin we have a fresh token but no PIN check needed for the current page;
    // we still call get_codes which requires a PIN to keep one path. Skip if no pin given.
    if (!pinValue) {
      // Show empty list; user can re-prompt by entering PIN
      setCodes([]);
      setStep('pin');
      return;
    }
    const r = await call('get_codes', { device_token: token, pin: pinValue });
    if (!r?.ok) {
      if (r?.error === 'locked') { setLockedUntil(r.locked_until); setStep('locked'); return; }
      throw new Error(humanize(r?.error));
    }
    const rows = (r.codes || []).filter((c: any) => new Date(c.expires_at).getTime() > Date.now());
    setCodes(rows);
    setStep('codes');
  };

  const copy = async (code: string, key: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch { /* ignore */ }
  };

  const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white">
      <button onClick={onBack} className="flex items-center gap-1 text-emerald-100 hover:text-white text-sm mb-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-3">
        <KeyRound className="w-7 h-7" />
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-emerald-100 text-xs">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
        <Header title="Login Code Access" subtitle={emailMasked || undefined} />
        <CardContent className="p-6 space-y-4">
          {step === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-600">{err || 'Something went wrong.'}</p>
              <Button variant="outline" onClick={loadStatus}>Try again</Button>
            </div>
          )}

          {step === 'locked' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="font-semibold text-amber-900">Too many wrong attempts</p>
              <p className="text-sm text-amber-800">Try again after {lockedUntil ? new Date(lockedUntil).toLocaleTimeString() : 'a few minutes'}.</p>
            </div>
          )}

          {step === 'setup_request' && (
            <div className="space-y-3 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm text-gray-700">
                You haven't set up a PIN yet. We'll email a 6-digit code to <strong>{emailMasked}</strong> so you can choose a 4-digit PIN.
              </p>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={() => requestOtp('setup_pin')} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" /> Email me a code</>}
              </Button>
            </div>
          )}

          {step === 'setup_otp' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 text-center">
                Enter the 6-digit code sent to <strong>{emailMasked}</strong>, then choose your new 4-digit PIN.
              </p>
              <Input inputMode="numeric" maxLength={6} placeholder="6-digit email code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <Input inputMode="numeric" maxLength={4} type="password" placeholder="New 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              <Input inputMode="numeric" maxLength={4} type="password" placeholder="Confirm PIN" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={submitSetupPin} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set PIN & trust this device'}
              </Button>
            </div>
          )}

          {step === 'enroll_request' && (
            <div className="space-y-3 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm text-gray-700">
                This device isn't trusted yet. We'll email a 6-digit code to <strong>{emailMasked}</strong>. You'll then enter that code plus your existing PIN to trust this device.
              </p>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={() => requestOtp('enroll_device')} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" /> Email me a code</>}
              </Button>
            </div>
          )}

          {step === 'enroll_otp' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 text-center">
                Enter the 6-digit code sent to <strong>{emailMasked}</strong>, then your existing 4-digit PIN.
              </p>
              <Input inputMode="numeric" maxLength={6} placeholder="6-digit email code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <Input inputMode="numeric" maxLength={4} type="password" placeholder="Your 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={submitEnroll} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Trust this device & view codes'}
              </Button>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 text-center">
                This device is trusted. Enter your 4-digit PIN to view codes.
              </p>
              <Input inputMode="numeric" maxLength={4} type="password" placeholder="4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={submitPin} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Show codes'}
              </Button>
            </div>
          )}

          {step === 'codes' && (
            <div className="space-y-4">
              {codes.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center text-sm text-amber-800">
                  No active codes right now. Trigger a new login or approval, then refresh.
                </div>
              )}
              {codes.map((c, i) => {
                const key = `${c.category}-${c.created_at}-${i}`;
                const remaining = Math.max(0, Math.floor((new Date(c.expires_at).getTime() - now) / 1000));
                return (
                  <div key={key} className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">{c.label || c.category}</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-4xl font-bold font-mono text-emerald-900 tracking-[0.25em] text-center my-3">{c.code}</p>
                    <p className="text-[10px] text-emerald-600 text-center">Sent to {c.recipient_email}</p>
                    <Button onClick={() => copy(c.code, key)} size="sm" className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700">
                      {copiedKey === key ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy</>}
                    </Button>
                  </div>
                );
              })}
              <Button variant="ghost" size="sm" onClick={loadStatus} className="w-full">Refresh</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function humanize(code?: string) {
  switch (code) {
    case 'invalid_pin': return 'Wrong PIN. Try again.';
    case 'invalid_or_expired_otp': return 'Email code is wrong or expired.';
    case 'invalid_pin_format': return 'PIN must be 4 digits.';
    case 'invalid_otp_format': return 'Enter the 6-digit email code.';
    case 'pin_not_set': return 'No PIN set yet.';
    case 'device_not_trusted': return 'This device is no longer trusted.';
    case 'employee_not_found': return 'Employee not found.';
    default: return code || 'Something went wrong.';
  }
}

export default QRCodeAccess;
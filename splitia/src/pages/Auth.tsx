import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Field, Section, Segmented } from '../components/ui';

export function SetPassword() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-xl mx-auto min-h-full" style={{ paddingTop: 'calc(var(--sat) + 72px)' }}>
      <h1 className="text-[30px] font-bold text-center">Nueva contraseña</h1>
      <p className="text-center text-sub mt-1 px-10">Elige la contraseña con la que entrarás a partir de ahora.</p>
      <Section><div className="px-4"><Field type="password" placeholder="Contraseña (mín. 6)" value={pw} minLength={6} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} /></div></Section>
      {msg && <p role="alert" className="mx-8 mt-3 text-[14px] text-neg">{msg}</p>}
      <div className="mx-4 mt-6"><Button className="w-full" loading={busy} disabled={pw.length < 6} onClick={async () => { setBusy(true); setMsg(await updatePassword(pw)); setBusy(false); }}>Guardar y entrar</Button></div>
    </div>
  );
}

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name || email.split('@')[0]);
    setBusy(false);
    if (err) setMsg({ text: err, ok: false });
    else if (mode === 'up') setMsg({ text: 'Revisa tu correo para confirmar la cuenta.', ok: true });
  };

  const forgot = async () => {
    if (!email) return setMsg({ text: 'Escribe tu correo y pulsa de nuevo.', ok: false });
    setBusy(true);
    const err = await resetPassword(email);
    setBusy(false);
    setMsg(err ? { text: err, ok: false } : { text: 'Te hemos enviado un enlace para crear una contraseña.', ok: true });
  };

  return (
    <div className="max-w-xl mx-auto min-h-full pb-10" style={{ paddingTop: 'calc(var(--sat) + 56px)' }}>
      <div className="flex flex-col items-center gap-3 mb-6">
        <img src="/pwa-192.png" alt="" className="size-20 rounded-[22px] shadow-lg" />
        <h1 className="text-[34px] font-bold tracking-tight">SplitIA</h1>
        <p className="text-sub text-[15px]">Gastos compartidos con IA</p>
      </div>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'in', label: 'Entrar' }, { value: 'up', label: 'Crear cuenta' }]} />
      <form onSubmit={submit}>
        <Section>
          {mode === 'up' && <div className="px-4"><Field placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>}
          <div className="px-4"><Field type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div className="px-4"><Field type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required={mode === 'up' || true} minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
        </Section>
        {msg && <p role="alert" className={`mx-8 mt-3 text-[14px] ${msg.ok ? 'text-pos' : 'text-neg'}`}>{msg.text}</p>}
        <div className="mx-4 mt-6"><Button type="submit" loading={busy} className="w-full">{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</Button></div>
      </form>
      {mode === 'in' && <button onClick={forgot} className="press block mx-auto mt-4 text-tint text-[15px]">He olvidado mi contraseña</button>}
    </div>
  );
}

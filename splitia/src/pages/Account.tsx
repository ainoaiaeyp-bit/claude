import { useRef, useState } from 'react';
import { Camera, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/mutations';
import { prepareImage } from '../lib/ai';
import { InstallCard } from '../components/Install';
import { Avatar, Button, Field, NavBar, Row, Section, useToast } from '../components/ui';

export default function Account() {
  const { user, signOut } = useAuth();
  const { snap, reload } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const current = snap?.profiles[user!.id] ?? (user?.user_metadata?.display_name as string | undefined) ?? '';
  const avatar = snap?.avatars[user!.id] ?? null;
  const [name, setName] = useState<string | null>(null);
  const value = name ?? current;

  const save = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: value.trim() } as never).eq('user_id', user!.id);
    if (error) return toast(error.message, 'error');
    toast('Nombre actualizado'); setName(null); void reload();
  };

  const pickAvatar = async (f: File) => {
    try {
      const b64 = await prepareImage(f, 400);
      const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
      await uploadAvatar(user!.id, new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      toast('Foto actualizada'); void reload();
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo subir la foto', 'error'); }
  };

  return (
    <>
      <NavBar large title="Cuenta" />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickAvatar(f); }} />
      <div className="flex flex-col items-center gap-2 mt-5">
        <button onClick={() => fileRef.current?.click()} aria-label="Cambiar foto" className="press relative">
          <Avatar name={current || user?.email || '?'} url={avatar} size={88} />
          <span className="absolute -bottom-1 -right-1 size-8 rounded-full bg-tint text-white grid place-items-center ring-2 ring-bg"><Camera size={16} /></span>
        </button>
        <div className="text-[21px] font-semibold">{current || 'Sin nombre'}</div>
        <div className="text-sub text-[15px]">{user?.email}</div>
      </div>
      <Section title="Nombre visible" footer="Es el nombre que ven los demás miembros de tus grupos.">
        <div className="px-4"><Field value={value} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" /></div>
      </Section>
      {name !== null && name.trim() !== current && <div className="mx-4 mt-4"><Button className="w-full" onClick={save} disabled={!name.trim()}>Guardar</Button></div>}
      <InstallCard />
      <Section><Row onClick={() => void signOut()} danger icon={<LogOut size={20} className="text-neg" />} title="Cerrar sesión" /></Section>
      <p className="text-center text-sub text-[12px] mt-6">SplitIA · tus datos viven en tu propio servidor</p>
    </>
  );
}

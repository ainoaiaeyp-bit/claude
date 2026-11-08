import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Row, Section } from './ui';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Tarjeta para instalar la PWA: botón nativo en Android/escritorio, instrucciones en iPhone. */
export function InstallCard() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [done, setDone] = useState(standalone());
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const installed = () => setDone(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', installed); };
  }, []);

  if (done) return <Section><Row icon={<Download size={20} className="text-pos" />} title="App instalada" subtitle="Ya la usas como aplicación" /></Section>;
  if (evt) return (
    <Section><Row onClick={async () => { await evt.prompt(); const c = await evt.userChoice; if (c.outcome === 'accepted') setDone(true); setEvt(null); }}
      icon={<Download size={20} className="text-tint" />} title="Instalar SplitIA" subtitle="Añádela a tu pantalla de inicio" chevron /></Section>
  );
  if (isIOS()) return (
    <Section title="Instalar en iPhone">
      <Row icon={<Share size={20} className="text-tint" />} title={<span className="whitespace-normal text-[15px]">En Safari pulsa <b>Compartir</b> y luego <b>«Añadir a pantalla de inicio»</b>.</span>} />
    </Section>
  );
  return null;
}

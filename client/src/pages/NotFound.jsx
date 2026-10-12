import { IconArrowLeft, IconMicroscope } from '@tabler/icons-react';
import { Button } from '../components/ui/Button';
import { NAV_H } from '../lib/layout';

export default function NotFound({ onNavigate }) {
  return (
    <main
      className="flex min-h-[80vh] flex-col items-center justify-center bg-canvas px-4 text-center"
      style={{ paddingTop: NAV_H }}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-white text-brand shadow-soft">
        <IconMicroscope size={28} stroke={1.5} aria-hidden="true" />
      </span>
      <h1 className="ot-num mt-6 text-[4rem] font-[650] leading-none tracking-[-0.05em] text-ink">404</h1>
      <p className="ot-small mt-3 max-w-xs">
        This page doesn't exist. Head back to the platform.
      </p>
      <Button variant="primary" className="mt-8" onClick={() => onNavigate('home')}>
        <IconArrowLeft size={17} stroke={1.75} aria-hidden="true" />
        Back to Home
      </Button>
    </main>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Cpu, Microchip, Moon, Sun, FlaskConical, Home as HomeIcon, Waypoints } from 'lucide-react';
import { useRoute } from './lib/router';
import { useStore } from './state/store';
import { Home } from './screens/Home';

const WorldMapScreen = lazy(() => import('./screens/WorldMap'));
const LessonScreen = lazy(() => import('./screens/Lesson'));
const BridgeScreen = lazy(() => import('./screens/Bridge'));
const BridgeRace = lazy(() => import('./screens/BridgeRace'));
const CacheLab = lazy(() => import('./screens/CacheLab'));
const Foundations = lazy(() => import('./screens/Foundations'));
const PartScreen = lazy(() => import('./screens/Part'));

function Wordmark() {
  return (
    <a href="#/" className="wordmark" aria-label="Die Atlas home">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="3.5" y="3.5" width="15" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="7.5" y="7.5" width="7" height="7" rx="1" fill="currentColor" />
        <path d="M7 0.5v2M11 0.5v2M15 0.5v2M7 19.5v2M11 19.5v2M15 19.5v2M0.5 7h2M0.5 11h2M0.5 15h2M19.5 7h2M19.5 11h2M19.5 15h2" stroke="currentColor" strokeWidth="1" opacity=".6" />
      </svg>
      <span>Die Atlas</span>
    </a>
  );
}

function LevelSwitch() {
  const level = useStore(s => s.level), setLevel = useStore(s => s.setLevel);
  return (
    <div className="seg" role="group" aria-label="Explanation level">
      <button aria-pressed={level === 'beginner'} onClick={() => setLevel('beginner')}>Beginner</button>
      <button aria-pressed={level === 'intermediate'} onClick={() => setLevel('intermediate')}>Intermediate</button>
    </div>
  );
}

function ThemeToggle() {
  const theme = useStore(s => s.theme), setTheme = useStore(s => s.setTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="iconbtn" onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun size={17} strokeWidth={1.6} /> : <Moon size={17} strokeWidth={1.6} />}
    </button>
  );
}

function LevelToast() {
  const level = useStore(s => s.level);
  const prev = useRef(level);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === level) return;
    prev.current = level;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2400);
    return () => clearTimeout(t);
  }, [level]);
  return (
    <div className={'toast' + (on ? ' on' : '')} role="status" aria-live="polite">
      {level === 'beginner' ? <><b>Beginner</b><span className="text2">Plain words, math tucked away.</span></> : <><b>Intermediate</b><span className="text2">Real names, real numbers, math open.</span></>}
    </div>
  );
}

const NAV = [
  { href: '#/cpu', match: '/cpu', label: 'CPU', icon: Cpu },
  { href: '#/gpu', match: '/gpu', label: 'GPU', icon: Microchip },
  { href: '#/bridge', match: '/bridge', label: 'The bridge', icon: Waypoints },
  { href: '#/lab/cache', match: '/lab', label: 'Dielab', icon: FlaskConical },
];

export function App() {
  const route = useRoute();
  const p = route.path;
  useEffect(() => { if (!p.startsWith('/cpu') && !p.startsWith('/gpu')) window.scrollTo(0, 0); document.body.dataset.route = route.parts[0] ?? 'home'; }, [p, route.parts]);

  let screen;
  if (p === '/') screen = <Home />;
  else if (p === '/cpu' || p === '/gpu') screen = <WorldMapScreen world={p.slice(1) as 'cpu' | 'gpu'} key={p} />;
  else if (route.parts[0] === 'lesson' && route.parts[1]) screen = <LessonScreen id={route.parts[1]} key={route.parts[1]} />;
  else if (route.parts[0] === 'part' && route.parts[1]) screen = <PartScreen id={route.parts[1]} key={route.parts[1]} />;
  else if (p === '/bridge') screen = <BridgeScreen />;
  else if (p === '/bridge/why') screen = <BridgeRace />;
  else if (p === '/lab/cache' || p === '/lab') screen = <CacheLab />;
  else if (p === '/foundations') screen = <Foundations />;
  else screen = <div className="page"><h1>Not found</h1><p className="text2" style={{ marginTop: 16 }}><a className="link" href="#/">Back to the atlas</a></p></div>;

  return (
    <>
      <header className="topbar">
        <Wordmark />
        <nav className="nav" aria-label="Worlds">
          {NAV.map(n => (
            <a key={n.href} href={n.href} aria-current={p.startsWith(n.match) ? 'page' : undefined}>{n.label}</a>
          ))}
        </nav>
        <div className="right">
          <LevelSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main>
        <Suspense fallback={<div className="page muted" aria-busy>Loading…</div>}>{screen}</Suspense>
      </main>
      <nav className="mobile-nav" aria-label="Worlds">
        <a href="#/" aria-current={p === '/' ? 'page' : undefined}><HomeIcon size={18} strokeWidth={1.6} />Home</a>
        {NAV.map(n => (
          <a key={n.href} href={n.href} aria-current={p.startsWith(n.match) ? 'page' : undefined}><n.icon size={18} strokeWidth={1.6} />{n.label.replace(' world', '').replace('The ', '')}</a>
        ))}
      </nav>
      <LevelToast />
    </>
  );
}

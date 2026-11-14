import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  Trophy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flag,
} from 'lucide-react';

interface StressGamesProps {
  compact?: boolean;
}

type GameTab =
  | 'zen'
  | 'runner'
  | 'memory'
  | 'popit'
  | 'breathe'
  | 'g2048'
  | 'mines'
  | 'ttt'
  | 'snake'
  | 'catcher'
  | 'simon'
  | 'sliding';

const GAME_CATALOG: Array<{ id: GameTab; label: string }> = [
  { id: 'zen', label: '1. Amatista Zen' },
  { id: 'runner', label: '2. Nixora Runner' },
  { id: 'memory', label: '3. Memoria 4×4' },
  { id: 'popit', label: '4. Pop-It 6×6' },
  { id: 'breathe', label: '5. Respiración 4-7-8' },
  { id: 'g2048', label: '6. 2048 Cristal' },
  { id: 'mines', label: '7. Buscaminas Zen' },
  { id: 'ttt', label: '8. Tres en Raya' },
  { id: 'snake', label: '9. Serpiente Voxel' },
  { id: 'catcher', label: '10. Atrapa Estrellas' },
  { id: 'simon', label: '11. Simón Musical' },
  { id: 'sliding', label: '12. Puzzle Deslizante' },
];

function playChime(freq: number, duration = 0.14, muted = false, type: OscillatorType = 'sine') {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration * 1000 + 80);
  } catch {
    // Ignore audio context restrictions
  }
}

/* ---------------- 1. AMATISTA ZEN ---------------- */
interface ZenOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  kind: 'amethyst' | 'star' | 'quartz';
  points: number;
}
const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880];

const ZenPopGame: React.FC<{ compact: boolean; muted: boolean }> = ({ compact, muted }) => {
  const [gameState, setGameState] = useState<'TITLE_MENU' | 'PLAYING' | 'PAUSED'>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [orbs, setOrbs] = useState<ZenOrb[]>([]);
  const nextIdRef = useRef(1);

  const spawnOrb = useCallback((): ZenOrb => {
    const roll = Math.random();
    const kind: ZenOrb['kind'] = roll > 0.84 ? 'star' : roll > 0.45 ? 'amethyst' : 'quartz';
    return {
      id: nextIdRef.current++,
      x: 12 + Math.random() * 76,
      y: 105,
      radius: kind === 'star' ? 24 : kind === 'amethyst' ? 28 : 23,
      speed: 0.45 + Math.random() * 0.55,
      kind,
      points: kind === 'star' ? 30 : kind === 'amethyst' ? 15 : 10,
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const tick = setInterval(() => {
      setOrbs((prev) => {
        const moved = prev.map((o) => ({ ...o, y: o.y - o.speed })).filter((o) => o.y > -12);
        if (moved.length < (compact ? 5 : 8) && Math.random() < 0.25) moved.push(spawnOrb());
        return moved;
      });
    }, 32);
    return () => clearInterval(tick);
  }, [gameState, compact, spawnOrb]);

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setOrbs([spawnOrb(), spawnOrb(), spawnOrb()]);
    setGameState('PLAYING');
  };

  const popOrb = (orb: ZenOrb) => {
    if (gameState !== 'PLAYING') return;
    const freq = PENTATONIC[(combo + orb.id) % PENTATONIC.length];
    playChime(orb.kind === 'star' ? freq * 1.25 : freq, 0.18, muted);
    setOrbs((prev) => prev.filter((o) => o.id !== orb.id));
    setCombo((c) => c + 1);
    setScore((s) => {
      const next = s + orb.points + Math.min(combo * 2, 20);
      setBestScore((b) => Math.max(b, next));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
        <div className="flex items-center gap-3">
          <span>Puntos: <strong className="text-violet-300">{score}</strong></span>
          <span>Racha: <strong className="text-amber-300">x{combo}</strong></span>
          <span>Récord: <strong className="text-slate-100">{bestScore}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          {gameState === 'PLAYING' && (
            <button type="button" onClick={() => setGameState('PAUSED')} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">
              <Pause className="h-3 w-3" /> Pausar
            </button>
          )}
          {gameState === 'PAUSED' && (
            <button type="button" onClick={() => setGameState('PLAYING')} className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white">
              <Play className="h-3 w-3" /> Seguir
            </button>
          )}
          {gameState !== 'TITLE_MENU' && (
            <button type="button" onClick={startGame} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">
              <RotateCcw className="h-3 w-3" /> Reiniciar
            </button>
          )}
        </div>
      </div>

      <div className={`relative w-full overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-[#0E111D] via-[#131628] to-[#1A1330] select-none ${compact ? 'h-56' : 'h-80'}`}>
        {gameState === 'TITLE_MENU' && (
          <div className="flex h-full flex-col items-center justify-center p-5 text-center">
            <p className="font-display text-base font-bold text-slate-100">Amatista Zen</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">Toca los cristales de amatista y estrellas Gemini flotantes para relajarte con tonos suaves.</p>
            <button type="button" onClick={startGame} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500">
              <Play className="h-3.5 w-3.5" /> Empezar
            </button>
          </div>
        )}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <button type="button" onClick={() => setGameState('PLAYING')} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white">
              <Play className="h-3.5 w-3.5" /> Reanudar
            </button>
          </div>
        )}
        {gameState !== 'TITLE_MENU' &&
          orbs.map((orb) => (
            <button
              key={orb.id}
              type="button"
              onClick={() => popOrb(orb)}
              style={{ left: `${orb.x}%`, top: `${orb.y}%`, width: `${orb.radius * 2}px`, height: `${orb.radius * 2}px`, transform: 'translate(-50%, -50%)' }}
              aria-label={`Cristal ${orb.kind}`}
              className="absolute flex items-center justify-center rounded-full active:scale-90"
            >
              {orb.kind === 'star' ? (
                <svg viewBox="0 0 32 32" className="h-full w-full"><path d="M16 2 C17.5 11 21 14.5 30 16 C21 17.5 17.5 21 16 30 C14.5 21 11 17.5 2 16 C11 14.5 14.5 11 16 2 Z" fill="#FBBF24" /></svg>
              ) : orb.kind === 'amethyst' ? (
                <svg viewBox="0 0 36 36" className="h-full w-full"><polygon points="18,2 30,11 26,33 10,33 6,11" fill="#8B5CF6" stroke="#DDD6FE" strokeWidth="1.2" /></svg>
              ) : (
                <svg viewBox="0 0 32 32" className="h-full w-full"><polygon points="16,3 27,13 22,29 10,29 5,13" fill="#6366F1" stroke="#A5B4FC" strokeWidth="1" /></svg>
              )}
            </button>
          ))}
      </div>
    </div>
  );
};

/* ---------------- 2. NIXORA RUNNER ---------------- */
const VoxelRunnerGame: React.FC<{ compact: boolean; muted: boolean }> = ({ compact, muted }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'TITLE_MENU' | 'PLAYING' | 'GAME_OVER'>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const stateRef = useRef({
    playerY: 0,
    velocityY: 0,
    isGrounded: true,
    obstacles: [] as Array<{ x: number; w: number; h: number }>,
    stars: [] as Array<{ x: number; y: number; collected: boolean }>,
    frame: 0,
    score: 0,
    speed: 4.2,
  });

  const resetAndStart = useCallback(() => {
    stateRef.current = { playerY: 0, velocityY: 0, isGrounded: true, obstacles: [], stars: [], frame: 0, score: 0, speed: 4.2 };
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const jump = useCallback(() => {
    if (gameState !== 'PLAYING') {
      resetAndStart();
      return;
    }
    const st = stateRef.current;
    if (st.isGrounded) {
      st.velocityY = -10.5;
      st.isGrounded = false;
      playChime(523.25, 0.1, muted, 'triangle');
    }
  }, [gameState, muted, resetAndStart]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (gameState === 'PLAYING') {
          e.preventDefault();
          jump();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, jump]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const width = canvas.width;
    const height = canvas.height;
    const groundY = height - 28;
    const playerX = 48;
    const playerSize = 24;

    const loop = () => {
      const st = stateRef.current;
      st.frame += 1;
      st.speed = Math.min(8.5, 4.2 + st.score / 500);
      st.playerY += st.velocityY;
      st.velocityY += 0.56;
      if (st.playerY >= 0) {
        st.playerY = 0;
        st.velocityY = 0;
        st.isGrounded = true;
      }

      if (st.frame % 75 === 0 || (st.obstacles.length === 0 && st.frame > 30)) {
        if (Math.random() > 0.25) st.obstacles.push({ x: width + 20, w: 16 + Math.floor(Math.random() * 10), h: 22 + Math.floor(Math.random() * 16) });
      }
      if (st.frame % 95 === 0) st.stars.push({ x: width + 30, y: groundY - 45 - Math.random() * 45, collected: false });

      st.obstacles = st.obstacles.map((ob) => ({ ...ob, x: ob.x - st.speed })).filter((ob) => ob.x + ob.w > -20);
      st.stars = st.stars.map((s) => ({ ...s, x: s.x - st.speed })).filter((s) => s.x > -20 && !s.collected);

      const pTop = groundY - playerSize + st.playerY;
      const pBottom = groundY + st.playerY;
      for (const ob of st.obstacles) {
        if (playerX + playerSize - 3 > ob.x && playerX + 3 < ob.x + ob.w && pBottom > groundY - ob.h + 3) {
          playChime(196, 0.25, muted, 'sawtooth');
          setBestScore((b) => Math.max(b, Math.floor(st.score)));
          setGameState('GAME_OVER');
          return;
        }
      }
      for (const star of st.stars) {
        if (!star.collected && Math.abs(playerX + 12 - star.x) < 20 && Math.abs(pTop + 12 - star.y) < 20) {
          star.collected = true;
          st.score += 25;
          playChime(783.99, 0.14, muted);
        }
      }

      st.score += 0.2;
      if (st.frame % 4 === 0) setScore(Math.floor(st.score));

      ctx.fillStyle = '#0D101B';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(playerX, pTop, playerSize, playerSize);
      ctx.fillStyle = '#DDD6FE';
      ctx.fillRect(playerX + 4, pTop + 4, 8, 8);

      ctx.fillStyle = '#EF4444';
      for (const ob of st.obstacles) {
        ctx.beginPath();
        ctx.moveTo(ob.x, groundY);
        ctx.lineTo(ob.x + ob.w / 2, groundY - ob.h);
        ctx.lineTo(ob.x + ob.w, groundY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#FBBF24';
      for (const star of st.stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, muted]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
        <div className="flex items-center gap-3">
          <span>Distancia: <strong className="text-violet-300">{score}</strong></span>
          <span>Récord: <strong className="text-slate-100">{bestScore}</strong></span>
        </div>
        <span className="text-[11px] text-slate-400">Toca o pulsa Espacio para saltar</span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0D101B]">
        <canvas ref={canvasRef} width={compact ? 340 : 640} height={compact ? 190 : 250} onClick={jump} className="block w-full cursor-pointer touch-manipulation" />
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D101B]/90 p-4 text-center">
            <p className="font-display text-base font-bold text-slate-100">Nixora Runner</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">Salta picos de obsidiana y atrapa estrellas doradas.</p>
            <button type="button" onClick={resetAndStart} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white">
              <Play className="h-3.5 w-3.5" /> Jugar ahora
            </button>
          </div>
        )}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-4 text-center">
            <Trophy className="mb-1 h-6 w-6 text-amber-400" />
            <p className="font-display text-base font-bold text-slate-50">Puntaje: {score}</p>
            <button type="button" onClick={resetAndStart} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white">
              <RotateCcw className="h-3.5 w-3.5" /> Jugar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- 3. MEMORIA 4x4 ---------------- */
const SYMBOLS = ['✦', '◆', '❖', '⬡', '✧', '◈', '▲', '⬢'];
const MemoryMatrixGame: React.FC<{ compact: boolean; muted: boolean }> = ({ compact, muted }) => {
  const buildDeck = () => {
    const pairs = [...SYMBOLS, ...SYMBOLS];
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs.map((symbol, uid) => ({ uid, symbol, flipped: false, matched: false }));
  };
  const [tiles, setTiles] = useState(buildDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const matchedCount = tiles.filter((t) => t.matched).length / 2;

  const restart = () => {
    setTiles(buildDeck());
    setSelected([]);
    setMoves(0);
    setLocked(false);
  };

  const flipTile = (idx: number) => {
    if (locked || tiles[idx].flipped || tiles[idx].matched) return;
    playChime(440 + idx * 12, 0.08, muted);
    const updated = tiles.map((t, i) => (i === idx ? { ...t, flipped: true } : t));
    setTiles(updated);
    const nextSel = [...selected, idx];
    setSelected(nextSel);
    if (nextSel.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = nextSel;
      if (updated[a].symbol === updated[b].symbol) {
        playChime(659.25, 0.2, muted);
        setTimeout(() => {
          setTiles((prev) => prev.map((t, i) => (i === a || i === b ? { ...t, matched: true } : t)));
          setSelected([]);
          setLocked(false);
        }, 250);
      } else {
        setTimeout(() => {
          setTiles((prev) => prev.map((t, i) => (i === a || i === b ? { ...t, flipped: false } : t)));
          setSelected([]);
          setLocked(false);
        }, 620);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
        <div className="flex gap-3">
          <span>Parejas: <strong className="text-violet-300">{matchedCount}/8</strong></span>
          <span>Intentos: <strong className="text-slate-100">{moves}</strong></span>
        </div>
        <button type="button" onClick={restart} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
      </div>
      {matchedCount === 8 ? (
        <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
          <Trophy className="mb-2 h-7 w-7 text-amber-400" />
          <p className="font-display text-base font-bold text-slate-50">Completado en {moves} intentos</p>
          <button type="button" onClick={restart} className="mt-3 min-h-[44px] rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white">Jugar de nuevo</button>
        </div>
      ) : (
        <div className={`grid grid-cols-4 gap-2 ${compact ? '' : 'mx-auto w-full max-w-sm'}`}>
          {tiles.map((tile, idx) => {
            const rev = tile.flipped || tile.matched;
            return (
              <button
                key={tile.uid}
                type="button"
                onClick={() => flipTile(idx)}
                className={`flex min-h-[48px] items-center justify-center rounded-lg border font-display text-lg font-bold transition-all ${compact ? 'h-12' : 'h-16'} ${
                  tile.matched ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-300' : rev ? 'border-violet-500/60 bg-violet-900/40 text-amber-300' : 'border-slate-800 bg-[#141827] text-slate-600 hover:border-violet-500/40'
                }`}
              >
                {rev ? tile.symbol : '·'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---------------- 4. POP-IT SENSORIAL 6x6 ---------------- */
const PopItGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [popped, setPopped] = useState<boolean[]>(() => Array(36).fill(false));
  const [rounds, setRounds] = useState(0);
  const count = popped.filter(Boolean).length;

  const toggleBubble = (idx: number) => {
    playChime(320 + (idx % 6) * 55 + Math.floor(idx / 6) * 20, 0.08, muted, 'triangle');
    setPopped((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      if (next.every(Boolean)) {
        setTimeout(() => {
          playChime(784, 0.25, muted);
          setRounds((r) => r + 1);
          setPopped(Array(36).fill(false));
        }, 350);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>Burbujas: <strong className="text-violet-300">{count}/36</strong> · Tableros: <strong>{rounds}</strong></span>
        <button type="button" onClick={() => setPopped(Array(36).fill(false))} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
      </div>
      <div className="mx-auto grid w-full max-w-xs grid-cols-6 gap-2 rounded-2xl border border-slate-800 bg-[#121524] p-3">
        {popped.map((isPopped, idx) => {
          const rowColors = ['bg-violet-500', 'bg-fuchsia-500', 'bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500'];
          const rowColor = rowColors[Math.floor(idx / 6)];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleBubble(idx)}
              aria-label={`Burbuja ${idx + 1}`}
              className={`aspect-square min-h-[40px] rounded-full border-2 transition-all duration-100 ${
                isPopped
                  ? 'scale-90 border-slate-900 bg-[#0B0D14] shadow-inner'
                  : `${rowColor} border-white/25 shadow-md active:scale-90`
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- 5. RESPIRACIÓN GUIADA 4-7-8 ---------------- */
const BreathingGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhase((cur) => {
          if (cur === 'in') {
            playChime(523.25, 0.2, muted);
            setSecondsLeft(7);
            return 'hold';
          }
          if (cur === 'hold') {
            playChime(392, 0.25, muted);
            setSecondsLeft(8);
            return 'out';
          }
          playChime(440, 0.2, muted);
          setCycles((c) => c + 1);
          setSecondsLeft(4);
          return 'in';
        });
        return 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, muted]);

  const phaseText = phase === 'in' ? 'Inhala profundo' : phase === 'hold' ? 'Sostén el aire' : 'Exhala lento';
  const scaleClass = !running ? 'scale-95' : phase === 'in' ? 'scale-110' : phase === 'hold' ? 'scale-110' : 'scale-75';

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-[#0D101B] p-6 text-center">
      <div className={`flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 border-violet-400/50 bg-violet-600/20 transition-transform duration-1000 ${scaleClass}`}>
        <span className="font-display text-2xl font-bold text-slate-50 tabular-nums">{running ? secondsLeft : '4-7-8'}</span>
        <span className="mt-1 text-xs text-violet-200">{running ? phaseText : 'Calma rápida'}</span>
      </div>
      <p className="text-xs text-slate-400 tabular-nums">Ciclos completados: <strong className="text-slate-100">{cycles}</strong></p>
      <button
        type="button"
        onClick={() => {
          if (!running) {
            setPhase('in');
            setSecondsLeft(4);
          }
          setRunning(!running);
        }}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {running ? 'Pausar sesión' : 'Iniciar respiración'}
      </button>
    </div>
  );
};

/* ---------------- 6. 2048 CRISTAL ---------------- */
function spawn2048(board: number[]): number[] {
  const empty = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1);
  if (empty.length === 0) return board;
  const next = [...board];
  next[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  return next;
}
function slideRow(row: number[]): { next: number[]; gained: number } {
  const nonZero = row.filter((v) => v !== 0);
  const res: number[] = [];
  let gained = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const merged = nonZero[i] * 2;
      res.push(merged);
      gained += merged;
      i++;
    } else {
      res.push(nonZero[i]);
    }
  }
  while (res.length < 4) res.push(0);
  return { next: res, gained };
}

const Game2048: React.FC<{ muted: boolean }> = ({ muted }) => {
  const initBoard = () => spawn2048(spawn2048(Array(16).fill(0)));
  const [board, setBoard] = useState<number[]>(initBoard);
  const [score, setScore] = useState(0);

  const move = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => {
      setBoard((prev) => {
        const next = [...prev];
        let totalGained = 0;
        let changed = false;

        for (let i = 0; i < 4; i++) {
          const line =
            dir === 'left' || dir === 'right'
              ? [prev[i * 4], prev[i * 4 + 1], prev[i * 4 + 2], prev[i * 4 + 3]]
              : [prev[i], prev[i + 4], prev[i + 8], prev[i + 12]];

          const ordered = dir === 'right' || dir === 'down' ? [...line].reverse() : line;
          const { next: slid, gained } = slideRow(ordered);
          const restored = dir === 'right' || dir === 'down' ? [...slid].reverse() : slid;

          totalGained += gained;
          for (let j = 0; j < 4; j++) {
            const idx = dir === 'left' || dir === 'right' ? i * 4 + j : i + j * 4;
            if (next[idx] !== restored[j]) changed = true;
            next[idx] = restored[j];
          }
        }
        if (!changed) return prev;
        if (totalGained > 0) {
          setScore((s) => s + totalGained);
          playChime(440 + Math.min(totalGained * 3, 400), 0.1, muted);
        }
        return spawn2048(next);
      });
    },
    [muted]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); move('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move('right'); }
      if (e.key === 'ArrowUp') { e.preventDefault(); move('up'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); move('down'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const tileStyle = (val: number) => {
    if (val === 0) return 'bg-[#0B0D14] text-transparent';
    if (val <= 4) return 'bg-slate-800 text-slate-100';
    if (val <= 16) return 'bg-violet-900/70 text-violet-100';
    if (val <= 64) return 'bg-violet-600 text-white';
    return 'bg-amber-500 text-slate-950';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>Puntos: <strong className="text-violet-300">{score}</strong></span>
        <button type="button" onClick={() => { setBoard(initBoard()); setScore(0); }} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
      </div>
      <div className="grid w-full max-w-[260px] grid-cols-4 gap-1.5 rounded-xl border border-slate-800 bg-[#121524] p-2">
        {board.map((val, idx) => (
          <div key={idx} className={`flex aspect-square items-center justify-center rounded-lg font-display text-sm font-bold tabular-nums ${tileStyle(val)}`}>
            {val || ''}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => move('left')} aria-label="Izquierda" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 active:bg-violet-600"><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => move('up')} aria-label="Arriba" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 active:bg-violet-600"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => move('down')} aria-label="Abajo" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 active:bg-violet-600"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => move('right')} aria-label="Derecha" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 active:bg-violet-600"><ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

/* ---------------- 7. BUSCAMINAS ZEN (6x6) ---------------- */
interface MineCell { mine: boolean; open: boolean; flag: boolean; adj: number; }
function buildMines(): MineCell[] {
  const cells: MineCell[] = Array.from({ length: 36 }, () => ({ mine: false, open: false, flag: false, adj: 0 }));
  let placed = 0;
  while (placed < 5) {
    const idx = Math.floor(Math.random() * 36);
    if (!cells[idx].mine) { cells[idx].mine = true; placed++; }
  }
  for (let i = 0; i < 36; i++) {
    const r = Math.floor(i / 6), c = i % 6;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && cells[nr * 6 + nc].mine) count++;
    }
    cells[i].adj = count;
  }
  return cells;
}

const MinesZenGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [cells, setCells] = useState<MineCell[]>(buildMines);
  const [flagMode, setFlagMode] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const restart = () => { setCells(buildMines()); setStatus('playing'); };

  const reveal = (idx: number) => {
    if (status !== 'playing') return;
    if (flagMode) {
      setCells((prev) => prev.map((c, i) => (i === idx && !c.open ? { ...c, flag: !c.flag } : c)));
      return;
    }
    if (cells[idx].flag || cells[idx].open) return;
    if (cells[idx].mine) {
      playChime(180, 0.25, muted, 'sawtooth');
      setCells((prev) => prev.map((c) => (c.mine ? { ...c, open: true } : c)));
      setStatus('lost');
      return;
    }
    playChime(520, 0.08, muted);
    const next = cells.map((c) => ({ ...c }));
    const stack = [idx];
    while (stack.length) {
      const cur = stack.pop()!;
      if (next[cur].open || next[cur].mine) continue;
      next[cur].open = true;
      if (next[cur].adj === 0) {
        const r = Math.floor(cur / 6), c = cur % 6;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6) stack.push(nr * 6 + nc);
        }
      }
    }
    setCells(next);
    if (next.filter((c) => !c.mine && !c.open).length === 0) {
      playChime(784, 0.25, muted);
      setStatus('won');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300">
        <span>{status === 'won' ? 'Victoria limpia' : status === 'lost' ? 'Mina tocada' : '5 minas ocultas'}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setFlagMode(!flagMode)} className={`inline-flex min-h-[34px] items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${flagMode ? 'bg-amber-600 text-white' : 'border border-slate-700 bg-slate-800 text-slate-200'}`}>
            <Flag className="h-3 w-3" /> Bandera
          </button>
          <button type="button" onClick={restart} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Nuevo
          </button>
        </div>
      </div>
      <div className="grid w-full max-w-[264px] grid-cols-6 gap-1.5">
        {cells.map((c, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => reveal(idx)}
            className={`flex aspect-square min-h-[40px] items-center justify-center rounded-md border font-mono text-xs font-bold tabular-nums ${
              c.open
                ? c.mine
                  ? 'border-red-500/60 bg-red-950/60 text-red-300'
                  : 'border-slate-800 bg-[#0B0D14] text-violet-300'
                : 'border-slate-700 bg-[#181C2E] text-amber-300 hover:border-violet-500/50'
            }`}
          >
            {c.open ? (c.mine ? '✸' : c.adj || '') : c.flag ? '⚑' : ''}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- 8. TRES EN RAYA ---------------- */
function checkWinnerTTT(b: Array<string | null>) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b1,c] of lines) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  return b.every(Boolean) ? 'Empate' : null;
}

const TicTacToeGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const winner = checkWinnerTTT(board);

  const playCell = (idx: number) => {
    if (board[idx] || winner) return;
    const afterPlayer = [...board];
    afterPlayer[idx] = 'X';
    playChime(523, 0.08, muted);
    if (checkWinnerTTT(afterPlayer)) {
      setBoard(afterPlayer);
      return;
    }
    const empty = afterPlayer.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
    if (empty.length > 0) {
      const pick = empty[Math.floor(Math.random() * empty.length)];
      afterPlayer[pick] = 'O';
    }
    setBoard(afterPlayer);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300">
        <span>{winner ? (winner === 'Empate' ? 'Empate limpio' : `Ganador: ${winner}`) : 'Tú eres X vs Nixora O'}</span>
        <button type="button" onClick={() => setBoard(Array(9).fill(null))} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
      </div>
      <div className="grid w-full max-w-[220px] grid-cols-3 gap-2">
        {board.map((val, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => playCell(idx)}
            className={`flex aspect-square min-h-[60px] items-center justify-center rounded-xl border border-slate-800 bg-[#121524] font-display text-2xl font-bold ${val === 'X' ? 'text-violet-300' : 'text-amber-300'}`}
          >
            {val || ''}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- 9. SERPIENTE VOXEL ---------------- */
const SnakeGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const snakeRef = useRef<Array<{ x: number; y: number }>>([{ x: 6, y: 6 }]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 10, y: 6 });

  const start = () => {
    snakeRef.current = [{ x: 6, y: 6 }, { x: 5, y: 6 }];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 10, y: 6 };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  const setDir = (dx: number, dy: number) => {
    if (dirRef.current.x === -dx && dirRef.current.y === -dy) return;
    dirRef.current = { x: dx, y: dy };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); setDir(0, -1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setDir(0, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setDir(-1, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setDir(1, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const grid = 15;
    const cell = 16;
    const timer = window.setInterval(() => {
      const s = [...snakeRef.current];
      const head = { x: s[0].x + dirRef.current.x, y: s[0].y + dirRef.current.y };
      if (head.x < 0 || head.x >= grid || head.y < 0 || head.y >= grid || s.some((p) => p.x === head.x && p.y === head.y)) {
        playChime(190, 0.2, muted, 'sawtooth');
        setRunning(false);
        setGameOver(true);
        return;
      }
      s.unshift(head);
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        playChime(659, 0.12, muted);
        setScore((sc) => sc + 10);
        foodRef.current = { x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) };
      } else {
        s.pop();
      }
      snakeRef.current = s;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(0, 0, grid * cell, grid * cell);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(foodRef.current.x * cell + 2, foodRef.current.y * cell + 2, cell - 4, cell - 4);
        s.forEach((p, idx) => {
          ctx.fillStyle = idx === 0 ? '#C084FC' : '#7C3AED';
          ctx.fillRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2);
        });
      }
    }, 135);
    return () => clearInterval(timer);
  }, [running, muted]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>Puntos: <strong className="text-violet-300">{score}</strong></span>
        <button type="button" onClick={start} className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
          <Play className="h-3 w-3" /> {running ? 'Reiniciar' : gameOver ? 'Reintentar' : 'Jugar'}
        </button>
      </div>
      <canvas ref={canvasRef} width={240} height={240} className="rounded-xl border border-slate-800 bg-[#0B0D14]" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setDir(-1, 0)} aria-label="Izquierda" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200"><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setDir(0, -1)} aria-label="Arriba" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => setDir(0, 1)} aria-label="Abajo" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => setDir(1, 0)} aria-label="Derecha" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200"><ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

/* ---------------- 10. ATRAPA ESTRELLAS ---------------- */
const StarCatcherGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [basketX, setBasketX] = useState(50);
  const [items, setItems] = useState<Array<{ id: number; x: number; y: number; bad: boolean }>>([]);
  const basketRef = useRef(50);
  const idRef = useRef(1);

  useEffect(() => { basketRef.current = basketX; }, [basketX]);

  useEffect(() => {
    if (!playing) return;
    const tick = window.setInterval(() => {
      setItems((prev) => {
        const next: typeof prev = [];
        for (const it of prev) {
          const ny = it.y + 4;
          if (ny >= 84 && ny <= 96 && Math.abs(it.x - basketRef.current) < 13) {
            if (it.bad) {
              playChime(210, 0.16, muted, 'sawtooth');
              setScore((s) => Math.max(0, s - 10));
            } else {
              playChime(740, 0.1, muted);
              setScore((s) => s + 15);
            }
          } else if (ny < 102) {
            next.push({ ...it, y: ny });
          }
        }
        if (Math.random() < 0.18) {
          next.push({ id: idRef.current++, x: 10 + Math.random() * 80, y: -5, bad: Math.random() < 0.22 });
        }
        return next;
      });
    }, 50);
    return () => clearInterval(tick);
  }, [playing, muted]);

  const handleMove = (clientX: number, rect: DOMRect) => {
    const pct = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    setBasketX(pct);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>Estrellas: <strong className="text-amber-300">{score}</strong></span>
        <button type="button" onClick={() => { setScore(0); setItems([]); setPlaying(!playing); }} className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
          {playing ? 'Detener' : 'Empezar'}
        </button>
      </div>
      <div
        onMouseMove={(e) => playing && handleMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => playing && e.touches[0] && handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        className="relative h-56 w-full overflow-hidden rounded-xl border border-slate-800 bg-[#0D101B] touch-none select-none"
      >
        {!playing && (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Pulsa Empezar y desliza para atrapar estrellas</div>
        )}
        {items.map((it) => (
          <div key={it.id} style={{ left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%, -50%)' }} className={`absolute text-base font-bold ${it.bad ? 'text-red-400' : 'text-amber-300'}`}>
            {it.bad ? '✕' : '✦'}
          </div>
        ))}
        <div style={{ left: `${basketX}%`, transform: 'translateX(-50%)' }} className="absolute bottom-3 h-3 w-16 rounded-full bg-violet-500" />
      </div>
    </div>
  );
};

/* ---------------- 11. SIMÓN MUSICAL ---------------- */
const SIMON_NOTES = [392, 440, 523.25, 659.25];
const SIMON_COLORS = ['bg-violet-600', 'bg-amber-500', 'bg-emerald-600', 'bg-sky-600'];
const SimonGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const [seq, setSeq] = useState<number[]>([]);
  const [userIdx, setUserIdx] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [playingSeq, setPlayingSeq] = useState(false);
  const [status, setStatus] = useState('Pulsa Iniciar');

  const playSequence = useCallback((target: number[]) => {
    setPlayingSeq(true);
    setStatus('Observa...');
    target.forEach((pad, i) => {
      setTimeout(() => {
        setLit(pad);
        playChime(SIMON_NOTES[pad], 0.2, muted);
        setTimeout(() => setLit(null), 260);
        if (i === target.length - 1) {
          setTimeout(() => {
            setPlayingSeq(false);
            setStatus('Tu turno');
          }, 340);
        }
      }, i * 480 + 250);
    });
  }, [muted]);

  const startSimon = () => {
    const first = [Math.floor(Math.random() * 4)];
    setSeq(first);
    setUserIdx(0);
    playSequence(first);
  };

  const pressPad = (pad: number) => {
    if (playingSeq || seq.length === 0) return;
    setLit(pad);
    playChime(SIMON_NOTES[pad], 0.16, muted);
    setTimeout(() => setLit(null), 180);

    if (pad !== seq[userIdx]) {
      playChime(170, 0.25, muted, 'sawtooth');
      setStatus(`Fin en nivel ${seq.length}`);
      setSeq([]);
      return;
    }
    if (userIdx + 1 === seq.length) {
      const nextSeq = [...seq, Math.floor(Math.random() * 4)];
      setSeq(nextSeq);
      setUserIdx(0);
      setTimeout(() => playSequence(nextSeq), 450);
    } else {
      setUserIdx(userIdx + 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>{status} · Nivel: <strong>{seq.length}</strong></span>
        <button type="button" onClick={startSimon} className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
          Iniciar
        </button>
      </div>
      <div className="grid w-full max-w-[220px] grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((pad) => (
          <button
            key={pad}
            type="button"
            onClick={() => pressPad(pad)}
            aria-label={`Gema ${pad + 1}`}
            className={`aspect-square min-h-[76px] rounded-xl transition-opacity ${SIMON_COLORS[pad]} ${lit === pad ? 'opacity-100 ring-2 ring-white' : 'opacity-65 hover:opacity-85'}`}
          />
        ))}
      </div>
    </div>
  );
};

/* ---------------- 12. PUZZLE DESLIZANTE 3x3 ---------------- */
const SlidingPuzzleGame: React.FC<{ muted: boolean }> = ({ muted }) => {
  const createShuffled = () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let empty = 8;
    for (let i = 0; i < 60; i++) {
      const r = Math.floor(empty / 3), c = empty % 3;
      const neighbors: number[] = [];
      if (r > 0) neighbors.push(empty - 3);
      if (r < 2) neighbors.push(empty + 3);
      if (c > 0) neighbors.push(empty - 1);
      if (c < 2) neighbors.push(empty + 1);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      [arr[empty], arr[pick]] = [arr[pick], arr[empty]];
      empty = pick;
    }
    return arr;
  };
  const [tiles, setTiles] = useState<number[]>(createShuffled);
  const [moves, setMoves] = useState(0);
  const solved = tiles.every((v, i) => (i === 8 ? v === 0 : v === i + 1));

  const tap = (idx: number) => {
    if (solved) return;
    const empty = tiles.indexOf(0);
    const r1 = Math.floor(idx / 3), c1 = idx % 3;
    const r2 = Math.floor(empty / 3), c2 = empty % 3;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    playChime(480, 0.08, muted);
    const next = [...tiles];
    [next[idx], next[empty]] = [next[empty], next[idx]];
    setTiles(next);
    setMoves((m) => m + 1);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-slate-300 tabular-nums">
        <span>{solved ? `Resuelto en ${moves} mov.` : `Movimientos: ${moves}`}</span>
        <button type="button" onClick={() => { setTiles(createShuffled()); setMoves(0); }} className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
          <RotateCcw className="h-3 w-3" /> Mezclar
        </button>
      </div>
      <div className="grid w-full max-w-[220px] grid-cols-3 gap-2">
        {tiles.map((v, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => tap(idx)}
            className={`flex aspect-square min-h-[58px] items-center justify-center rounded-xl font-display text-lg font-bold tabular-nums ${
              v === 0 ? 'bg-[#0B0D14]' : 'border border-violet-500/35 bg-[#16192B] text-slate-100 hover:border-violet-400'
            }`}
          >
            {v || ''}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- MAIN EXPORT (12 GAMES) ---------------- */
export const StressGames: React.FC<StressGamesProps> = ({ compact = false }) => {
  const [activeGame, setActiveGame] = useState<GameTab>('zen');
  const [muted, setMuted] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-400 tabular-nums">
          12 minijuegos antiestrés disponibles
        </div>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B0D14] px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 whitespace-nowrap"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{muted ? 'Silencio' : 'Sonido'}</span>
        </button>
      </div>

      {/* Scrollable Game Selector */}
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
        {GAME_CATALOG.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActiveGame(g.id)}
            className={`min-h-[38px] truncate rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
              activeGame === g.id
                ? 'bg-violet-600 text-white'
                : 'border border-slate-800 bg-[#0B0D14] text-slate-400 hover:text-slate-100'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {activeGame === 'zen' && <ZenPopGame compact={compact} muted={muted} />}
      {activeGame === 'runner' && <VoxelRunnerGame compact={compact} muted={muted} />}
      {activeGame === 'memory' && <MemoryMatrixGame compact={compact} muted={muted} />}
      {activeGame === 'popit' && <PopItGame muted={muted} />}
      {activeGame === 'breathe' && <BreathingGame muted={muted} />}
      {activeGame === 'g2048' && <Game2048 muted={muted} />}
      {activeGame === 'mines' && <MinesZenGame muted={muted} />}
      {activeGame === 'ttt' && <TicTacToeGame muted={muted} />}
      {activeGame === 'snake' && <SnakeGame muted={muted} />}
      {activeGame === 'catcher' && <StarCatcherGame muted={muted} />}
      {activeGame === 'simon' && <SimonGame muted={muted} />}
      {activeGame === 'sliding' && <SlidingPuzzleGame muted={muted} />}
    </div>
  );
};

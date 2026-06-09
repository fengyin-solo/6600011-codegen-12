import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEEGStore } from '../store/eeg';
import { RhythmPrompt, RhythmPhase } from '../types';

const RHYTHM_SEQUENCE: RhythmPhase[] = ['inhale', 'hold', 'exhale', 'rest'];

const RHYTHM_CONFIG: Record<RhythmPhase, { label: string; instruction: string; color: string }> = {
  inhale: { label: '吸气', instruction: '缓缓深吸...', color: '#4fc3f7' },
  hold: { label: '屏息', instruction: '轻轻屏住...', color: '#81c784' },
  exhale: { label: '呼气', instruction: '慢慢呼出...', color: '#ffb74d' },
  rest: { label: '静息', instruction: '自然呼吸...', color: '#ce93d8' },
};

const getNextPhase = (phase: RhythmPhase): RhythmPhase => {
  const idx = RHYTHM_SEQUENCE.indexOf(phase);
  return RHYTHM_SEQUENCE[(idx + 1) % RHYTHM_SEQUENCE.length];
};

const getDurationForPhase = (phase: RhythmPhase, relaxation: number): number => {
  const base: Record<RhythmPhase, number> = {
    inhale: 4,
    hold: 2,
    exhale: 6,
    rest: 2,
  };
  if (relaxation >= 70) return base[phase] + 1;
  if (relaxation >= 50) return base[phase];
  if (relaxation < 30) return base[phase] - 1;
  return base[phase];
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RhythmCircle: React.FC<{
  phase: RhythmPhase;
  progress: number;
  relaxation: number;
}> = ({ phase, progress, relaxation }) => {
  const config = RHYTHM_CONFIG[phase];
  const baseSize = 140;
  const expandMap: Record<RhythmPhase, number> = { inhale: 40, hold: 0, exhale: -30, rest: 0 };
  const expand = expandMap[phase] * progress;
  const size = baseSize + expand;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${config.color}40, ${config.color}15)`,
            border: `3px solid ${config.color}`,
            boxShadow: `0 0 ${20 + expand}px ${config.color}60, inset 0 0 ${15 + expand / 2}px ${config.color}30`,
            transition: 'all 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: config.color }}>{config.label}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{config.instruction}</div>
          </div>
        </div>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '200px', height: '200px', transform: 'rotate(-90deg)' }}
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="92" fill="none" stroke="#e0e0e0" strokeWidth="3" />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={config.color}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 92}`}
            strokeDashoffset={`${2 * Math.PI * 92 * (1 - progress)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
      </div>
      <div style={{ fontSize: '13px', color: '#888' }}>
        放松度 <span style={{ fontWeight: 700, color: '#388e3c', fontSize: '16px' }}>{relaxation.toFixed(0)}</span>
      </div>
    </div>
  );
};

const RelaxationTrendChart: React.FC<{ snapshots: { timestamp: number; relaxation: number }[] }> = ({ snapshots }) => {
  if (snapshots.length < 2) return null;
  const recent = snapshots.slice(-20);
  const width = 280;
  const height = 60;
  const minR = Math.min(...recent.map(s => s.relaxation));
  const maxR = Math.max(...recent.map(s => s.relaxation));
  const range = maxR - minR || 1;
  const points = recent.map((s, i) => {
    const x = (i / (recent.length - 1)) * width;
    const y = height - ((s.relaxation - minR) / range) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop: '12px', padding: '10px', background: '#f5f7fa', borderRadius: '8px' }}>
      <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>放松度趋势</div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline points={points} fill="none" stroke="#388e3c" strokeWidth="2" strokeLinejoin="round" />
        {recent.map((s, i) => {
          const x = (i / (recent.length - 1)) * width;
          const y = height - ((s.relaxation - minR) / range) * (height - 10) - 5;
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#388e3c" />;
        })}
      </svg>
    </div>
  );
};

const CompletionOverlay: React.FC = () => {
  const { meditationSession, dismissMeditationCompletion } = useEEGStore();
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setAnimStep(1), 300),
      window.setTimeout(() => setAnimStep(2), 700),
      window.setTimeout(() => setAnimStep(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!meditationSession || !meditationSession.completed) return null;

  const { duration, avgRelaxation, peakRelaxation, improvement } = meditationSession;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.5s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismissMeditationCompletion(); }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #1a237e, #004d40)',
          borderRadius: '20px',
          padding: '36px 32px',
          width: '360px',
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          animation: 'scaleIn 0.4s ease',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '8px',
            opacity: animStep >= 1 ? 1 : 0,
            transform: animStep >= 1 ? 'scale(1)' : 'scale(0.5)',
            transition: 'all 0.5s ease',
          }}
        >
          🧘
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '4px',
            opacity: animStep >= 1 ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          冥想完成
        </div>
        <div
          style={{
            fontSize: '13px',
            opacity: 0.7,
            marginBottom: '24px',
            opacity: animStep >= 1 ? 0.7 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          很棒的冥想体验
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px',
            opacity: animStep >= 2 ? 1 : 0,
            transform: animStep >= 2 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease',
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>冥想时长</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{formatDuration(duration)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>平均放松度</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#81c784' }}>{avgRelaxation.toFixed(1)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>峰值放松度</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#4fc3f7' }}>{peakRelaxation.toFixed(1)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>放松提升</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: improvement >= 0 ? '#ffb74d' : '#ef9a9a' }}>
              {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: '24px',
            opacity: animStep >= 3 ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
            {avgRelaxation >= 70 ? '🌟 深度放松，身心和谐' : avgRelaxation >= 50 ? '✨ 放松良好，继续坚持' : '🌱 初步放松，循序渐进'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>
            {improvement >= 10
              ? '放松度显著提升，冥想效果出色！'
              : improvement >= 0
                ? '放松度有所提升，保持练习。'
                : '放松度有所波动，建议更专注呼吸节奏。'}
          </div>
        </div>

        <button
          onClick={dismissMeditationCompletion}
          style={{
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            transition: 'background 0.2s',
            opacity: animStep >= 3 ? 1 : 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        >
          完成
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export const MeditationAssistant: React.FC = () => {
  const {
    isMeditating,
    meditationSession,
    currentRhythm,
    rhythmPhaseStart,
    brainState,
    showMeditationCompletion,
    startMeditation,
    stopMeditation,
    updateMeditationSnapshot,
    setRhythm,
    setRhythmPhaseStart,
  } = useEEGStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<number | null>(null);
  const prevRelaxationRef = useRef<number>(0);

  const tickRhythm = useCallback(() => {
    const state = useEEGStore.getState();
    if (!state.isMeditating || !state.currentRhythm) return;

    const now = Date.now();
    const elapsed = (now - state.rhythmPhaseStart) / 1000;
    const duration = state.currentRhythm.durationSec;
    const progress = Math.min(1, elapsed / duration);

    if (progress >= 1) {
      const nextPhase = getNextPhase(state.currentRhythm.phase);
      const relaxation = state.brainState?.relaxation ?? 50;
      const nextDuration = getDurationForPhase(nextPhase, relaxation);
      const nextRhythm: RhythmPrompt = {
        phase: nextPhase,
        durationSec: nextDuration,
        label: RHYTHM_CONFIG[nextPhase].label,
        instruction: RHYTHM_CONFIG[nextPhase].instruction,
      };
      state.setRhythm(nextRhythm);
      state.setRhythmPhaseStart(now);
    }
  }, []);

  useEffect(() => {
    if (isMeditating) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((Date.now() - (meditationSession?.startTime ?? Date.now())) / 1000);
      }, 500);
      phaseTimerRef.current = window.setInterval(tickRhythm, 100);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (phaseTimerRef.current) { clearInterval(phaseTimerRef.current); phaseTimerRef.current = null; }
      setElapsedTime(0);
      setPhaseProgress(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, [isMeditating, meditationSession?.startTime, tickRhythm]);

  useEffect(() => {
    if (isMeditating && brainState) {
      updateMeditationSnapshot(brainState);

      const currentRelaxation = brainState.relaxation;
      const prevRelaxation = prevRelaxationRef.current;
      prevRelaxationRef.current = currentRelaxation;

      if (currentRhythm && prevRelaxation > 0) {
        const delta = currentRelaxation - prevRelaxation;
        if (Math.abs(delta) > 5) {
          const currentDuration = currentRhythm.durationSec;
          let adjustment = 0;
          if (delta > 5 && currentRelaxation > 60) {
            adjustment = 0.5;
          } else if (delta < -5 && currentRelaxation < 40) {
            adjustment = -0.5;
          }
          if (adjustment !== 0) {
            const newDuration = Math.max(2, Math.min(8, currentDuration + adjustment));
            setRhythm({ ...currentRhythm, durationSec: newDuration });
          }
        }
      }
    }
  }, [brainState, isMeditating]);

  useEffect(() => {
    if (isMeditating && currentRhythm) {
      const now = Date.now();
      const elapsed = (now - rhythmPhaseStart) / 1000;
      setPhaseProgress(Math.min(1, elapsed / currentRhythm.durationSec));
    }
  }, [rhythmPhaseStart, currentRhythm, isMeditating, elapsedTime]);

  if (showMeditationCompletion) {
    return <CompletionOverlay />;
  }

  if (!isMeditating) {
    return (
      <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🧘</span>
          冥想辅助
        </h3>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: 1.6 }}>
            根据放松度变化智能调节呼吸节奏<br />引导你进入更深层的冥想状态
          </div>
          <button
            onClick={startMeditation}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #1a237e, #004d40)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '0 auto',
              boxShadow: '0 4px 16px rgba(26,35,126,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,35,126,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,35,126,0.3)'; }}
          >
            <span style={{ fontSize: '18px' }}>🧘</span>
            开始冥想
          </button>
        </div>
      </div>
    );
  }

  const relaxation = brainState?.relaxation ?? 50;

  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(180deg, #1a237e08, #004d4008)',
      borderRadius: '12px',
      margin: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e8eaf6',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🧘</span>
          冥想进行中
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a237e' }}>{formatDuration(elapsedTime)}</span>
          <button
            onClick={stopMeditation}
            style={{
              padding: '6px 14px',
              background: '#c62828',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            结束冥想
          </button>
        </div>
      </div>

      {currentRhythm && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <RhythmCircle
            phase={currentRhythm.phase}
            progress={phaseProgress}
            relaxation={relaxation}
          />
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}>
        {RHYTHM_SEQUENCE.map((phase) => {
          const config = RHYTHM_CONFIG[phase];
          const isActive = currentRhythm?.phase === phase;
          return (
            <div
              key={phase}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 400,
                background: isActive ? config.color : '#f5f5f5',
                color: isActive ? '#fff' : '#999',
                transition: 'all 0.3s ease',
              }}
            >
              {config.label}
            </div>
          );
        })}
      </div>

      {currentRhythm && (
        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: '#555',
          marginBottom: '4px',
          fontStyle: 'italic',
        }}>
          {currentRhythm.instruction} ({currentRhythm.durationSec.toFixed(1)}s)
        </div>
      )}

      {meditationSession && meditationSession.snapshots.length > 1 && (
        <RelaxationTrendChart snapshots={meditationSession.snapshots} />
      )}
    </div>
  );
};

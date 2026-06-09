export interface EEGData { channels: string[]; sample_rate: number; data: Record<string, number[]>; time: number[]; duration: number; }
export interface BandPower { delta: number; theta: number; alpha: number; beta: number; gamma: number; }
export interface BrainState {
  focus: number;
  relaxation: number;
  fatigue: number;
  status: 'focused' | 'relaxed' | 'fatigued' | 'neutral';
  statusLabel: string;
  statusColor: string;
  timestamp: number;
}
export interface ChannelCorrelation {
  channel: string;
  targetChannel: string;
  correlation: number;
  coherence: number;
}
export interface CorrelationData {
  targetChannel: string;
  correlations: ChannelCorrelation[];
}

export interface RecordingFrame {
  relativeTime: number;
  eeg: EEGData;
  bands: BandPower;
  brainState: BrainState;
}

export interface Recording {
  id: string;
  name: string;
  channel: string;
  startTime: number;
  endTime: number;
  duration: number;
  frames: RecordingFrame[];
}

export type RhythmPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export interface RhythmPrompt {
  phase: RhythmPhase;
  durationSec: number;
  label: string;
  instruction: string;
}

export interface MeditationSnapshot {
  timestamp: number;
  relaxation: number;
  focus: number;
  fatigue: number;
  rhythmPhase: RhythmPhase;
}

export interface MeditationSession {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  snapshots: MeditationSnapshot[];
  avgRelaxation: number;
  peakRelaxation: number;
  improvement: number;
  completed: boolean;
}

export interface MeditationState {
  isMeditating: boolean;
  currentSession: MeditationSession | null;
  currentRhythm: RhythmPrompt | null;
  rhythmPhaseStart: number;
  showCompletion: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  currentFrame: RecordingFrame | null;
}

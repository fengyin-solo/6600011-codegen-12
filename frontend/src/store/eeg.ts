import { create } from 'zustand';
import { EEGData, BandPower, BrainState, CorrelationData, Recording, RecordingFrame, PlaybackState, MeditationSession, MeditationSnapshot, RhythmPrompt, RhythmPhase } from '../types';

const STORAGE_KEY = 'eeg_recordings';

const loadRecordings = (): Recording[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecordings = (recordings: Recording[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
  } catch {}
};

interface EEGState {
  eegData: EEGData | null;
  selectedChannel: string;
  bandPower: BandPower | null;
  isStreaming: boolean;
  brainState: BrainState | null;
  correlationData: CorrelationData | null;
  isRecording: boolean;
  recordingStartTime: number;
  currentRecordingFrames: RecordingFrame[];
  recordings: Recording[];
  playbackMode: boolean;
  activeRecording: Recording | null;
  playbackState: PlaybackState;
  isMeditating: boolean;
  meditationSession: MeditationSession | null;
  currentRhythm: RhythmPrompt | null;
  rhythmPhaseStart: number;
  showMeditationCompletion: boolean;
  setEEGData: (d: EEGData | null) => void;
  setChannel: (c: string) => void;
  setBandPower: (b: BandPower | null) => void;
  setStreaming: (v: boolean) => void;
  setBrainState: (s: BrainState | null) => void;
  setCorrelationData: (c: CorrelationData | null) => void;
  startMeditation: () => void;
  stopMeditation: () => void;
  updateMeditationSnapshot: (brainState: BrainState) => void;
  setRhythm: (rhythm: RhythmPrompt) => void;
  setRhythmPhaseStart: (time: number) => void;
  dismissMeditationCompletion: () => void;
  startRecording: () => void;
  stopRecording: (name: string) => void;
  addRecordingFrame: (eeg: EEGData, bands: BandPower, brainState: BrainState) => void;
  deleteRecording: (id: string) => void;
  enterPlaybackMode: (recording: Recording) => void;
  exitPlaybackMode: () => void;
  setPlaybackTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackPlaying: (playing: boolean) => void;
}

export const useEEGStore = create<EEGState>((set, get) => ({
  eegData: null,
  selectedChannel: 'Fp1',
  bandPower: null,
  isStreaming: false,
  brainState: null,
  correlationData: null,
  isRecording: false,
  recordingStartTime: 0,
  currentRecordingFrames: [],
  recordings: loadRecordings(),
  playbackMode: false,
  activeRecording: null,
  playbackState: {
    isPlaying: false,
    currentTime: 0,
    currentFrame: null,
  },
  isMeditating: false,
  meditationSession: null,
  currentRhythm: null,
  rhythmPhaseStart: 0,
  showMeditationCompletion: false,
  setEEGData: (d) => set({ eegData: d }),
  setChannel: (c) => set({ selectedChannel: c }),
  setBandPower: (b) => set({ bandPower: b }),
  setStreaming: (v) => set({ isStreaming: v }),
  setBrainState: (s) => set({ brainState: s }),
  setCorrelationData: (c) => set({ correlationData: c }),
  startMeditation: () => {
    const session: MeditationSession = {
      id: `med_${Date.now()}`,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      snapshots: [],
      avgRelaxation: 0,
      peakRelaxation: 0,
      improvement: 0,
      completed: false,
    };
    set({
      isMeditating: true,
      meditationSession: session,
      currentRhythm: { phase: 'inhale', durationSec: 4, label: '吸气', instruction: '缓缓吸气...' },
      rhythmPhaseStart: Date.now(),
      showMeditationCompletion: false,
    });
  },
  stopMeditation: () => {
    const { meditationSession } = get();
    if (!meditationSession || meditationSession.snapshots.length === 0) {
      set({ isMeditating: false, meditationSession: null, currentRhythm: null, rhythmPhaseStart: 0 });
      return;
    }
    const snapshots = meditationSession.snapshots;
    const relaxationValues = snapshots.map(s => s.relaxation);
    const avgRelaxation = relaxationValues.reduce((a, b) => a + b, 0) / relaxationValues.length;
    const peakRelaxation = Math.max(...relaxationValues);
    const firstHalf = relaxationValues.slice(0, Math.floor(relaxationValues.length / 2));
    const secondHalf = relaxationValues.slice(Math.floor(relaxationValues.length / 2));
    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    const improvement = Math.round((avgSecond - avgFirst) * 10) / 10;
    const endTime = Date.now();
    const duration = (endTime - meditationSession.startTime) / 1000;
    const completedSession: MeditationSession = {
      ...meditationSession,
      endTime,
      duration,
      avgRelaxation: Math.round(avgRelaxation * 10) / 10,
      peakRelaxation: Math.round(peakRelaxation * 10) / 10,
      improvement,
      completed: true,
    };
    set({
      isMeditating: false,
      meditationSession: completedSession,
      currentRhythm: null,
      rhythmPhaseStart: 0,
      showMeditationCompletion: true,
    });
  },
  updateMeditationSnapshot: (brainState) => {
    const { isMeditating, meditationSession, currentRhythm } = get();
    if (!isMeditating || !meditationSession || !currentRhythm) return;
    const snapshot: MeditationSnapshot = {
      timestamp: Date.now(),
      relaxation: brainState.relaxation,
      focus: brainState.focus,
      fatigue: brainState.fatigue,
      rhythmPhase: currentRhythm.phase,
    };
    set({
      meditationSession: {
        ...meditationSession,
        snapshots: [...meditationSession.snapshots, snapshot],
        duration: (Date.now() - meditationSession.startTime) / 1000,
      },
    });
  },
  setRhythm: (rhythm) => set({ currentRhythm: rhythm }),
  setRhythmPhaseStart: (time) => set({ rhythmPhaseStart: time }),
  dismissMeditationCompletion: () => set({ showMeditationCompletion: false, meditationSession: null }),
  startRecording: () => {
    const { selectedChannel } = get();
    set({
      isRecording: true,
      recordingStartTime: Date.now(),
      currentRecordingFrames: [],
      playbackMode: false,
      activeRecording: null,
    });
  },
  stopRecording: (name: string) => {
    const { currentRecordingFrames, recordingStartTime, selectedChannel } = get();
    if (currentRecordingFrames.length === 0) {
      set({ isRecording: false, currentRecordingFrames: [] });
      return;
    }
    const endTime = Date.now();
    const duration = (endTime - recordingStartTime) / 1000;
    const newRecording: Recording = {
      id: `rec_${endTime}`,
      name: name || `录制 ${new Date(recordingStartTime).toLocaleString()}`,
      channel: selectedChannel,
      startTime: recordingStartTime,
      endTime,
      duration,
      frames: currentRecordingFrames,
    };
    const recordings = [...get().recordings, newRecording];
    saveRecordings(recordings);
    set({
      isRecording: false,
      recordingStartTime: 0,
      currentRecordingFrames: [],
      recordings,
    });
  },
  addRecordingFrame: (eeg, bands, brainState) => {
    const { isRecording, recordingStartTime, currentRecordingFrames } = get();
    if (!isRecording) return;
    const relativeTime = (Date.now() - recordingStartTime) / 1000;
    const frame: RecordingFrame = { relativeTime, eeg, bands, brainState };
    set({ currentRecordingFrames: [...currentRecordingFrames, frame] });
  },
  deleteRecording: (id) => {
    const recordings = get().recordings.filter(r => r.id !== id);
    saveRecordings(recordings);
    const { activeRecording } = get();
    if (activeRecording?.id === id) {
      set({ recordings, playbackMode: false, activeRecording: null });
    } else {
      set({ recordings });
    }
  },
  enterPlaybackMode: (recording) => {
    if (recording.frames.length === 0) return;
    set({
      playbackMode: true,
      activeRecording: recording,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        currentFrame: recording.frames[0],
      },
      eegData: recording.frames[0].eeg,
      bandPower: recording.frames[0].bands,
      brainState: recording.frames[0].brainState,
    });
  },
  exitPlaybackMode: () => {
    set({
      playbackMode: false,
      activeRecording: null,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        currentFrame: null,
      },
    });
  },
  setPlaybackTime: (time) => {
    const { activeRecording } = get();
    if (!activeRecording || activeRecording.frames.length === 0) return;
    const frames = activeRecording.frames;
    let frameIndex = 0;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].relativeTime <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }
    const frame = frames[frameIndex];
    set({
      playbackState: {
        ...get().playbackState,
        currentTime: time,
        currentFrame: frame,
      },
      eegData: frame.eeg,
      bandPower: frame.bands,
      brainState: frame.brainState,
    });
  },
  togglePlayback: () => {
    const { playbackState } = get();
    set({
      playbackState: {
        ...playbackState,
        isPlaying: !playbackState.isPlaying,
      },
    });
  },
  setPlaybackPlaying: (playing) => {
    set({
      playbackState: {
        ...get().playbackState,
        isPlaying: playing,
      },
    });
  },
}));

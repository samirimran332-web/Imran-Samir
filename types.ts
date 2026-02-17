
export enum CallType {
  SPAM = 'SPAM',
  IMPORTANT = 'IMPORTANT',
  UNKNOWN = 'UNKNOWN'
}

export interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface CallLog {
  id: string;
  callerName?: string;
  purpose?: string;
  type: CallType;
  transcription: TranscriptionEntry[];
  startTime: number;
  endTime?: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audio';
import { Waveform } from './Waveform';
import { TranscriptionEntry, CallType } from '../types';

interface CallInterfaceProps {
  onCallEnd: (history: TranscriptionEntry[], type: CallType, action?: string) => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ onCallEnd }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [callType, setCallType] = useState<CallType>(CallType.UNKNOWN);
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef<TranscriptionEntry[]>([]);
  const currentInputTextRef = useRef<string>('');
  const currentOutputTextRef = useRef<string>('');
  const sessionRef = useRef<any>(null);

  const systemInstruction = `
    তুমি ইমরান ভাইয়ের পার্সোনাল AI রিসেপশনিস্ট। তোমার কাজ হলো কল রিসিভ করা এবং ইমরান ভাইয়ের অনুপস্থিতিতে কথা বলা।
    
    প্রাথমিক কাজ (Greeting):
    কল রিসিভ করার পর প্রথমে বলবে: "হ্যালো, এটা ইমরান ভাইয়ের ফোন। আপনি কে বলতে পারেন? কেন ফোন করেছেন?"

    আচরণবিধি (Decision Logic):
    1. কলারের পরিচয় এবং কলের উদ্দেশ্য শোনো।
    2. যদি গুরুত্বপূর্ণ (পরিবার, বন্ধু, ব্যবসা বা অ্যাপয়েন্টমেন্ট) মনে হয় -> বলবে: "ঠিক আছে, আমি এখনই ইমরান ভাইকে দিচ্ছি।" 
       - এরপর আউটপুট দাও: [ACTION: TRANSFER] এবং [CALL_TYPE: IMPORTANT]
    3. যদি স্প্যাম, মার্কেটিং, অথবা অপ্রয়োজনীয়/অচেনা কলার হয় -> বলবে: "দুঃখিত, এই নম্বরে এখন কথা বলা সম্ভব না।" 
       - এরপর আউটপুট দাও: [ACTION: HANGUP] এবং [CALL_TYPE: SPAM]
    4. যদি কলার বেশি চাপ দেয় বা সন্দেহজনক মনে হয় -> সরাসরি বলবে "দুঃখিত" এবং আউটপুট দাও: [ACTION: HANGUP]
    
    নিয়মাবলি:
    - কথা বলবে শুদ্ধ এবং মার্জিত বাংলায়।
    - উত্তর হবে সংক্ষিপ্ত এবং পেশাদার।
    - কোনো অবস্থাতেই রোবটের মতো শোনাবে না।
  `;

  const startCall = async () => {
    try {
      setIsCalling(true);
      setTranscription([]);
      transcriptionRef.current = [];
      setCallType(CallType.UNKNOWN);
      setLastAction(null);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Transcriptions & Actions
            if (message.serverContent?.inputTranscription) {
              currentInputTextRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTextRef.current += text;

              // Action Parsing
              if (text.includes('[ACTION: TRANSFER]')) {
                setLastAction('TRANSFER');
                setTimeout(() => stopCall(), 2000); // Stop after saying it
              }
              if (text.includes('[ACTION: HANGUP]')) {
                setLastAction('HANGUP');
                setTimeout(() => stopCall(), 1500); // Stop after saying it
              }

              // Type Parsing
              if (text.includes('[CALL_TYPE: SPAM]')) setCallType(CallType.SPAM);
              else if (text.includes('[CALL_TYPE: IMPORTANT]')) setCallType(CallType.IMPORTANT);
            }

            if (message.serverContent?.turnComplete) {
              const newEntries: TranscriptionEntry[] = [];
              if (currentInputTextRef.current) {
                newEntries.push({ role: 'user', text: currentInputTextRef.current.trim(), timestamp: Date.now() });
              }
              if (currentOutputTextRef.current) {
                // Remove meta-tags for display
                const displayMsg = currentOutputTextRef.current.replace(/\[CALL_TYPE:.*?\]/g, '').replace(/\[ACTION:.*?\]/g, '').trim();
                if (displayMsg) {
                  newEntries.push({ role: 'model', text: displayMsg, timestamp: Date.now() });
                }
              }
              
              if (newEntries.length > 0) {
                transcriptionRef.current = [...transcriptionRef.current, ...newEntries];
                setTranscription([...transcriptionRef.current]);
              }
              currentInputTextRef.current = '';
              currentOutputTextRef.current = '';
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopCall(),
          onerror: (e) => {
            console.error('Live API Error:', e);
            stopCall();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start call:', err);
      setIsCalling(false);
    }
  };

  const stopCall = useCallback(() => {
    setIsCalling(false);
    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
    onCallEnd(transcriptionRef.current, callType, lastAction || undefined);
  }, [onCallEnd, callType, lastAction]);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[600px]">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-xl">
             <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
             </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">ইমরান ভাইয়ের রিসেপশনিস্ট</h2>
            <p className="text-slate-400 text-xs tracking-wide">{isCalling ? 'কল চালু আছে' : 'কলের অপেক্ষায়'}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isCalling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
        {transcription.length === 0 && !isCalling && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <div className="bg-white p-6 rounded-full shadow-sm border border-slate-100 mb-6">
                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
            </div>
            <p className="text-lg font-semibold text-slate-600">কোনো ইনকামিং কল নেই</p>
            <p className="text-sm mt-1">সব ইনকামিং কল এখন অটোমেটিক হ্যান্ডেল করা হবে</p>
          </div>
        )}

        {transcription.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              entry.role === 'user' 
                ? 'bg-emerald-500 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
            }`}>
              <p className="text-xs font-bold mb-1 uppercase tracking-widest opacity-70">
                {entry.role === 'user' ? 'Caller' : 'Receptionist'}
              </p>
              <p className="text-base leading-relaxed font-medium">{entry.text}</p>
            </div>
          </div>
        ))}
        {isCalling && (
          <div className="flex justify-center py-6">
            <Waveform isActive={isCalling} />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-white">
        {!isCalling ? (
          <button
            onClick={startCall}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-slate-200"
          >
            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            কল রিসিভ করুন
          </button>
        ) : (
          <button
            onClick={stopCall}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-rose-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            কল কাটুন
          </button>
        )}
      </div>
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { CallInterface } from './components/CallInterface';
import { SearchGroundingPanel } from './components/SearchGroundingPanel';
import { TranscriptionEntry, CallType } from './types';

function App() {
  const [lastCallHistory, setLastCallHistory] = useState<TranscriptionEntry[]>([]);
  const [lastCallType, setLastCallType] = useState<CallType | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleCallEnd = (history: TranscriptionEntry[], type: CallType, action?: string) => {
    setLastCallHistory(history);
    setLastCallType(type);
    setLastAction(action || null);
  };

  // Extract a brief purpose from the transcript
  const callPurpose = useMemo(() => {
    if (lastCallHistory.length === 0) return null;
    // Usually the first or second user message contains the purpose
    const userMessages = lastCallHistory.filter(h => h.role === 'user');
    if (userMessages.length > 0) {
      // Find the message after the AI's first greeting if possible
      // AI Greeting is usually index 0, User reply is index 1
      return userMessages[0].text;
    }
    return null;
  }, [lastCallHistory]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 sm:py-12">
      <div className="max-w-5xl w-full space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-full font-bold text-sm shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            ইমরান ভাইয়ের পার্সোনাল এআই
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              AI Call Receptionist
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto text-sm sm:text-base px-4">
              এই সিস্টেমটি অটোমেটিক ইমরান ভাইয়ের কল রিসিভ করে, স্প্যাম শনাক্ত করে এবং গুরুত্বপূর্ণ হলে সরাসরি ট্রান্সফার করে।
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Caller Interface */}
          <div className="lg:col-span-7 space-y-6">
            <CallInterface onCallEnd={handleCallEnd} />
          </div>

          {/* Sidebar / Status Panel */}
          <div className="lg:col-span-5 space-y-6">
            {(lastAction || lastCallType) && (
              <div className={`p-8 rounded-[2rem] border-2 animate-in fade-in slide-in-from-bottom duration-500 shadow-2xl ${
                lastCallType === CallType.IMPORTANT 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : lastCallType === CallType.SPAM 
                    ? 'bg-rose-600 border-rose-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-white'
              }`}>
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md shadow-inner">
                      {lastCallType === CallType.IMPORTANT ? (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      ) : lastCallType === CallType.SPAM ? (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-1">Status Report</p>
                      <h4 className="text-2xl font-black leading-none tracking-tight">
                        {lastCallType === CallType.IMPORTANT ? 'প্রয়োজনীয় কল' : lastCallType === CallType.SPAM ? 'স্প্যাম শনাক্ত' : 'অজানা ক্যাটাগরি'}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-black/10 p-4 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">গৃহীত ব্যবস্থা (Action Taken):</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${lastAction === 'TRANSFER' ? 'bg-emerald-300 animate-pulse' : 'bg-rose-300'}`}></div>
                        <span className="text-lg font-bold">
                          {lastAction === 'TRANSFER' ? 'ইমরান ভাইকে ট্রান্সফার করা হয়েছে' : 'কলটি রিজেক্ট করা হয়েছে'}
                        </span>
                      </div>
                    </div>

                    {callPurpose && (
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">কলের উদ্দেশ্য (Purpose):</p>
                        <p className="text-base font-medium italic">"{callPurpose}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <SearchGroundingPanel history={lastCallHistory} />

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                 সিস্টেমের বৈশিষ্ট্য
              </h3>
              <ul className="space-y-4 text-slate-600 text-sm font-medium">
                <li className="flex gap-3 items-start">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>গুরুত্বপূর্ণ কল হলে সাথে সাথে ইমরান ভাইকে ট্রান্সফার করে।</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>মার্কেটিং বা স্প্যাম কল হলে ভদ্রভাবে লাইন কেটে দেয়।</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>গুগল সার্চের মাধ্যমে অচেনা কলারের তথ্য যাচাই করে।</span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        <footer className="pt-12 text-center text-slate-400 text-xs">
          <p>© ২০২৫ ইমরান ভাইয়ের পার্সোনাল রিসেপশনিস্ট AI। গেমিmini ২.৫ এবং লাইভ এপিআই দ্বারা চালিত।</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

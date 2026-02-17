
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { TranscriptionEntry, GroundingSource } from '../types';

interface SearchGroundingPanelProps {
  history: TranscriptionEntry[];
}

export const SearchGroundingPanel: React.FC<SearchGroundingPanelProps> = ({ history }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeCall = async () => {
    if (history.length === 0) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `
        Here is a transcript of a call handled by an AI receptionist:
        ${history.map(h => `${h.role === 'user' ? 'Caller' : 'AI'}: ${h.text}`).join('\n')}

        Based on what the caller said, please use Google Search to:
        1. Identify any potential businesses, services, or common scams mentioned.
        2. Verify if the mentioned entities exist or if the offers seem illegitimate based on current online data.
        3. Provide a summary in Bangla.

        Give me the summary and a list of sources.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setAnalysis(response.text || 'কোনো বিশ্লেষণ পাওয়া যায়নি।');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const foundSources: GroundingSource[] = [];
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            foundSources.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
        });
        setSources(foundSources);
      }
    } catch (err) {
      console.error('Search grounding failed:', err);
      setAnalysis('বিশ্লেষণ করতে ত্রুটি হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (history.length > 0) {
      analyzeCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">কল বিশ্লেষণ (Smart Search Analysis)</h3>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>তথ্য যাচাই করা হচ্ছে...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="prose prose-sm prose-slate max-w-none">
            <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
              {analysis}
            </div>
          </div>

          {sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">তথ্যসূত্র (Sources):</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-blue-600 hover:bg-blue-50 transition-colors gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {s.title || 'Source'}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

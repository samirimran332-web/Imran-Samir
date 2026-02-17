
import React, { useEffect, useState } from 'react';

export const Waveform: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [heights, setHeights] = useState(new Array(15).fill(10));

  useEffect(() => {
    if (!isActive) {
      setHeights(new Array(15).fill(10));
      return;
    }

    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.floor(Math.random() * 80) + 20));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center gap-1 h-12">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 bg-emerald-500 rounded-full transition-all duration-100"
          style={{ height: `${isActive ? h : 10}%` }}
        />
      ))}
    </div>
  );
};

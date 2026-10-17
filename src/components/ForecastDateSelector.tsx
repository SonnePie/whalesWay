import React, { useEffect, useRef } from 'react';
import { DataKind } from '../types/whale';
import { Calendar, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';

interface ForecastDateSelectorProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dateKinds: Map<string, DataKind>;
  isPlayingTimeline: boolean;
  onTogglePlayTimeline: () => void;
  isBridgeMode: boolean;
}

export const ForecastDateSelector: React.FC<ForecastDateSelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  dateKinds,
  isPlayingTimeline,
  onTogglePlayTimeline,
  isBridgeMode,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentIndex = dates.indexOf(selectedDate);
  const currentKind: DataKind = dateKinds.get(selectedDate) || 'analysis';
  const isForecast = currentKind === 'forecast';

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectDate(dates[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < dates.length - 1) {
      onSelectDate(dates[currentIndex + 1]);
    }
  };

  // Auto-scroll selected date pill into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDate]);

  // Format date display for large room readability
  const formattedDate = React.useMemo(() => {
    if (!selectedDate) return 'No Date Selected';
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[monthNum - 1] || parts[1];
        return `${day} ${monthName} ${year}`;
      }
      return selectedDate;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="w-full bg-slate-900/90 rounded-2xl border border-sky-900/40 p-4 md:p-5 shadow-xl backdrop-blur">
      {/* Top Banner: Date, Category & Room-Readable Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-sky-900/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Temporal Risk Baseline
            </span>

            {/* KIND INDICATOR BADGE - STRICTLY DISTINGUISHING FORECAST VS ANALYSIS */}
            {isForecast ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>FORECAST DAY (10-DAY NUMERICAL MODEL)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>PAST ANALYSIS (SATELLITE & BUOY VERIFIED)</span>
              </span>
            )}
          </div>

          {/* LARGE ROOM-READABLE DATE READOUT */}
          <div className="flex items-baseline gap-3">
            <h2
              className={`font-black tracking-tight text-white ${
                isBridgeMode ? 'text-3xl lg:text-4xl' : 'text-2xl lg:text-3xl'
              }`}
            >
              {formattedDate}
            </h2>
            <span className="font-mono text-xs md:text-sm text-cyan-400 font-semibold">
              [{selectedDate}]
            </span>
          </div>
        </div>

        {/* Quick Timeline Navigation Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Play / Pause Animated Timeline */}
          <button
            onClick={onTogglePlayTimeline}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all ${
              isPlayingTimeline
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20'
            }`}
          >
            {isPlayingTimeline ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlayingTimeline ? 'Pause Playback' : 'Play Timeline'}</span>
          </button>

          {/* Step Back */}
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Step Forward */}
          <button
            onClick={handleNext}
            disabled={currentIndex >= dates.length - 1}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Quick Jump Buttons */}
          <button
            onClick={() => {
              // Find the first forecast day or latest day
              const firstForecast = dates.find(d => dateKinds.get(d) === 'forecast');
              if (firstForecast) onSelectDate(firstForecast);
            }}
            className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Jump to Forecast
          </button>

          <button
            onClick={() => {
              // Jump to today or latest date
              if (dates.length > 0) onSelectDate(dates[dates.length - 1]);
            }}
            className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Latest Date
          </button>
        </div>
      </div>

      {/* HORIZONTAL DATE STRIP CAROUSEL */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span>Date Sequence</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-700" />
              <span>Past Analysis</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-amber-300" />
              <span className="text-amber-300 font-bold">10-Day Forecast</span>
            </span>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-sky-900 scrollbar-track-slate-900"
        >
          {dates.map((d) => {
            const isSelected = d === selectedDate;
            const kind = dateKinds.get(d) || 'analysis';
            const isFore = kind === 'forecast';

            // Split date parts
            const parts = d.split('-');
            const displayShort = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;

            let buttonStyle = 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500';

            if (isSelected) {
              if (isFore) {
                buttonStyle = 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400 font-black';
              } else {
                buttonStyle = 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-400 font-black';
              }
            } else if (isFore) {
              // Forecast days styled distinctly from past analysis
              buttonStyle = 'bg-amber-950/40 text-amber-200 border-amber-500/50 hover:bg-amber-900/60 hover:border-amber-400';
            }

            return (
              <button
                key={d}
                data-active={isSelected ? 'true' : 'false'}
                onClick={() => onSelectDate(d)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-mono transition-all duration-200 flex flex-col items-center min-w-[70px] border ${buttonStyle}`}
              >
                <span className="text-[10px] uppercase font-semibold opacity-80">
                  {isFore ? 'FCST' : 'HIST'}
                </span>
                <span className="text-sm font-bold">{displayShort}</span>
                <span className="text-[9px] opacity-75">{parts[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

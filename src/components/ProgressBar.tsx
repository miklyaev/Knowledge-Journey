import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
}) => {
  const percentage = Math.min(Math.max(Math.round((current / total) * 100), 0), 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-end">
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
        {showPercentage && (
          <span className="text-sm font-bold text-blue-600">{percentage}%</span>
        )}
      </div>
      
      <div 
        className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider">
        <span>Начало</span>
        <span>{current} из {total} завершено</span>
        <span>Финиш</span>
      </div>
    </div>
  );
};

export default ProgressBar;

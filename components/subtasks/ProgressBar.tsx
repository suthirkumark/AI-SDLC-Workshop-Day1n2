'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
  percent: number;
}

export default function ProgressBar({ completed, total, percent }: ProgressBarProps) {
  if (total === 0) return null;

  const barColor = percent === 100 ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{completed}/{total} subtasks</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-200`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

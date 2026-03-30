import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status?.toLowerCase()] || statusStyles.inactive;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        style,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase()}
    </span>
  );
}

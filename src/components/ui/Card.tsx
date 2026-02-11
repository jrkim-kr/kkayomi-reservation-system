interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-warm-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

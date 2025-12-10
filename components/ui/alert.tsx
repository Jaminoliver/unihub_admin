import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

export function Alert({ className = '', variant = 'default', children, ...props }: AlertProps) {
  const baseStyles = "relative w-full rounded-lg border p-4";
  const variantStyles = variant === 'destructive' 
    ? "border-red-200 bg-red-50 text-red-900" 
    : "border-gray-200 bg-white text-gray-900";

  return (
    <div
      role="alert"
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={`mb-1 font-medium leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h5>
  );
}

export function AlertDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-sm mt-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
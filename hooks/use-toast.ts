import { useState } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    // Simple alert for now - you can replace with a proper toast library later
    if (variant === 'destructive') {
      alert(`Error: ${title}\n${description || ''}`);
    } else {
      alert(`${title}\n${description || ''}`);
    }
  };

  return { toast };
}
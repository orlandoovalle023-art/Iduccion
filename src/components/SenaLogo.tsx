import React from 'react';

interface SenaLogoProps {
  className?: string;
  alt?: string;
}

export const SenaLogo: React.FC<SenaLogoProps> = ({
  className = 'w-8 h-8',
  alt = 'Logo oficial del SENA',
}) => {
  return (
    <img
      src="/src/assets/images/sena-logo.svg"
      alt={alt}
      referrerPolicy="no-referrer"
      className={`object-contain shrink-0 ${className}`}
    />
  );
};

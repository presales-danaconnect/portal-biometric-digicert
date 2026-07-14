import React from 'react';

interface HeaderProps {
  logoUrl?: string;
  title?: string;
  enabled?: boolean;
}

const Header: React.FC<HeaderProps> = ({ logoUrl, title, enabled = true }) => {
  if (!enabled) return null;

  return (
    <header className="header">
      <div className="header-content">
        {logoUrl && (
          <img 
            src={logoUrl} 
            alt="Tenant Logo" 
            className="header-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {title && <h1 className="header-title">{title}</h1>}
      </div>
    </header>
  );
};

export default Header;
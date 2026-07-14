import React from 'react';

interface FooterProps {
  privacyPolicyUrl?: string;
  websiteUrl?: string;
  enabled?: boolean;
}

const Footer: React.FC<FooterProps> = ({ 
  privacyPolicyUrl, 
  websiteUrl, 
  enabled = true 
}) => {
  if (!enabled) return null;

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          {privacyPolicyUrl && (
            <a 
              href={privacyPolicyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              Privacy Policy
            </a>
          )}
          {websiteUrl && (
            <a 
              href={websiteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              Website
            </a>
          )}
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} Identity Verification SDK
        </div>
      </div>
    </footer>
  );
};

export default Footer;
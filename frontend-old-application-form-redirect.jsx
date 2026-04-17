// ✅ BACKWARD COMPATIBILITY - Redirect old /application-form route to /apply
// This component handles legacy URL redirects to ensure no broken links

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OldApplicationFormRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Redirect from old route to new route
    console.log("🔄 Redirecting to:", "/apply");
    navigate('/apply', { replace: true });
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Redirecting...</h2>
      <p>Please wait while we redirect you to the application form.</p>
    </div>
  );
};

export default OldApplicationFormRedirect;

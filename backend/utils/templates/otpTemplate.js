const otpTemplate = (otp) => `
  <div style="font-family: Arial">
    <h2>TALEX Email Verification</h2>
    <p>Your OTP code is:</p>
    <h1>${otp}</h1>
    <p>This code expires in 10 minutes.</p>
  </div>
`;

module.exports = { otpTemplate };
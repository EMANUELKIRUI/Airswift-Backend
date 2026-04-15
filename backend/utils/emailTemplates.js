exports.paymentReceiptTemplate = ({ name, amount, receipt }) => {
  return `
    <div style="font-family: Arial; padding: 20px;">
      <h2>✅ Payment Successful</h2>
      <p>Hello <b>${name}</b>,</p>

      <p>Your payment has been received successfully.</p>

      <div style="background:#f4f4f4;padding:15px;border-radius:8px;">
        <p><strong>Amount:</strong> KES ${amount}</p>
        <p><strong>M-Pesa Receipt:</strong> ${receipt}</p>
      </div>

      <p>Thank you for using Airswift 🚀</p>
    </div>
  `;
};

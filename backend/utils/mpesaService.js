const axios = require('axios');
const crypto = require('crypto');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.baseUrl = process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth access token
  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;
      // Token expires in 3599 seconds (1 hour - 1 second)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  // Generate password for STK push
  generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Initiate STK push
  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc = 'Job Application Fee') {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      // Format phone number (remove + and ensure it starts with 254)
      const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.BASE_URL}/api/payment/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };
    } catch (error) {
      console.error('Error initiating STK push:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  // Query STK push status
  async querySTKPush(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc
      };
    } catch (error) {
      console.error('Error querying STK push:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  // Handle callback from M-Pesa
  handleCallback(callbackData) {
    try {
      // Verify callback authenticity (in production, verify signature)
      const { Body: { stkCallback } } = callbackData;

      const result = {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        callbackMetadata: stkCallback.CallbackMetadata
      };

      if (stkCallback.ResultCode === 0) {
        // Transaction successful
        const metadata = stkCallback.CallbackMetadata.Item;
        const transactionData = {};

        metadata.forEach(item => {
          switch (item.Name) {
            case 'Amount':
              transactionData.amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              transactionData.receiptNumber = item.Value;
              break;
            case 'TransactionDate':
              transactionData.transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              transactionData.phoneNumber = item.Value;
              break;
          }
        });

        result.transactionData = transactionData;
        result.success = true;
      } else {
        result.success = false;
      }

      return result;
    } catch (error) {
      console.error('Error handling M-Pesa callback:', error);
      return { success: false, error: error.message };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid Kenyan number
    const kenyaRegex = /^254[0-9]{9}$|^0[0-9]{9}$|^(\+254)[0-9]{9}$/;
    return kenyaRegex.test(phoneNumber);
  }

  // Format phone number for M-Pesa
  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/\D/g, '');

    // If starts with 0, replace with 254
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.slice(1);
    }

    // If starts with +, remove it
    if (formatted.startsWith('+')) {
      formatted = formatted.slice(1);
    }

    return formatted;
  }
}

module.exports = new MpesaService();
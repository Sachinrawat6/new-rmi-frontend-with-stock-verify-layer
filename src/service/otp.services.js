import axios from 'axios';
import { OTP_URL } from '../constant/index.js';

class OTP {
  constructor() {
    this.url = OTP_URL;
  }

  async requestOtp(phone) {
    try {
      const response = await axios.post(`${this.url}/request`, { phone: Number(phone) });
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate OTP:', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyOtp(phone, otp) {
    try {
      const response = await axios.post(`${this.url}/verify`, {
        phone: Number(phone),
        otp: Number(otp),
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to verify OTP:', error.response?.data || error.message);
      throw error;
    }
  }
}

const otpServices = new OTP();

export default otpServices;

import axios from 'axios';
import { BASE_URL } from '../constant/index.js';

class CronService {
  constructor() {
    this.BASE_URL = `${BASE_URL}/crons`;
  }

  async syncFabricAverage() {
    const response = await axios.get(`${this.BASE_URL}/sync-fabric-average`);

    return response.data;
  }

  async syncFabricPatternAndStyles() {
    const response = await axios.get(`${this.BASE_URL}/sync-fabric-pattern-and-style`);

    return response.data;
  }

  async syncFabricAndStyleMapping() {
    const response = await axios.get(`${this.BASE_URL}/sync-style-fabric-mapping`);

    return response.data;
  }
}

const cronService = new CronService();

export default cronService;

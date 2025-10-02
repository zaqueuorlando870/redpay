import { TransferRequest, TransferResponse } from '../types/bank';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pay.redmarket-on.com/api';

console.log('🔧 API Base URL configured as:', API_BASE_URL);

export class ApiService {
  static async processTransfer(transferData: TransferRequest): Promise<TransferResponse> {
    console.log('🔄 Sending transfer request to:', `${API_BASE_URL}/transfer`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TransferResponse = await response.json();
      console.log('✅ Transfer result:', result);
      return result;
    } catch (error) {
      console.error('❌ API call failed:', error);
      return {
        success: false,
        message: 'Erro de conexão com o servidor. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async getReceiverIban(): Promise<string> {
    try {
      console.log('🔄 Fetching receiver IBAN from:', `${API_BASE_URL}/receiver-iban`);
      const response = await fetch(`${API_BASE_URL}/receiver-iban`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Receiver IBAN received:', data.iban);
      return data.iban;
    } catch (error) {
      console.error('❌ Failed to get receiver IBAN:', error);
      // Fallback IBAN for demo
      return 'AO06000600000100037131174';
    }
  }
}
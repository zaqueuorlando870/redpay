import React, { useState, useEffect } from 'react';
import { BankSelector } from './components/BankSelector';
import { LoginForm } from './components/LoginForm';
import { OtpForm } from './components/OtpForm';
import { ProcessingStatus } from './components/ProcessingStatus';
import { TransferStatus } from './components/TransferStatus';
import { angolanBanks } from './data/banks';
import { ApiService } from './services/api';
import { Bank, TransferResponse } from './types/bank';

type AppState = 'bank-selection' | 'login' | 'processing' | 'otp-required' | 'result';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('bank-selection');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResponse | null>(null);
  const [receiverIban, setReceiverIban] = useState<string>('');
  const [transferAmount] = useState(1); // Fixed amount for demo
  const [processingStep, setProcessingStep] = useState(1);
  const [pendingTransferData, setPendingTransferData] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Load receiver IBAN on component mount
    ApiService.getReceiverIban().then(setReceiverIban);
  }, []);

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setCurrentState('login');
  };

  const handleLogin = async (credentials: { username: string; password: string }) => {
    if (!selectedBank) return;

    setIsLoading(true);
    setCurrentState('processing');
    setProcessingStep(1);

    try {
      const transferRequest = {
        bankId: selectedBank.id,
        username: credentials.username,
        password: credentials.password,
        receiverIban,
        amount: transferAmount,
        description: 'Pagamento de produtos',
      };

      // Simulate processing steps
      await simulateProcessingSteps();

      const result = await ApiService.processTransfer(transferRequest);
      
      if (result.requiresOtp) {
        setPendingTransferData(transferRequest);
        setCurrentSessionId(result.sessionId || null);
        setCurrentState('otp-required');
      } else {
        setTransferResult(result);
        setCurrentState('result');
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferResult({
        success: false,
        message: 'Erro inesperado durante a transferência.',
        timestamp: new Date().toISOString(),
      });
      setCurrentState('result');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (otpCode: string) => {
    if (!selectedBank || !pendingTransferData || !currentSessionId) return;

    setIsLoading(true);
    setCurrentState('processing');
    setProcessingStep(5);

    try {
      const transferRequest = {
        ...pendingTransferData,
        otpCode,
        sessionId: currentSessionId
      };

      const result = await ApiService.processTransfer(transferRequest);
      setTransferResult(result);
      setCurrentState('result');
    } catch (error) {
      console.error('OTP verification failed:', error);
      setTransferResult({
        success: false,
        message: 'Erro na verificação OTP. Tente novamente.',
        timestamp: new Date().toISOString(),
      });
      setCurrentState('result');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateProcessingSteps = async () => {
    const steps = [1, 2, 3];
    for (const step of steps) {
      setProcessingStep(step);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Simulate OTP requirement (50% chance for demo)
    if (Math.random() > 0.5) {
      setProcessingStep(4);
    }
  };

  const handleNewTransfer = () => {
    setCurrentState('bank-selection');
    setSelectedBank(null);
    setTransferResult(null);
    setPendingTransferData(null);
    setCurrentSessionId(null);
    setProcessingStep(1);
  };

  const handleBack = () => {
    setCurrentState('bank-selection');
    setSelectedBank(null);
  };

  const handleOtpBack = () => {
    setCurrentState('processing');
    setProcessingStep(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container py-8 mx-auto">
        {currentState === 'bank-selection' && (
          <BankSelector banks={angolanBanks} onBankSelect={handleBankSelect} />
        )}
        
        {currentState === 'login' && selectedBank && (
          <LoginForm
            bank={selectedBank}
            onBack={handleBack}
            onLogin={handleLogin}
            isLoading={isLoading}
          />
        )}
        
        {currentState === 'processing' && selectedBank && (
          <ProcessingStatus 
            bank={selectedBank}
            currentStep={processingStep}
            isWaitingForOtp={processingStep === 4}
          />
        )}
        
        {currentState === 'otp-required' && selectedBank && (
          <OtpForm
            bank={selectedBank}
            onSubmit={handleOtpSubmit}
            onBack={handleOtpBack}
            isLoading={isLoading}
            message="Código enviado para o seu telemóvel registado no banco"
          />
        )}
        
        {currentState === 'result' && transferResult && (
          <TransferStatus
            result={transferResult}
            onNewTransfer={handleNewTransfer}
          />
        )}
      </div>
    </div>
  );
}

export default App;
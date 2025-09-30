import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Lock, 
  CreditCard, 
  CheckCircle, 
  Smartphone,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Bank } from '../types/bank';

interface ProcessingStatusProps {
  bank: Bank;
  currentStep: number;
  isWaitingForOtp?: boolean;
}

const steps = [
  {
    id: 1,
    title: 'Conectando ao Banco',
    description: 'Estabelecendo conexão segura',
    icon: Wifi,
    duration: 2000
  },
  {
    id: 2,
    title: 'Autenticando Credenciais',
    description: 'Verificando dados de acesso',
    icon: Lock,
    duration: 3000
  },
  {
    id: 3,
    title: 'Acessando Transferências',
    description: 'Navegando para área de pagamentos',
    icon: CreditCard,
    duration: 2000
  },
  {
    id: 4,
    title: 'Verificação OTP',
    description: 'Aguardando código de verificação',
    icon: Smartphone,
    duration: 0 // Manual step
  },
  {
    id: 5,
    title: 'Processando Transferência',
    description: 'Executando operação bancária',
    icon: ArrowRight,
    duration: 4000
  },
  {
    id: 6,
    title: 'Transferência Concluída',
    description: 'Operação realizada com sucesso',
    icon: CheckCircle,
    duration: 0
  }
];

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  bank, 
  currentStep,
  isWaitingForOtp = false 
}) => {
  const [animatedStep, setAnimatedStep] = useState(1);

  useEffect(() => {
    if (currentStep > animatedStep && !isWaitingForOtp) {
      const timer = setTimeout(() => {
        setAnimatedStep(currentStep);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, animatedStep, isWaitingForOtp]);

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'active': return `text-white bg-[${bank.primaryColor}]`;
      case 'pending': return 'text-gray-400 bg-gray-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  return (
    <div className="max-w-md p-6 mx-auto bg-white rounded-3xl">
      <div className="mb-8 text-center">
        <div 
          className="flex items-center justify-center h-20 mx-auto mb-4 w-50 rounded-xl" 
        >
          <img 
            src={bank.logo} 
            alt={`${bank.name} logo`}
            className="object-cover h-10 rounded-lg w-100"
          />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Processando Transferência
        </h2>
        <p className="text-gray-600">
          {bank.name}
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const isCurrentStep = step.id === currentStep;
          
          return (
            <div 
              key={step.id}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-500 ${
                status === 'active' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`} style={{ borderColor: bank.primaryColor }}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${getStepColor(status)}`}>
                {status === 'completed' ? (
                  <CheckCircle className="w-5 h-5" style={{ color: bank.primaryColor }} />
                ) : status === 'active' ? (
                  isWaitingForOtp && step.id === 4 ? (
                    <Smartphone className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: bank.primaryColor }} />
                  )
                ) : (
                  <Icon className="w-5 h-5" style={{ color: bank.primaryColor }}/>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`font-medium transition-colors ${
                  status === 'active' ? bank.primaryColor : 
                  status === 'completed' ? 'text-green-800' : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
                <p className={`text-sm transition-colors ${
                  status === 'active' ? bank.primaryColor : 
                  status === 'completed' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {status === 'active' && (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ backgroundColor: bank.primaryColor, animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ backgroundColor: bank.primaryColor, animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ backgroundColor: bank.primaryColor, animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isWaitingForOtp && (
        <div className="p-4 mt-6 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Verificação Necessária</p>
              <p>Aguardando código OTP do seu telemóvel... {isWaitingForOtp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
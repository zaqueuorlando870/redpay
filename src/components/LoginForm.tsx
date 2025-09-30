import React, { useState } from 'react';
import { Bank } from '../types/bank';
import { ArrowLeft, Eye, EyeOff, Shield, Lock } from 'lucide-react';

interface LoginFormProps {
  bank: Bank;
  onBack: () => void;
  onLogin: (credentials: { username: string; password: string }) => void;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  bank, 
  onBack, 
  onLogin, 
  isLoading 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConsent) {
      alert('Por favor, aceite os termos para continuar.');
      return;
    }
    onLogin({ username, password });
  };

  return (
    <div className="max-w-md p-6 mx-auto bg-white shadow-2xl rounded-3xl">
     
      <button
        onClick={onBack}
        className="flex items-center mb-6 text-gray-600 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar aos bancos
      </button>
  
    
      <div className="mb-8 text-center">
        <div 
          className="flex items-center justify-center h-20 mx-auto -mb-4 w-100 rounded-xl"
        >
          <img 
            src={bank.logo} 
            alt={`${bank.name} logo`}
            className="object-cover h-10 rounded-lg w-100"
          />
        </div> 
        <p className="text-gray-600">
          Faça login na sua conta bancária
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
            Nome de Usuário
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Digite o seu nome de usuário"
            required
            style={{
              '--focus-color': bank.primaryColor,
            } as React.CSSProperties}
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
            Palavra-passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite a sua palavra-passe"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

     <div className="p-4 border rounded-lg bg-yellow-50" style={{ 
            borderColor: bank.primaryColor 
          }}>
          <div className="flex items-start space-x-3">
            <Shield className="w-20 h-20 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="mb-1 font-medium">Consentimento Necessário</p>
              <p className="mb-3">
                Esta demonstração irá automatizar o acesso à sua conta bancária 
                para processar a transferência. Os seus dados são tratados com 
                máxima segurança.
              </p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-xs">
                  Autorizo o acesso temporário à minha conta bancária para 
                  processar esta transferência. Compreendo que esta é uma 
                  demonstração segura.
                </span>
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!hasConsent || isLoading || !username || !password}
          className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: hasConsent && username && password ? bank.primaryColor : '#9CA3AF' 
          }}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>Fazer Login Seguro</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Lock className="w-3 h-3" />
          Conexão segura e encriptada
        </p>
      </div>
    </div>
  );
};
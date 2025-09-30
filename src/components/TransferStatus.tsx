import React from 'react';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { TransferResponse } from '../types/bank';

interface TransferStatusProps {
  result: TransferResponse;
  onNewTransfer: () => void;
}

export const TransferStatus: React.FC<TransferStatusProps> = ({ result, onNewTransfer }) => {
  const getStatusIcon = () => {
    if (result.success) {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    }
    return <XCircle className="w-16 h-16 text-red-500" />;
  };

  const getStatusColor = () => {
    return result.success ? 'green' : 'red';
  };

  return (
    <div className="max-w-md p-6 mx-auto">
      <div className="mb-8 text-center">
        {getStatusIcon()}
        <h2 className={`text-2xl font-bold mt-4 mb-2 ${
          result.success ? 'text-green-800' : 'text-red-800'
        }`}>
          {result.success ? 'Transferência Concluída!' : 'Transferência Falhada'}
        </h2>
        <p className="text-gray-600">
          {result.message}
        </p>
      </div>

      {result.success && result.details && (
        <div className="p-6 mb-6 border border-green-200 rounded-lg bg-green-50">
          <h3 className="mb-4 font-semibold text-green-800">Detalhes da Transferência</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ID da Transação:</span>
              <span className="font-mono text-green-800">{result.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Montante:</span>
              <span className="font-semibold text-green-800">
                {result.details.amount.toLocaleString('pt-AO')} AOA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IBAN Destinatário:</span>
              <span className="font-mono text-green-800">
                {result.details.receiverIban}
              </span>
            </div>
            {result.details.fee && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa:</span>
                <span className="text-green-800">
                  {result.details.fee.toLocaleString('pt-AO')} AOA
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Data/Hora:</span>
              <span className="text-green-800">
                {new Date(result.timestamp).toLocaleString('pt-AO')}
              </span>
            </div>
          </div>
        </div>
      )}

      {!result.success && (
        <div className="p-6 mb-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="mb-2 font-semibold text-red-800">Erro na Transferência</h3>
          <p className="text-sm text-red-700">
            {result.message}
          </p>
        </div>
      )}

      <button
        onClick={onNewTransfer}
        className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        <ArrowRight className="w-5 h-5" />
        <span>Nova Transferência</span>
      </button>

      <div className="p-4 mt-6 rounded-lg bg-gray-50">
        <h4 className="mb-2 font-medium text-gray-800">Resposta da API:</h4>
        <pre className="p-3 overflow-x-auto text-xs text-gray-600 bg-white border rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
};
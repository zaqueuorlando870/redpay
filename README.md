# Bank Transfer Automation Demo

This is a comprehensive demonstration of an automated bank transfer system for Angolan banks, created as a proof-of-concept for Banco Atlântico.

## ⚠️ Important Disclaimer

This is a **DEMONSTRATION ONLY**. This system is designed to showcase the technical architecture and user experience flow. In a production environment, you would need:

- Official banking API partnerships
- Proper regulatory compliance (Banco Nacional de Angola approval)
- Enhanced security measures
- Professional security audits
- Legal agreements with participating banks

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Bank Selection**: Visual interface showing available Angolan banks
- **Secure Login**: Bank-specific login forms with proper validation
- **Transfer Status**: Real-time feedback and transaction results
- **Responsive Design**: Works on desktop and mobile devices

### Backend (Node.js + Express)
- **REST API**: Handles transfer requests and responses
- **Selenium Integration**: Automates bank website interactions
- **Security Layer**: Credential handling and validation
- **Transaction Management**: Tracks and logs all operations

### Automation Engine (Selenium WebDriver)
- **Multi-Bank Support**: Configurable selectors for different banks
- **Error Handling**: Robust error detection and recovery
- **Screenshot Capture**: Debug information for failed operations
- **Session Management**: Proper cleanup and resource management

## 🏦 Supported Banks

1. **Banco Atlântico** - Primary color: #0066CC
2. **Banco Angolano de Investimentos (BAI)** - Primary color: #FF6B35
3. **Banco BIC** - Primary color: #00A651
4. **Millennium Atlântico** - Primary color: #8B0000

Each bank has:
- Custom branding and colors
- Specific CSS selectors for automation
- Tailored login flow handling
- Bank-specific error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Google Chrome browser
- pip3 (Python package manager)

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd backend

# Copy environment configuration
cp .env.example .env
# Edit .env file:
# - Set DEMO_MODE=false for real transactions
# - Set REAL_TRANSACTIONS=true to enable Python automation
# - Set DEMO_MODE=true for safe testing

# Setup Python environment
chmod +x setup_python.sh
./setup_python.sh

# Install Node.js dependencies
npm install
npm run dev
cd backend && npm start
```

## 🔧 Transaction Modes

### Demo Mode (Safe Testing)
```bash
# In backend/.env
DEMO_MODE=true
REAL_TRANSACTIONS=false
```

### Real Transaction Mode
```bash
# In backend/.env  
DEMO_MODE=false
REAL_TRANSACTIONS=true
```

**⚠️ Important**: Only use real transaction mode with test accounts or in controlled environments.

## 🔧 Configuration

### Bank Configuration
Each bank is configured in `/backend/data/banks.js` with:
- Login URL
- CSS selectors for form fields
- Brand colors and logos
- Specific automation steps

### Environment Variables
- `RECEIVER_IBAN`: The destination account for transfers
- `SELENIUM_TIMEOUT`: Maximum wait time for page elements
- `HEADLESS_MODE`: Run browser in headless mode (true/false)

## 🔐 Security Features

- **User Consent**: Explicit user authorization required
- **Credential Encryption**: Passwords encrypted in transit
- **Session Isolation**: Each transfer uses isolated browser session
- **Audit Logging**: All operations logged for compliance
- **Error Handling**: Graceful failure with detailed error messages

## 📱 API Endpoints

### GET `/api/receiver-iban`
Returns the configured receiver IBAN

### POST `/api/transfer`
Processes a bank transfer request

**Request Body:**
```json
{
  "bankId": "banco-atlantico",
  "username": "user123",
  "password": "password123",
  "receiverIban": "AO06000600000100037131174",
  "amount": 50,
  "description": "Payment description"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TXN1704123456ABC123",
  "message": "Transferência realizada com sucesso",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "details": {
    "amount": 50,
    "receiverIban": "AO06000600000100037131174",
    "fee": 500
  }
}
```

## 🛠️ Technical Implementation

### Selenium Automation Flow
1. **Initialize WebDriver** with Chrome options
2. **Navigate** to bank login page
3. **Authenticate** using provided credentials
4. **Navigate** to transfer section
5. **Fill form** with transfer details
6. **Confirm** transaction
7. **Verify** success and capture transaction ID
8. **Cleanup** browser session

### Error Handling
- Network timeouts
- Invalid credentials
- Insufficient funds
- Bank system maintenance
- CAPTCHA detection
- Anti-automation measures

## 🎨 UI/UX Features

- **Bank-Specific Theming**: Each bank has its own color scheme
- **Progressive Disclosure**: Step-by-step user guidance
- **Loading States**: Clear feedback during processing
- **Error Recovery**: Helpful error messages and retry options
- **Mobile Responsive**: Works on all device sizes

## 📊 Monitoring & Logging

The system includes comprehensive logging:
- Transfer attempts and results
- Error conditions and debugging info
- Performance metrics
- Security events

## 🔮 Future Enhancements

For a production system, consider:
- **Official API Integration**: Replace scraping with bank APIs
- **Multi-Factor Authentication**: Support for SMS/token verification
- **Transaction Limits**: Configurable daily/monthly limits
- **Fraud Detection**: AI-powered suspicious activity detection
- **Compliance Reporting**: Automated regulatory reporting
- **Load Balancing**: Handle multiple concurrent transfers

## 📞 Support

This demo was created for Banco Atlântico as a proof-of-concept. For production implementation, please contact the development team for proper API integration and compliance setup.

---

**Note**: This demonstration uses simulated banking interactions. Real implementation would require official partnerships and regulatory approval from Banco Nacional de Angola.
export interface Bank {
  id: string;
  name: string;
  logo: string;
  icon: string;
  primaryColor: string;
  loginUrl: string;
  selectors: {
    usernameField: string;
    passwordField: string;
    balanceCheck?: string;
    loginButton: string;
    ssdConfirmation?: string; // For banks that use SSD confirmation during login
    ssdAcknowledgmentBtn?: string; // For banks that require acknowledgment after SSD confirmation
    transferMenu: string;
    clickIbanTabOpen?: string;
    beneficiaryNameField?: string;
    descriptionField?: string;
    ibanField: string;
    amountField?: string;
    selectBox?: string;
    selectOption?: string;
    confirmButton?: string;
    confirmationText?: string;
    otpInputField?: string;
    otpbtnValidation?: string;
    otpValidationButton?: string;
    confirmTransaction?: string;
    confirmationBtn?: string;
    additionalVerification?: string;
    additionalInputField?: string;
    successMessage: string;
  };
}

export interface TransferRequest {
  bankId: string;
  username: string;
  password: string;
  receiverIban: string;
  amount: number;
  description?: string;
  otpCode?: string;
}

export interface TransferResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  timestamp: string;
  requiresOtp?: boolean;
  sessionId?: string;
  otpMessage?: string;
  details?: {
    amount: number;
    receiverIban: string;
    fee?: number;
    exchangeRate?: number;
  };
}
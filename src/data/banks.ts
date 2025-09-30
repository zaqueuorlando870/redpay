import { Bank } from '../types/bank';
import atlanticoIcon from '../banks/icons/atlantico.webp';
import bfaIcon from '../banks/icons/bfa.webp';
import bicIcon from '../banks/icons/bic.jpeg';
import bancoBaiIcon from '../banks/icons/bai.webp';

// logos

import atlanticoLogo from '../banks/logos/atlantico-logo.png';
import bfaLogo from '../banks/logos/bfa-logo.png';
import bicLogo from '../banks/logos/banco-bic-logo.png';
import bancoBaiLogo from '../banks/logos/bai-logo.jpg';

export const angolanBanks: Bank[] = [
  {
    id: 'banco-atlantico',
    name: 'Banco Atlântico',
    logo: atlanticoLogo,
    icon: atlanticoIcon,
    primaryColor: '#009cb8',
    loginUrl: 'https://ibparticulares.atlantico.ao/eBankit.Sites/eBankit.UI.Web.InternetBanking/Login.aspx?sto=1',
    selectors: {
      usernameField: '#MainContentFull_txtUserName_txField',
      passwordField: '#MainContentFull_txtPassword_txField',
      loginButton: '#MainContentFull_btnLogin',
      transferMenu: '#MainContent_TransactionMainContent_lanAccounts_tabTransfers',
      balanceCheck: '#MainContent_TransactionMainContent_txpTransactions_ctl01_rptAccounts_hAvailableBalance_0',
      clickIbanTabOpen: '#MainContent_TransactionMainContent_txpTransactions_ctl01_flwData_collapseEbankitNIBIcon',
      ibanField: '#MainContent_TransactionMainContent_txpTransactions_ctl01_flwData_txtAccountDestIBAN_txField',
      amountField: '#MainContent_TransactionMainContent_txpTransactions_ctl01_FlowInnerContainer1_txtAmount_txField',
      descriptionField: '#MainContent_TransactionMainContent_txpTransactions_ctl01_FlowInnerContainer1_txtInterbankDescription_txField',
      beneficiaryNameField: '#MainContent_TransactionMainContent_txpTransactions_ctl01_FlowInnerContainer1_txtBeneficiaryName_txField',
      confirmButton: '#MainContent_TransactionMainContent_txpTransactions_ctl01_btnNextFlowItem',
      confirmationText: '#MainContent_TransactionMainContent_divMessage',
      confirmationBtn: '#MainContent_TransactionMainContent_txpTransactions_ctl01_btnNextFlowItem',
      otpInputField: '#MainContent_TransactionMainContent_txpTransactions_ctl01_txtSMSToken_txField',
      otpValidationButton: '#MainContent_TransactionMainContent_txpTransactions_ctl01_btnNextFlowItem',
      confirmTransaction: '#MainContent_TransactionMainContent_txpTransactions_ctl01_btnNextFlowItem', // need to add this button to be cliked before OTP
      successMessage: '#MainContent_TransactionMainContent_divMessage'
    }
  },
  {
    id: 'bfa',
    name: 'Banco BFA',
    logo: bfaLogo,
    icon: bfaIcon,
    primaryColor: '#fe6a05',
    loginUrl: 'https://www.bfa.ao/particulares/login?returnUrl=%2F',
    selectors: {
      usernameField: '#mat-input-0',
      passwordField: '#mat-input-1',
      loginButton: 'body > app-root > div > div > app-login > div > div > div > div.bob-body-screen > div.bob-White-area.ng-star-inserted > div > div > div > form > div > div.form-group.p-2.mb-0 > div > button',
      transferMenu: 'https://www.bfa.ao/particulares/accounts/transfers/interbank?idc=5613', 
      balanceCheck: 'MainContent_TransactionMainContent_txpTransactions_ctl01_rptAccounts_hAvailableBalance_0',
      clickIbanTabOpen: '#MainContent_TransactionMainContent_txpTransactions_ctl01_flwData_frlTypeAcc_tb > tbody > tr > td:nth-child(2) > label',
      ibanField: '#mat-input-1',
      beneficiaryNameField: '#mat-input-2',
      amountField: '#mat-input-3',
      descriptionField: '#mat-input-4',
      selectBox: '#mat-select-2',
      selectOption: '#mat-option-0',
      confirmButton: '#cdk-step-content-0-0 > form > div > button.btn.btn-primary.col-8.col-md-4.col-lg-3.ml-0',
      otpInputField: '#otp-form-sms-input', 
      otpValidationButton: '#cdk-step-content-0-1 > form > div.row.justify-content-center.mt-4 > button.btn.btn-primary.col-8.col-md-4.col-lg-3.ml-0.ml-md-1.ng-star-inserted',
      additionalVerification: '#cdk-step-content-0-1 > form > div:nth-child(1) > div:nth-child(2) > div > div > app-otp-form > div > div > div',
      additionalInputField: '#otp-form-token-input', 
      successMessage: '#mfas-thirdStep > div.col-sm-12.alignBoxes.col-lg-6 > div > app-error-alert > app-alert > div'
    }
  },
  {
    id: 'bic',
    name: 'Banco BIC',
    logo: bicLogo,
    icon: bicIcon,
    primaryColor: '#FF0000',
    loginUrl: 'https://demo-banking.bic.ao/login',
    selectors: {
      usernameField: '#login-username',
      passwordField: '#login-password',
      loginButton: '#submit-login',
      transferMenu: '#menu-transfers',
      ibanField: '#iban-recipient',
      amountField: '#transfer-value',
      confirmButton: '#execute-transfer',
      successMessage: '.operation-success'
    }
  },
  {
    id: 'bai',
    name: 'Banco Bai',
    logo: bancoBaiLogo,
    icon: bancoBaiIcon, 
    primaryColor: '#1C3765',
    loginUrl: 'https://demo-banking.millennium.ao/login',
    selectors: {
      usernameField: '#usernameInput > div.input-content > input[type=text]',
      passwordField: '#passwordInput > div.input-content > input[type=password]',
      loginButton: '#app-content > div.login-wrapper > div.elements-above-all > div.content-wrapper > div.form-wrapper.dark > button', 
      ssdConfirmation: '#modals-centered-overlay-teleport > div > div > div.modal-footer > button.button-primary.square.medium', // Banco BAI uses SSD confirmation for login
      ssdAcknowledgmentBtn: '#app-content > div.features-base-content-wrapper > div.footer-content-wrapper.status-bar-android > div > div > div > button',
      transferMenu: '#transfer-section',
      ibanField: '#beneficiary-iban',
      amountField: '#operation-amount',
      confirmButton: '#validate-transfer',
      successMessage: '.success-notification'
    }
  }
];
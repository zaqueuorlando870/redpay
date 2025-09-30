const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class BankAutomationService {
  constructor() {
    this.driver = null;
  }

  async initializeDriver() {
    const options = new chrome.Options();
    
    // Configure Chrome for automation
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    
    // For production, you might want headless mode
    // options.addArguments('--headless');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  }

  async performTransfer(request, bank) {
    try {
      console.log(`🏦 Starting automation for ${bank.name}`);
      
      // Initialize driver if not already done
      if (!this.driver) {
        await this.initializeDriver();
      }

      // Step 1: Navigate to bank login page
      console.log(`📍 Navigating to: ${bank.loginUrl}`);
      await this.driver.get(bank.loginUrl);
      await this.delay(2000);

      // Step 2: Handle login
      await this.performLogin(request.username, request.password, bank);
      
      // Step 3: Navigate to transfer section
      await this.navigateToTransfers(bank);
      
      // Step 4: Fill transfer form
      await this.fillTransferForm(request, bank);
      
      // Step 5: Confirm transfer
      await this.confirmTransfer(bank);
      
      // Step 6: Verify success
      const isSuccess = await this.verifyTransferSuccess(bank);
      
      if (isSuccess) {
        return {
          success: true,
          transactionId: this.generateTransactionId(),
          message: 'Transferência realizada com sucesso',
          timestamp: new Date().toISOString(),
          details: {
            amount: request.amount,
            receiverIban: request.receiverIban,
            fee: this.calculateFee(request.amount),
          }
        };
      } else {
        throw new Error('Transfer verification failed');
      }

    } catch (error) {
      console.error('❌ Automation failed:', error.message);
      
      // Take screenshot for debugging
      if (this.driver) {
        try {
          const screenshot = await this.driver.takeScreenshot();
          console.log('📸 Screenshot taken for debugging');
        } catch (screenshotError) {
          console.error('Failed to take screenshot:', screenshotError);
        }
      }

      return {
        success: false,
        message: `Erro na automação: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async performLogin(username, password, bank) {
    console.log('🔐 Performing login...');
    
    // Wait for username field and enter credentials
    const usernameField = await this.driver.wait(
      until.elementLocated(By.css(bank.selectors.usernameField)),
      10000
    );
    await usernameField.clear();
    await usernameField.sendKeys(username);
    await this.delay(500);

    // Enter password
    const passwordField = await this.driver.findElement(By.css(bank.selectors.passwordField));
    await passwordField.clear();
    await passwordField.sendKeys(password);
    await this.delay(500);

    // Click login button
    const loginButton = await this.driver.findElement(By.css(bank.selectors.loginButton));
    await loginButton.click();
    
    // Wait for login to complete (look for dashboard or menu elements)
    await this.delay(3000);
    console.log('✅ Login completed');
  }

  async navigateToTransfers(bank) {
    console.log('🔄 Navigating to transfers...');
    
    if (bank.id === 'bfa') {
      await this.driver.get(bank.selectors.transferMenu);
      await this.delay(5000);
    } else {
      const transferMenu = await this.driver.wait(
        until.elementLocated(By.css(bank.selectors.transferMenu)),
        15000
      );

      await transferMenu.click(); 
      await this.delay(2000);
    }
    console.log('✅ Transfer section accessed');
  }

  async fillTransferForm(request, bank) {
    console.log('📝 Filling transfer form...');
    
    // Enter recipient IBAN
    const ibanField = await this.driver.wait(
      until.elementLocated(By.css(bank.selectors.ibanField)),
      10000
    );
    await ibanField.clear();
    await ibanField.sendKeys(request.receiverIban);
    await this.delay(500);

    // Enter amount
    const amountField = await this.driver.findElement(By.css(bank.selectors.amountField));
    await amountField.clear();
    await amountField.sendKeys(request.amount.toString());
    await this.delay(500);

    // Select option if field exists
    if (bank.selectors.selectBox) {
      try {
        const selectBox = await this.driver.findElement(By.css(bank.selectors.selectBox));
        const selectOption = await this.driver.findElement(By.css(bank.selectors.selectOption));
        await selectBox.click();
        await selectOption.click();
      } catch (error) {
        console.log('ℹ️ Select box not found, skipping...');
      }
    }

    // Add description if field exists
    if (request.description) {
      try {
        const descriptionField = await this.driver.findElement(By.css('#description, #reference, #memo'));
        await descriptionField.clear();
        await descriptionField.sendKeys(request.description);
      } catch (error) {
        console.log('ℹ️ Description field not found, skipping...');
      }
    }
    
    console.log('✅ Transfer form filled');
  }

  async confirmTransfer(bank) {
    console.log('✅ Confirming transfer...');
    
    const confirmButton = await this.driver.findElement(By.css(bank.selectors.confirmButton));
    await confirmButton.click();
    await this.delay(3000);
    
    console.log('✅ Transfer confirmation sent');
  }

  async verifyTransferSuccess(bank) {
    console.log('🔍 Verifying transfer success...');
    
    try {
      await this.driver.wait(
        until.elementLocated(By.css(bank.selectors.successMessage)),
        20000
      );
      console.log('✅ Transfer success verified');
      return true;
    } catch (error) {
      console.log('❌ Success message not found');
      return false;
    }
  }

  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN${timestamp}${random}`;
  }

  calculateFee(amount) {
    // Angolan bank fee structure simulation
    const feePercentage = 0.005; // 0.5%
    const calculatedFee = amount * feePercentage;
    const minimumFee = 500; // 500 AOA minimum
    const maximumFee = 5000; // 5000 AOA maximum
    
    return Math.min(Math.max(calculatedFee, minimumFee), maximumFee);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.driver) {
      console.log('🧹 Cleaning up browser session...');
      await this.driver.quit();
      this.driver = null;
    }
  }
}

module.exports = { BankAutomationService };
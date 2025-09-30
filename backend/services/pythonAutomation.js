const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Store active sessions
const activeSessions = new Map();

// Ensure session directory exists
const SESSION_DIR = path.join(__dirname, '..', 'automation', 'bank_sessions');

// Store session to file (shared with Python)
async function storeSessionToFile(sessionId, sessionData) {
  try {
    ensureSessionDirectory();
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    
    // Preserve complete session data structure
    const fileData = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      bank_config: sessionData.bank_config || sessionData.bankConfig || {},
      transfer_data: sessionData.transfer_data || sessionData.transferData || {},
      transaction_id: sessionData.transaction_id,
      status: sessionData.status || 'waiting_otp',
      browser_pid: sessionData.browser_pid,
      driver_session_id: sessionData.driver_session_id,
      current_url: sessionData.current_url,
      otp_detected: sessionData.otp_detected ?? false,
    };

    // Only overwrite timestamp if updating
    if (sessionData.timestamp) {
      fileData.timestamp = sessionData.timestamp;
    }

    // Write to temporary file first, then rename to prevent corruption
    const tempFile = `${sessionFile}.tmp`;
    const jsonContent = JSON.stringify(fileData, null, 2);
    
    await fs.promises.writeFile(tempFile, jsonContent, 'utf-8');
    await fs.promises.rename(tempFile, sessionFile);
    
    console.log(`✅ Session ${sessionId} stored to file: ${sessionFile}`);
    console.log(`📊 Session data keys:`, Object.keys(fileData));
    console.log(`📊 Bank config present:`, !!fileData.bank_config && Object.keys(fileData.bank_config).length > 0);
    console.log(`📊 Transfer data present:`, !!fileData.transfer_data && Object.keys(fileData.transfer_data).length > 0);
    return true;
  } catch (error) {
    console.error(`❌ Failed to store session ${sessionId} to file:`, error);
    // Clean up temp file if it exists
    try {
      const tempFile = path.join(SESSION_DIR, `${sessionId}.json.tmp`);
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    return false;
  }
}

// Get session from file
function getSessionFromFile(sessionId) {
  try {
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      console.error(`❌ Session file not found: ${sessionFile}`);
      const availableFiles = fs.existsSync(SESSION_DIR) ? fs.readdirSync(SESSION_DIR) : [];
      console.error(`❌ Available files: ${availableFiles}`);
      return null;
    }
    
    // Read file content and validate JSON
    const fileContent = fs.readFileSync(sessionFile, 'utf8').trim();
    
    if (!fileContent) {
      console.error(`❌ Session file ${sessionId} is empty`);
      return null;
    }
    
    let fileData;
    try {
      fileData = JSON.parse(fileContent);
    } catch (parseError) {
      console.error(`❌ JSON parse error for session ${sessionId}:`, parseError.message);
      console.error(`❌ File content: "${fileContent.substring(0, 100)}..."`);
      // Try to delete corrupted file
      try {
        fs.unlinkSync(sessionFile);
        console.log(`🧹 Deleted corrupted session file: ${sessionId}`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete corrupted file: ${deleteError.message}`);
      }
      return null;
    }
    
    // No expiration check - sessions only end when completed or failed
    console.log(`✅ Session ${sessionId} retrieved from file (no expiration)`);
    
    return fileData;
  } catch (error) {
    console.error(`❌ Failed to get session ${sessionId} from file:`, error);
    return null;
  }
}

// List active sessions from files
function listActiveSessionsFromFiles() {
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      return [];
    }
    
    const sessionFiles = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));
    const sessionIds = sessionFiles.map(f => f.replace('.json', ''));
    
    // Filter out expired sessions
    const activeSessions = [];
    for (const sessionId of sessionIds) {
      if (getSessionFromFile(sessionId)) {
        activeSessions.push(sessionId);
      }
    }
    
    return activeSessions;
  } catch (error) {
    console.error('❌ Failed to list sessions from files:', error);
    return [];
  }
}

function ensureSessionDirectory() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    console.log(`📁 Created session directory: ${SESSION_DIR}`);
  }
}

class PythonAutomationService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '..', 'automation', 'bank_scraper.py');
  }


  async performTransfer(transferData, bankConfig) {
    return new Promise((resolve, reject) => {
      console.log(`🐍 Starting Python automation for ${bankConfig.name}`);
      
      // Prepare data for Python script
      const inputData = {
        transferData,
        bankConfig
      };
      
      // Spawn Python process
      // const pythonProcess = spawn('python3', [this.pythonScriptPath, JSON.stringify(inputData)]); 
      const pythonProcess = spawn('/var/www/redpay/backend/venv/bin/python3', [this.pythonScriptPath, JSON.stringify(inputData)]);


      
      let outputData = '';
      let errorData = '';
      
      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`🐍 Python process exited with code ${code}`);
        
        if (code === 0) {
          try {
            // Parse the JSON output from Python script
            const result = JSON.parse(outputData.trim());
            console.log('✅ Python automation result:', {
              success: result.success,
              requiresOtp: result.requiresOtp,
              sessionId: result.sessionId,
              transactionId: result.transactionId,
              browserPid: result.browserPid,
              driverSessionId: result.driverSessionId,
              debuggerPort: result.debuggerPort,
              message: result.message
            });
            
            // Store session if OTP is required
            if (result.requiresOtp && result.sessionId) {
              activeSessions.set(result.sessionId, {
                bankConfig,
                transferData,
                timestamp: new Date(),
                process: pythonProcess
              });

              storeSessionToFile(result.sessionId, {
                bank_config: bankConfig,
                transfer_data: transferData,
                transaction_id: result.transactionId,
                status: 'submit_otp',
                browser_pid: result.browserPid,
                driver_session_id: result.driverSessionId,
                debugger_port: result.debuggerPort,
                current_url: result.currentUrl,
                otp_detected: result.otpDetected || false,
                timestamp: new Date().toISOString()
              });
              console.log(`🔐 Session ${result.sessionId} stored for OTP`);
            }
            resolve(result);
          } catch (parseError) {
            console.error('❌ Failed to parse Python output:', parseError);
            console.error('Raw output:', outputData);
            resolve({
              success: false,
              message: 'Failed to parse automation result',
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.error('❌ Python process failed with code:', code);
          console.error('Error output:', errorData);
          resolve({
            success: false,
            message: `Automation process failed: ${errorData || 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve({
          success: false,
          message: `Failed to start automation: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });
      
      // Set timeout for the process
      setTimeout(() => {
        // Only kill if not waiting for OTP
        if (!outputData.includes('"requiresOtp": true')) {
          pythonProcess.kill('SIGTERM');
          resolve({
            success: false,
            message: 'Automation timeout - process took too long',
            timestamp: new Date().toISOString()
          });
        }
      }, 600000); // 10 minute timeout for OTP scenarios
    });
  }

  async submitOtp(sessionId, otpCode) {
    return new Promise((resolve, reject) => {
      console.log(`🔐 Submitting OTP for session ${sessionId}`);

      const session = activeSessions.get(sessionId);
      if (!session || !session.process) {
        resolve({
          success: false,
          message: 'Session expired or not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Send OTP to the running Python process via stdin
    if (session.process && !session.process.killed) {
      // Send OTP to Python process
      session.process.stdin.write(otpCode + '\n');
      console.log('✅ OTP sent to Python process:', otpCode);
    }

      let outputData = '';
      let errorData = '';


      // pythonProcess.stdout.on('data', (data) => {
      //   outputData += data.toString();
      // });
      
      // // Collect stderr data
      // pythonProcess.stderr.on('data', (data) => {
      //   errorData += data.toString();
      //   console.error('Python stderr:', data.toString());
      // });

      // // Listen for output from Python process
    // session.process.stdout.on('data', (data) => {
    //   const chunk = data.toString();
    //   outputData += chunk;
    //   console.log('🐍 Python stdout:', chunk);

    //   try {
    //     const result = JSON.parse(outputData.trim());
    //     if (result.success || result.message) {
    //       resolve(result);
    //       activeSessions.delete(sessionId); // Clean up session
    //     }
    //   } catch (e) {
    //     // Not JSON yet, keep accumulating
    //   }
    // });

    console.log('Spawning new Python process for OTP submission'); 

    const {spawn} = require('child_process') 
                
    const jsonData = JSON.stringify({
      bankConfig: session.bankConfig,
      transferData: session.transferData,
      timestamp: new Date(),
    });

    // run with JSON as first argument
    const child = spawn('python3', ['automation/bank_scraper.py', jsonData, 'submit_otp', sessionId, otpCode]);


    child.stdout.on('data', (data) => {
      console.log(data.toString());
      outputData += data.toString();

    });

    child.stderr.on('data', (data) => {
      console.log(data.toString());
      errorData += data.toString();

    });


      // Handle Python process output
    child.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      console.log("🐍 Python says:", msg);

      try {
        // If Python sends JSON (recommended)
        const parsed = JSON.parse(msg);
        resolve({
          success: parsed.success,
          message: parsed.message || 'OTP verification result received',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        // If Python sends plain text
        resolve({
          success: true,
          message: msg,
          timestamp: new Date().toISOString()
        });
      }
    });


    // Handle process exit
    session.process.on('close', (code) => {
      console.log(`🔐 Python OTP process exited with code ${code}`);
      activeSessions.delete(sessionId);
      if (outputData) {
        try {
          const result = JSON.parse(outputData.trim());
          resolve(result);
        } catch (e) {
          resolve({
            success: false,
            message: 'Failed to parse OTP result',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        resolve({
          success: false,
          message: `OTP process exited with code ${code}`,
          timestamp: new Date().toISOString()
        });
      }
    });




    });
  }

  getActiveSession(sessionId) {
    return activeSessions.get(sessionId);
  }

  cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];
    
    activeSessions.forEach((session, sessionId) => {
      const sessionAge = now - session.timestamp;
      if (sessionAge > 300000) { // 5 minutes
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => {
      console.log(`🧹 Cleaning up expired session ${sessionId}`);
      activeSessions.delete(sessionId);
    });
  }
}

module.exports = { PythonAutomationService };
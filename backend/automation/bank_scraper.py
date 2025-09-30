#!/usr/bin/env python3
"""
Bank Transfer Automation Script using Selenium
For Banco Atlântico Demo - Proof of Concept Only
"""

import json
import os
import sys
import time
import logging
from datetime import datetime
from unittest import result 
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import uuid
import sys
import threading
import queue

from session_manager import session_manager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Global session storage for OTP waiting
active_sessions = {}

class BankTransferAutomation:
    def __init__(self, headless=False):
        self.driver = None
        self.headless = headless
        self.timeout = 160
        self.session_id = None
        self.otp_queue = queue.Queue()
        
    def setup_driver(self):
        """Initialize Chrome WebDriver with appropriate options"""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument('--headless')
        
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False) 
        
        # Enable remote debugging for session persistence
        chrome_options.add_argument('--remote-debugging-port=9222')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            # Get browser process ID
            self.browser_pid = self.driver.service.process.pid
            logger.info("Chrome WebDriver initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {e}")
            raise
    
    def reconnect_to_existing_session(self, session_data):
        """Try to reconnect to existing browser session"""
        try:
            browser_pid = session_data.get('browser_pid')
            current_url = session_data.get('current_url')
            
            if not browser_pid:
                logger.warning("No browser PID found in session data")
                return False
            
            # Check if browser process is still alive
            if not session_manager.is_browser_alive(browser_pid):
                logger.warning(f"Browser process {browser_pid} is no longer alive")
                return False
            
            logger.info(f"🔄 Attempting to reconnect to browser PID: {browser_pid}")
            
            # Try to find Chrome debugger port for this PID
            debugger_port = self.find_chrome_debugger_port(browser_pid)
            if not debugger_port:
                logger.warning("Could not find Chrome debugger port")
                return False
            
            # Connect to existing Chrome instance
            chrome_options = Options()
            chrome_options.add_experimental_option("debuggerAddress", f"127.0.0.1:{debugger_port}")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.browser_pid = browser_pid
            self.reconnected = True
            
            # Verify we're on the right page
            if current_url and current_url in self.driver.current_url:
                logger.info(f"✅ Successfully reconnected to existing browser session")
                logger.info(f"🌐 Current URL: {self.driver.current_url}")
                return True
            else:
                logger.warning(f"URL mismatch. Expected: {current_url}, Got: {self.driver.current_url}")
                # Try to navigate to the expected URL
                if current_url:
                    self.driver.get(current_url)
                    time.sleep(2)
                    logger.info(f"🔄 Navigated to expected URL: {current_url}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to reconnect to existing session: {e}")
            return False
    
    def find_chrome_debugger_port(self, browser_pid):
        """Find Chrome debugger port for given PID"""
        try:
            # Common Chrome debugger ports
            common_ports = [9222, 9223, 9224, 9225, 9226]
            
            for port in common_ports:
                try:
                    response = requests.get(f"http://127.0.0.1:{port}/json", timeout=1)
                    if response.status_code == 200:
                        logger.info(f"✅ Found Chrome debugger on port {port}")
                        return port
                except:
                    continue
            
            # If common ports don't work, try to extract from process
            
            try:
                process = psutil.Process(browser_pid)
                cmdline = ' '.join(process.cmdline())
                if '--remote-debugging-port=' in cmdline:
                    port_start = cmdline.find('--remote-debugging-port=') + len('--remote-debugging-port=')
                    port_end = cmdline.find(' ', port_start)
                    if port_end == -1:
                        port_end = len(cmdline)
                    port = int(cmdline[port_start:port_end])
                    logger.info(f"✅ Extracted debugger port from process: {port}")
                    return port
            except Exception as e:
                logger.warning(f"Could not extract port from process: {e}")
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding debugger port: {e}")
            return None
    
    def perform_transfer(self, transfer_data, bank_config):
        """Main method to perform bank transfer automation"""
        try:
            logger.info(f"Starting transfer automation for {bank_config['name']}")
            
            # Setup driver
            self.setup_driver()
            
            # Step 1: Navigate to bank login page
            self.navigate_to_login(bank_config['loginUrl'])
            
            # Step 2: Perform login
            self.login(transfer_data['username'], transfer_data['password'], bank_config)
            
            # Step 3: Navigate to transfer section
            self.navigate_to_transfers(bank_config)
            
            # Step 4: Fill transfer form
            self.fill_transfer_form(transfer_data, bank_config)
            
            # Step 5: Confirm transfer
            confirmation_result = self.confirm_transfer(bank_config)
            
            # Handle OTP requirement
            if confirmation_result == 'OTP_REQUIRED':
                if 'otpCode' in transfer_data and transfer_data['otpCode']:
                    # This is a continuation with OTP code
                    logger.info("🔐 Continuing with provided OTP code")
                    self.submit_otp(transfer_data['otpCode'], bank_config)
                    success = self.verify_transfer_success(bank_config)
                    status = success.get("status", False)
                    message = success.get("message", "")
                    logger.info(f"Transfer success status: {success}")
                    logger.info(f"Transfer success status: {status}, message: {message}")

                    if status:
                        transaction_id = self.generate_transaction_id()
                        return {
                            'success': True,
                            'transactionId': transaction_id,
                            'message': 'Transferência realizada com sucesso',
                            'timestamp': datetime.now().isoformat(),
                            'details': {
                                'amount': transfer_data['amount'],
                                'receiverIban': transfer_data['receiverIban'],
                                'fee': self.calculate_fee(transfer_data['amount'])
                            }
                        }
                    else:
                        raise Exception(message if message else "Transfer verification failed after OTP")
                else:
                    # OTP required - keep session alive and wait
                    self.session_id = self.generate_session_id()
                    
                    # Store session with browser information
                    transaction_id = self.generate_transaction_id()
                    session_data_info = {
                        "bank_config": bank_config,
                        "transfer_data": transfer_data,
                        "transaction_id": transaction_id,
                        'status': 'waiting_otp',
                        'browser_pid': self.browser_pid if self.browser_pid else None,
                        'driver_session_id': self.driver.session_id if self.driver else None,
                        'current_url': self.driver.current_url if self.driver else None,
                        'otp_detected': True
                    }
                    
                    # Store session with proper data types
                    if session_manager.store_session(self.session_id, session_data_info):
                        logger.info(f"✅ Session {self.session_id} stored successfully")
                    else:
                        logger.error(f"❌ Failed to store session {self.session_id}")
                    
                    logger.info(f"🔐 OTP required - session {self.session_id} kept alive")
                    logger.info(f"🌐 Browser PID: {self.browser_pid}")
                    logger.info(f"🌐 Current URL: {self.driver.current_url}")
                    logger.info(f"📊 Active sessions: {session_manager.list_active_sessions()}")
                    
                    # Start OTP monitoring thread to keep process alive
                    logger.info(f"🔄 Starting OTP monitor thread...")
                    self.start_otp_monitor_thread()
                    
                    return {
                        'success': False,
                        'requiresOtp': True,
                        'sessionId': self.session_id,
                        'browserPid': self.browser_pid,
                        'currentUrl': self.driver.current_url if self.driver else None,
                        'otpMessage': 'Código de verificação necessário. Verifique o seu telemóvel.',
                        'message': 'Verificação OTP necessária',
                        'timestamp': datetime.now().isoformat()
                    }
            else:
                # Step 6: Verify success
                success = self.verify_transfer_success(bank_config)
                status = success.get("status", False)
                message = success.get("message", "")

            if status:
                transaction_id = self.generate_transaction_id()
                return {
                    'success': True,
                    'transactionId': transaction_id,
                    'message': 'Transferência realizada com sucesso',
                    'timestamp': datetime.now().isoformat(),
                    'details': {
                        'amount': transfer_data['amount'],
                        'receiverIban': transfer_data['receiverIban'],
                        'fee': self.calculate_fee(transfer_data['amount'])
                    }
                }
            else:
                raise Exception(message if message else "Transfer verification failed")
                
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            self.take_screenshot_on_error()
            # Clean up session if it exists
            if self.session_id:
                session_manager.delete_session(self.session_id)
            return {
                'success': False,
                'message': f'Erro na transferência',
                'timestamp': datetime.now().isoformat()
            }
        finally:
            # Don't cleanup browser if OTP is required - keep it alive
            if not (hasattr(self, 'session_id') and self.session_id):
                self.cleanup()
    

    
    def continue_with_existing_session(self, session_id, otp_code):
        """Continue with existing browser session for OTP"""
        
        session_data = session_manager.get_session(session_id)
        if not session_data:
            logger.error(f"❌ Session {session_id} not found")
            return {
                'success': False,
                'message': 'Session not found',
                'timestamp': datetime.now().isoformat()
            }
        
        bank_config = session_data['bank_config']
        browser_pid = session_data.get('browser_pid')

        logger.info(f"Continuing with existing browser session PID: {browser_pid}")
        logger.info(f"Continuing with existing session ID: {session_id}") 
        
        # Check if browser is still alive
        if not session_manager.is_browser_alive(browser_pid):
            logger.error(f"❌ Browser process {browser_pid} is no longer alive")
            session_manager.update_session(session_id, {'status': 'failed'})
            return {
                'success': False,
                'message': 'Browser session expired',
                'timestamp': datetime.now().isoformat()
            }
        
        logger.info(f"🔐 Processing OTP for session {session_id}")
        try:
            
            logger.info(f"🌐 Using existing browser PID: {browser_pid}")
            
            # Try to reconnect to existing browser session
            if not self.reconnect_to_existing_session(session_data):
                logger.warning("Could not reconnect to existing session, creating new browser")
                # Fallback: create new session and re-authenticate
                self.setup_driver()
                self.navigate_to_login(bank_config['loginUrl'])
                self.login(session_data['transfer_data']['username'], 
                               session_data['transfer_data']['password'], bank_config)
                self.navigate_to_transfers(bank_config)
                self.fill_transfer_form(session_data['transfer_data'], bank_config)
                self.confirm_transfer(bank_config)
            
            # Update session status
            session_manager.update_session(session_id, {'status': 'processing_otp'})
            
            # The browser should already be on the OTP page
            # Just submit the OTP code
            self.submit_otp(otp_code, bank_config)
            success = self.verify_transfer_success(bank_config)
            status = success.get("status", False)
            message = success.get("message", "")

            if status:
                transaction_id = self.generate_transaction_id()
                logger.info(f"✅ Transfer completed successfully for session {session_id}")
                session_manager.update_session(session_id, {'status': 'completed'})
                return {
                    'success': True,
                    'transactionId': transaction_id,
                    'message': 'Transferência realizada com sucesso',
                    'timestamp': datetime.now().isoformat(),
                    'details': {
                        'amount': session_data['transfer_data']['amount'],
                        'receiverIban': session_data['transfer_data']['receiverIban'],
                        'fee': self.calculate_fee(session_data['transfer_data']['amount'])
                    }
                }
            else:
                logger.error(f"❌ Transfer failed after OTP for session {session_id}")
                session_manager.update_session(session_id, {'status': 'failed'})
                return {
                    'success': False,
                    'message': message if message else "Transfer verification failed after OTP",
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ OTP processing failed for session {session_id}: {e}")
            session_manager.update_session(session_id, {'status': 'failed'})
            return {
                'success': False,
                'message': f'Erro na verificação OTP: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
        finally:
            # Clean up browser when session ends
            try:
                if self.driver:
                    self.driver.quit()
                    logger.info("✅ Browser cleaned up by OTP continuation")
            except Exception as e:
                logger.error(f"❌ Error cleaning up browser: {e}")

    def find_chrome_debugger_port(self, browser_pid):
        """Find Chrome debugger port for given PID"""
        try:
            # Common Chrome debugger ports
            common_ports = [9222, 9223, 9224, 9225, 9226]
            
            for port in common_ports:
                try:
                    response = requests.get(f"http://127.0.0.1:{port}/json", timeout=1)
                    if response.status_code == 200:
                        logger.info(f"✅ Found Chrome debugger on port {port}")
                        return port
                except:
                    continue
            
            # If common ports don't work, try to extract from process
            
            try:
                process = psutil.Process(browser_pid)
                cmdline = ' '.join(process.cmdline())
                if '--remote-debugging-port=' in cmdline:
                    port_start = cmdline.find('--remote-debugging-port=') + len('--remote-debugging-port=')
                    port_end = cmdline.find(' ', port_start)
                    if port_end == -1:
                        port_end = len(cmdline)
                    port = int(cmdline[port_start:port_end])
                    logger.info(f"✅ Extracted debugger port from process: {port}")
                    return port
            except Exception as e:
                logger.warning(f"Could not extract port from process: {e}")
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding debugger port: {e}")
            return None
        

    def perform_transfer(self, transfer_data, bank_config):
        """Main method to perform bank transfer automation"""
        try:
            logger.info(f"Starting transfer automation for {bank_config['name']}")
            
            # Setup driver
            self.setup_driver()
            
            # Step 1: Navigate to bank login page
            self.navigate_to_login(bank_config['loginUrl'])
            
            # Step 2: Perform login
            self.login(transfer_data['username'], transfer_data['password'], bank_config)
            
            # Step 3: Navigate to transfer section
            self.navigate_to_transfers(bank_config)
            
            # Step 4: Fill transfer form
            self.fill_transfer_form(transfer_data, bank_config)
            
            # Step 5: Confirm transfer
            confirmation_result = self.confirm_transfer(bank_config)
            
            # Handle OTP requirement
            if confirmation_result == 'OTP_REQUIRED':
                if 'otpCode' in transfer_data and transfer_data['otpCode']:
                    # This is a continuation with OTP code
                    logger.info("🔐 Continuing with provided OTP code")
                    self.submit_otp(transfer_data['otpCode'], bank_config)
                    success = self.verify_transfer_success(bank_config)
                    status = success.get("status", False)
                    message = success.get("message", "")

                    if status:
                        transaction_id = self.generate_transaction_id()
                        return {
                            'success': True,
                            'transactionId': transaction_id,
                            'message': 'Transferência realizada com sucesso',
                            'timestamp': datetime.now().isoformat(),
                            'details': {
                                'amount': transfer_data['amount'],
                                'receiverIban': transfer_data['receiverIban'],
                                'fee': self.calculate_fee(transfer_data['amount'])
                            }
                        }
                    else:
                        raise Exception(message if message else "Transfer verification failed after OTP")
                else:
                    # OTP required - keep session alive and wait
                    self.session_id = self.generate_session_id()
                    active_sessions[self.session_id] = {
                        'driver': self.driver,
                        'bank_config': bank_config,
                        'transfer_data': transfer_data,
                        'timestamp': datetime.now(),
                        'automation_instance': self
                    }
                    
                    logger.info(f"🔐 OTP required - session {self.session_id} kept alive")
                    
                    # Start session monitor thread
                    monitor_thread = threading.Thread(
                        target=self.monitor_session,
                        args=(self.session_id,),
                        daemon=True
                    ) 

                    monitor_thread.start()
                    
                    return {
                        'success': False,
                        'requiresOtp': True,
                        'sessionId': self.session_id,
                        'browserPid': self.driver.service.process.pid,
                        'driverSessionId': self.driver.session_id,
                        'currentUrl': self.driver.current_url,
                        'otpMessage': 'Código de verificação necessário. Verifique o seu telemóvel.',
                        'message': 'Verificação OTP necessária',
                        'timestamp': datetime.now().isoformat()
                    }
            else:
                # Step 6: Verify success
                success = self.verify_transfer_success(bank_config)
                status = success.get("status", False) 

            if status:
                transaction_id = self.generate_transaction_id()
                return {
                    'success': True,
                    'transactionId': transaction_id,
                    'message': 'Transferência realizada com sucesso',
                    'timestamp': datetime.now().isoformat(),
                    'details': {
                        'amount': transfer_data['amount'],
                        'receiverIban': transfer_data['receiverIban'],
                        'fee': self.calculate_fee(transfer_data['amount'])
                    }
                }
            else:
                raise Exception("Transfer verification failed")
                
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            self.take_screenshot_on_error()
            # Clean up session if it exists
            if self.session_id and self.session_id in active_sessions:
                del active_sessions[self.session_id]
            return {
                'success': False,
                'message': f'Erro na transferência',
                'timestamp': datetime.now().isoformat()
            }
        # Don't cleanup if OTP is required - session needs to stay alive
        # finally:
        #     self.cleanup()
    
    def monitor_session(self, session_id):
        """Monitor session and cleanup after timeout"""
        logger.info(f"🕐 Starting session monitor for {session_id}")
        
        # Wait for 5 minutes (300 seconds) - same as frontend countdown
        timeout = 300
        start_time = datetime.now()
        
        while (datetime.now() - start_time).seconds < timeout:
            if session_id not in active_sessions:
                logger.info(f"🔚 Session {session_id} completed or removed")
                return

            logger.info(f"🔚 OTP QUEUE: {self.otp_queue}")
            # Check if OTP was submitted
            try:
                logger.info(f"Waiting for OTP in queue for session {session_id}...")
                otp_code = self.otp_queue.get(timeout=1)
                if otp_code:
                    logger.info(f"🔐 OTP received for session {session_id}")
                    # Process OTP in the existing session
                    self.process_otp_in_session(session_id, otp_code)
                    return
            except queue.Empty:
                continue
        
        # Timeout reached - cleanup session
        logger.warning(f"⏰ Session {session_id} timed out")
        self.cleanup_session(session_id)
    
    def process_otp_in_session(self, session_id, otp_code):
        """Process OTP code in existing session"""
        if session_id not in active_sessions:
            logger.error(f"❌ Session {session_id} not found")
            return
        
        session = active_sessions[session_id]
        bank_config = session['bank_config']
        
        try:
            logger.info(f"🔐 Processing OTP for session {session_id}")
            self.submit_otp(otp_code, bank_config)
            success = self.verify_transfer_success(bank_config)
            status = success.get("status", False) 
            
            if status:
                logger.info(f"✅ Transfer completed successfully for session {session_id}")
            else:
                logger.error(f"❌ Transfer failed after OTP for session {session_id}")
                
        except Exception as e:
            logger.error(f"❌ OTP processing failed for session {session_id}: {e}")
        finally:
            self.cleanup_session(session_id)
    
    def cleanup_session(self, session_id):
        """Clean up a specific session"""
        if session_id in active_sessions:
            session = active_sessions[session_id]
            try:
                if session['driver']:
                    session['driver'].quit()
                    logger.info(f"🧹 Browser session {session_id} cleaned up")
            except Exception as e:
                logger.error(f"Error cleaning up session {session_id}: {e}")
            finally:
                del active_sessions[session_id]
    
    def navigate_to_login(self, login_url):
        """Navigate to bank login page"""
        logger.info(f"Navigating to: {login_url}")
        self.driver.get(login_url)
        time.sleep(3)  # Wait for page to load
        
    def login(self, username, password, bank_config):
        """Perform login using provided credentials"""
        logger.info("Performing login...")
        
        try:
            # Wait for username field and enter credentials
            username_field = WebDriverWait(self.driver, self.timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, bank_config['selectors']['usernameField']))
            )
            username_field.clear()
            username_field.send_keys(username)
            time.sleep(1)
            
            # Enter password
            password_field = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['passwordField'])
            password_field.clear()
            password_field.send_keys(password)
            time.sleep(1)
            
            # Click login button
            login_button = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['loginButton'])
            login_button.click()

            # Handle special case for Banco BAI SSD confirmation
            if bank_config['id'] == 'bai':
                ssd_confirm_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, bank_config['selectors']['ssdConfirmation'])) 
                )
                ssd_confirm_button.click()
                time.sleep(3)

                ack_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, bank_config['selectors']['ssdAcknowledgmentBtn']))
                )
                ack_button.click()
                time.sleep(3) 
                logger.warning(f"SSD acknowledgment step skipped or failed: {e}")
                logger.info("Login completed")
            
        except TimeoutException:
            raise Exception("Login form elements not found - page may have changed")
        except Exception as e:
            raise Exception(f"Login failed: {str(e)}")
    
    def navigate_to_transfers(self, bank_config):
        """Navigate to transfer section"""
        logger.info("Navigating to transfers section...")
        
        try:
            if bank_config['id'] == 'bfa':
                transfer_menu = bank_config['selectors']['transferMenu']
                self.driver.get(transfer_menu)
            else:
                transfer_menu = WebDriverWait(self.driver, self.timeout).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, bank_config['selectors']['transferMenu']))
                ) 
                transfer_menu.click()
            time.sleep(3)
            logger.info("Transfer section accessed")
            
        except TimeoutException:
            raise Exception("Transfer menu not found - user may not be logged in")
    
    def fill_transfer_form(self, transfer_data, bank_config):
        """Fill the transfer form with provided data"""
        logger.info("Filling transfer form...")
        
        try:
            # Handle special case for Banco Atlântico IBAN tab
            if bank_config['id'] == 'banco-atlantico' and 'clickIbanTabOpen' in bank_config['selectors']:
                try:
                    iban_tab = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['clickIbanTabOpen'])
                    iban_tab.click()
                    time.sleep(1)
                except:
                    logger.info("IBAN tab not found or already selected")
            
            # Enter recipient IBAN
            iban_field = WebDriverWait(self.driver, self.timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, bank_config['selectors']['ibanField']))
            )
            iban_field.clear()
            iban_field.send_keys(transfer_data['receiverIban'])
            time.sleep(1)
            
            # Enter amount
            amount_field = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['amountField'])
            amount_field.clear()
            amount_field.send_keys(str(transfer_data['amount']))
            time.sleep(1)

            if 'selectBox' in bank_config['selectors'] and 'selectOption' in bank_config['selectors']:
                try:
                    select_box = WebDriverWait(self.driver, self.timeout).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, bank_config['selectors']['selectBox']))
                    )
                    select_box.click()
                    select_option = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['selectOption'])
                    select_option.click()
                except:
                    logger.info("Select box or option not found, skipping...")
            
            # Enter description if field exists
            if 'descriptionField' in bank_config['selectors'] and transfer_data.get('description'):
                try:
                    desc_field = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['descriptionField'])
                    desc_field.clear()
                    desc_field.send_keys(transfer_data['description'])
                except:
                    logger.info("Description field not found, skipping...")
            
            # Enter beneficiary name if field exists
            if 'beneficiaryNameField' in bank_config['selectors']:
                try:
                    beneficiary_field = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['beneficiaryNameField'])
                    beneficiary_field.clear()
                    beneficiary_field.send_keys(transfer_data.get('beneficiaryName', 'ReD-Market-On'))
                except:
                    logger.info("Beneficiary name field not found, skipping...")
            
            logger.info("Transfer form filled successfully")
            
        except TimeoutException:
            raise Exception("Transfer form fields not found")
        except Exception as e:
            raise Exception(f"Failed to fill transfer form: {str(e)}")
    
    def confirm_transfer(self, bank_config):
        """Confirm the transfer"""
        logger.info("Confirming transfer...")
        
        try:
            confirm_button = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['confirmButton'])
            confirm_button.click()
            time.sleep(3)
            
            # Check for OTP requirement after clicking confirm
            otp_detected = self.detect_otp_requirement(bank_config)
            if otp_detected:
                logger.info("🔐 OTP field detected - waiting for user input")
                return 'OTP_REQUIRED'
            
            # Final confirmation if there's another confirmation button
            if 'confirmationBtn' in bank_config['selectors']:
                try:
                    final_confirm = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['confirmationBtn'])
                    final_confirm.click()
                    time.sleep(3)
                except:
                    logger.info("Final confirmation button not found")
            
            logger.info("Transfer confirmation completed")
            return 'SUCCESS'
            
        except Exception as e:
            raise Exception(f"Failed to confirm transfer: {str(e)}")
    
    def detect_otp_requirement(self, bank_config):
        """Detect if OTP is required by checking for OTP input fields"""
        logger.info("🔍 Checking for OTP requirement...")

        if bank_config['id'] == 'banco-atlantico' and 'confirmTransaction' in bank_config['selectors']:
            try:
                validation_button = self.driver.find_element(By.CSS_SELECTOR, bank_config['selectors']['confirmTransaction'])
                validation_button.click()
                time.sleep(2)
            except:
                logger.info("Confirm transaction button not found or already clicked")
        
        # Bank-specific OTP selectors first
        bank_otp_selectors = []
        if 'otpInputField' in bank_config['selectors']:
            bank_otp_selectors.append(bank_config['selectors']['otpInputField'])
        
        # Generic OTP selectors
        generic_otp_selectors = [
            'input[type="text"][placeholder*="código"]',
            'input[type="text"][placeholder*="OTP"]',
            'input[type="text"][placeholder*="SMS"]',
            'input[type="password"][placeholder*="código"]',
            'input[name*="otp"]',
            'input[id*="otp"]',
            'input[id*="sms"]',
            'input[id*="token"]',
            'input[class*="otp"]',
            'input[class*="sms"]',
            'input[class*="token"]',
            # Common Portuguese/Spanish OTP field patterns
            'input[placeholder*="verificação"]',
            'input[placeholder*="verificacion"]',
            'input[placeholder*="autenticação"]',
            'input[placeholder*="autenticacion"]',
            'input[name*="codigo"]',
            'input[name*="verification"]',
            'input[id*="verification"]'
        ]
        
        all_selectors = bank_otp_selectors + generic_otp_selectors
        
        for selector in all_selectors:
            try:
                otp_field = WebDriverWait(self.driver, 8).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                logger.info(f"✅ OTP field found with selector: {selector}")
                # Store the working selector for later use
                self.detected_otp_selector = selector
                return True
            except TimeoutException:
                continue
        
        # Check for OTP-related text on the page
        try:
            otp_text_patterns = [
                "código de verificação",
                "código SMS",
                "token",
                "OTP",
                "verificação",
                "autenticação",
                "código enviado",
                "verification code",
                "SMS code"
            ]
            
            page_text = self.driver.page_source.lower()
            for pattern in otp_text_patterns:
                if pattern.lower() in page_text:
                    logger.info(f"✅ OTP requirement detected by text pattern: {pattern}")
                    return True
                    
        except Exception as e:
            logger.warning(f"Could not check page text for OTP patterns: {e}")
        
        logger.info("❌ No OTP requirement detected")
        return False

    def submit_otp(self, otp_code, bank_config):
        """Submit OTP code for verification"""
        logger.info(f"🔐 Submitting OTP code: {otp_code}") 

        try:
            # OTP input field selectors
            otp_selectors = []
            if 'otpInputField' in bank_config['selectors']:
                otp_selectors.append(bank_config['selectors']['otpInputField'])

            # Generic OTP selectors
            otp_selectors.extend([
                'input[type="text"][placeholder*="código"]',
                'input[type="text"][placeholder*="OTP"]',
                'input[type="text"][placeholder*="SMS"]',
                'input[type="password"][placeholder*="código"]',
                'input[name*="otp"]',
                'input[id*="otp"]',
                'input[id*="sms"]',
                'input[id*="token"]',
                'input[class*="otp"]',
                'input[class*="sms"]',
                'input[class*="token"]',
                'input[placeholder*="verificação"]',
                'input[name*="codigo"]',
                'input[name*="verification"]'
            ])

            otp_field = find_first_selector(self.driver, otp_selectors, "OTP field")
            if not otp_field:
                raise Exception("OTP input field not found")

            # Enter OTP
            otp_field.clear()
            otp_field.send_keys(otp_code)
            time.sleep(1)

            # Validation button selectors
            validation_selectors = []
            if 'otpValidationButton' in bank_config['selectors']:
                validation_selectors.append(bank_config['selectors']['otpValidationButton'])

            validation_selectors.extend([
                'button[type="submit"]',
                'input[type="submit"]',
                'button[value*="Validar"]',
                'button[value*="Confirmar"]',
                'button[value*="Verificar"]',
                'input[value*="Validar"]',
                'input[value*="Confirmar"]',
                'input[value*="Verificar"]',
                '.btn-confirm',
                '.btn-validate',
                '.btn-submit',
                '#btnValidate',
                '#btnConfirm',
                '#btnSubmit'
            ])

            validation_button = find_first_selector(self.driver, validation_selectors, "OTP validation button")

            if validation_button:
                validation_button.click()
                logger.info("✅ OTP submitted successfully")
            else:
                logger.warning("⚠️ OTP validation button not found, pressing Enter instead")
                otp_field.send_keys('\n')

            time.sleep(3)

        except Exception as e:
            raise Exception(f"Failed to submit OTP: {str(e)}")

    
    def verify_transfer_success(self, bank_config):
        """Verify if transfer was successful"""
        logger.info("Verifying transfer success...")
        
        try:
            #look for any other verification step
            if 'additionalVerification' in bank_config['selectors']:
                try:
                    additional_verification = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, bank_config['selectors']['additionalVerification']))
                    )

                    otpValidationButton = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, bank_config['selectors']['otpValidationButton']))
                    )
                    if additional_verification and otpValidationButton and bank_config['id'] == 'bfa':
                        logger.info("Additional verification step detected, Handling...")
                        # Find all label elements inside it
                        labels = additional_verification.find_elements(By.TAG_NAME, "label")  # adjust if labels are spans/divs

                        # Find all input elements inside it
                        inputs = additional_verification.find_elements(By.TAG_NAME, "input")  # usually inputs are type="text" or number

                        # Loop over each label/input pair
                        for label, input_field in zip(labels, inputs):
                            value = label.text.strip()  # get the number from the label
                            input_field.clear()
                            input_field.send_keys(value)
                            time.sleep(1)

                        otpValidationButton.click()
                        time.sleep(3)    

                    elif additional_verification and bank_config['id'] == 'banco-atlantico':
                        logger.info("Additional verification step detected for Banco Atlantico, Handling...")
                        # Find the input field inside it
                        additional_verification.click()
                except TimeoutException:
                    logger.info("No additional verification step detected, proceeding to check success message.")

            # Look for success message
            success_element = WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, bank_config['selectors']['successMessage']))
            )
            classes = success_element.get_attribute("class") 
            text_feedback = success_element.text.capitalize()

            if "success" in classes.lower():
                return {"status": True, "message": f"{text_feedback}"}
            elif "danger" in classes.lower():
                return {"status": False, "message": f"{text_feedback}"}
            else:
                return {"status": False, "message": f"No clear success/danger class found: {classes}"}

        except TimeoutException:
            logger.error("Success message not found within timeout")
            return {"status": False, "message": "Success message not found within timeout"}

    def generate_transaction_id(self):
        """Generate a unique transaction ID"""
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"TXN{timestamp}{unique_id}"
    
    def calculate_fee(self, amount):
        """Calculate transfer fee based on amount"""
        fee_percentage = 0.005  # 0.5%
        calculated_fee = amount * fee_percentage
        minimum_fee = 500  # 500 AOA minimum
        maximum_fee = 5000  # 5000 AOA maximum
        
        return min(max(calculated_fee, minimum_fee), maximum_fee)
    
    def take_screenshot_on_error(self):
        """Take screenshot for debugging purposes"""
        if self.driver:
            try:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_dir = os.path.join(os.getcwd(), "screenshots")
                if not os.path.exists(screenshot_dir):
                    os.makedirs(screenshot_dir)
                screenshot_path = os.path.join(screenshot_dir, f"error_screenshot_{timestamp}.png")
                self.driver.save_screenshot(screenshot_path)
                logger.info(f"Screenshot saved: {screenshot_path}")
            except Exception as e:
                logger.error(f"Failed to take screenshot: {e}")
    
    def generate_session_id(self):
        """Generate a unique session ID"""
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"SES{timestamp}{unique_id}"
    
    def cleanup(self):
        """Clean up resources"""
        if self.driver:
            try:
                self.driver.quit()
                logger.info("WebDriver cleaned up")
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")

def submit_otp_to_session(session_id, otp_code):
    """Submit OTP code to an active session"""
    logger.info(f"🔍 Looking for session {session_id}")
    active_session_ids = session_manager.list_active_sessions()
    logger.info(f"📊 Available sessions: {active_session_ids}")
    
    session_data = session_manager.get_session(session_id)
    if not session_data:
        logger.error(f"❌ Session {session_id} not found")
        logger.error(f"❌ Available sessions: {active_session_ids}")
        return {
            'success': False,
            'message': 'Session not found',
            'timestamp': datetime.now().isoformat()
        }
    
    # Check if this is a continuing session with existing browser
    browser_pid = session_data.get('browser_pid')
    session_id = session_data.get('session_id') 
    logger.info(f"Outside Continuing with existing browser session PID: {browser_pid}")
    logger.info(f"Outside Continuing with existing session ID: {session_id}") 
    if session_manager.is_browser_alive(browser_pid):
        logger.info(f"🔄 Inside Continuing with existing browser session")
        try:
            # Attach to existing Chrome session
            options = Options()
            options.debugger_address = "127.0.0.1:5173"  # Must match the running Chrome | this will fail to trigger the right port and will work 
            driver = webdriver.Chrome(options=options)
            # Navigate to the current URL where OTP is waiting
            current_url = session_data.get('current_url')
            if current_url:
                logger.info(f"🔄 Reconnecting to existing session URL: {current_url}")
                driver.get(current_url)
                logger.info(f"🌐 Attached to existing browser session: {driver}")
                time.sleep(1)

            # Use your BankTransferAutomation wrapper with the attached driver
            automation = BankTransferAutomation(headless=False)
            automation.setup_driver()  # inject the existing driver
            logger.error(f"On IF about to run continue_with_existing_session: {e}")
            return automation.continue_with_existing_session(session_id, otp_code)

        except Exception as e:
            logger.error(f"On Exception to reconnect to existing session: {e}")
            # Optionally, fall back to creating a new session
            automation = BankTransferAutomation(headless=False)
            automation.setup_driver()
            return automation.continue_with_existing_session(session_id, otp_code)

def find_first_selector(driver, selectors, description="element"):
    """Try a list of selectors and return the first matching element."""
    for selector in selectors:
        try:
            return driver.find_element(By.CSS_SELECTOR, selector)
        except:
            continue
    return None  

def main():
    """Main function to handle command line execution"""
    if len(sys.argv) < 2:
        print("Usage: python bank_scraper.py '<json_data>' [otp_mode] [session_id] [otp_code]", flush=True)
        sys.exit(1)
    
    try:
        # Check if this is an OTP submission 
        if len(sys.argv) >= 4 and sys.argv[2] == 'submit_otp':
            session_id = sys.argv[3]
            otp_code = sys.argv[4] if len(sys.argv) > 4 else ''  
            logger.info(f"Active session id: {session_id}")
            logger.info(f"Active OTP code: {otp_code}") 
            result = submit_otp_to_session(session_id, otp_code)
            print(json.dumps(result), flush=True)
        else:
            # Regular transfer initiation
            input_data = json.loads(sys.argv[1])
            transfer_data = input_data['transferData']
            bank_config = input_data['bankConfig']
            
            # Initialize automation
            automation = BankTransferAutomation(headless=False)
            
            # Perform transfer
            result = automation.perform_transfer(transfer_data, bank_config)
            
            # Output result as JSON
            print(json.dumps(result), flush=True)

    except json.JSONDecodeError:
        error_result = {
            'success': False,
            'message': 'Invalid JSON input data',
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result), flush=True)
        sys.exit(1)
    except Exception as e:
        error_result = {
            'success': False,
            'message': f'Automation error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Session Manager for Bank Transfer Automation
Handles persistent sessions across multiple Python processes
"""

import json
import os
import time
import threading
from datetime import datetime, timedelta
import pickle
import tempfile
import logging
import subprocess
import psutil

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self):
        self.session_dir = os.path.join(os.path.dirname(__file__), 'bank_sessions')
        self.ensure_session_directory()
        
    def ensure_session_directory(self):
        """Ensure session directory exists"""
        logger.error(f"#################==============#####################")
        logger.error(f"# Global session manager instance STARTED")
        if not os.path.exists(self.session_dir):
            os.makedirs(self.session_dir)
            logger.info(f"Created session directory: {self.session_dir}")
    
    def store_session(self, session_id, session_data):
        """Store session data to file"""
        try:
            session_file = os.path.join(self.session_dir, f"{session_id}.json")
            temp_file = f"{session_file}.tmp"  
            
            # Prepare session data for storage
            storage_data = {
                'session_id': session_id,
                'bank_config': session_data['bank_config'],
                'transfer_data': session_data['transfer_data'],
                'timestamp': datetime.now(),
                'status': session_data.get('status', 'waiting_otp'),
                'driver_session_id': session_data.get('driver_session_id'),
                'automation_instance': session_data.get('automation_instance'),
                'browser_pid': session_data.get('browser_pid'), 
                'current_url': session_data.get('current_url'),
                'otp_detected': session_data.get('otp_detected', False)
            }
            
            # Convert datetime objects to ISO strings for JSON serialization
            if isinstance(storage_data['timestamp'], datetime):
                storage_data['timestamp'] = storage_data['timestamp'].isoformat()
            
            # Write to temporary file first, then rename to prevent corruption
            with open(temp_file, 'w') as f:
                json.dump(storage_data, f, indent=2, default=str)
            
            # Atomic rename to prevent corruption
            os.rename(temp_file, session_file)
            
            logger.info(f"Session Data Before storing: {session_data}")
            logger.info(f"✅ Session {session_id} stored to file")
            logger.info(f"📊 Session data: {storage_data}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store session {session_id}: {e}")
            # Clean up temp file if it exists
            temp_file = os.path.join(self.session_dir, f"{session_id}.json.tmp")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
            return False
    
    def get_session(self, session_id):
        """Retrieve session data from file"""
        try:
            session_file = os.path.join(self.session_dir, f"{session_id}.json")

            if not os.path.exists(session_file):
                logger.error(f"❌ Session file not found: {session_file}")
                available_files = os.listdir(self.session_dir) if os.path.exists(self.session_dir) else []
                logger.error(f"❌ Available files: {available_files}")
                return None

            # Read and validate file content
            with open(session_file, 'r') as f:
                file_content = f.read().strip()
            
            if not file_content:
                logger.error(f"❌ Session file {session_id} is empty")
                os.remove(session_file)
                return None
            
            try:
                session_data = json.loads(file_content)
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON decode error for session {session_id}: {e}")
                logger.error(f"❌ File content: {file_content[:100]}...")
                # Delete corrupted file
                os.remove(session_file)
                return None

            # No expiration check - sessions only end when completed or failed
            logger.info(f"✅ Session {session_id} retrieved from file (no expiration)")

            return session_data

        except Exception as e:
            logger.error(f"❌ Failed to retrieve session {session_id}: {e}")
            return None
    
    def update_session_status(self, session_id, status):
        """Update session status"""
        session_data = self.get_session(session_id)
        if session_data:
            session_data['status'] = status
            session_data['timestamp'] = datetime.now()
            return self.store_session(session_id, session_data)
        return False
    
    def delete_session(self, session_id):
        """Delete session file"""
        try:
            session_file = os.path.join(self.session_dir, f"{session_id}.json")
            if os.path.exists(session_file):
                os.remove(session_file)
                logger.info(f"🧹 Session {session_id} deleted")
            
            # Also try to delete any .pkl files (legacy cleanup)
            pkl_file = os.path.join(self.session_dir, f"{session_id}.pkl")
            if os.path.exists(pkl_file):
                os.remove(pkl_file)
                logger.info(f"🧹 Legacy session file {session_id}.pkl deleted")
                
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete session {session_id}: {e}")
            return False
    
    def list_active_sessions(self):
        """List all active session IDs"""
        try:
            if not os.path.exists(self.session_dir):
                return []
                
            all_files = os.listdir(self.session_dir)
            session_files = [f for f in all_files if f.endswith('.json')]
            session_ids = [f.replace('.json', '') for f in session_files]
            
            logger.info(f"📁 Found session files: {session_files}")
            logger.info(f"📋 Session IDs: {session_ids}")
            
            # Filter out expired sessions
            active_sessions = []
            for session_id in session_ids:
                if self.get_session(session_id):  # This will auto-delete expired ones
                    active_sessions.append(session_id)
            
            return active_sessions
        except Exception as e:
            logger.error(f"❌ Failed to list sessions: {e}")
            return []
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        try:
            if not os.path.exists(self.session_dir):
                return
                
            all_files = os.listdir(self.session_dir)
            session_files = [f for f in all_files if f.endswith('.json')]
            cleaned_count = 0
            
            for session_file in session_files:
                session_id = session_file.replace('.json', '')
                if not self.get_session(session_id):  # This will delete expired ones
                    cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"🧹 Cleaned up {cleaned_count} expired sessions")
                
        except Exception as e:
            logger.error(f"❌ Failed to cleanup sessions: {e}")

    def is_browser_alive(self, browser_pid):
        """Check if browser process is still alive"""
        if not browser_pid:
            return False
        try:
            return psutil.pid_exists(browser_pid)
        except:
            return False
    
    def update_session(self, session_id, updates):
        """Update specific fields in session"""
        session_data = self.get_session(session_id)
        if session_data:
            session_data.update(updates)
            session_data['timestamp'] = datetime.now().isoformat()
            return self.store_session(session_id, session_data)
        return False

# Global session manager instance
logger.error(f"# Global session manager instance ENDED")
logger.error(f"#################==============#####################")
session_manager = SessionManager()
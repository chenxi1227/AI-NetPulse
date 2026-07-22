import json
import os
from mitmproxy import http
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Import table models from init_db.py
from init_db import CapturedData, ENGINE_URL

class MitmToDatabaseAddon:
    def __init__(self):
        # 2. Bind to same DB file, create session factory
        self.engine = create_engine(ENGINE_URL)
        self.Session = sessionmaker(bind=self.engine)
        print("[Mitmproxy] Connected to project.db database!")

    def response(self, flow: http.HTTPFlow) -> None:
        # 3. Filter target API (replace URL with actual target)
        if "://example.com" in flow.request.pretty_url:
            
            # Create a DB session
            session = self.Session()
            try:
                # 4. Parse response data
                response_text = flow.response.get_text()
                data = json.loads(response_text)
                
                # Assume API returns: {"user_info": {"id": "9527", "name": "Hua An"}}
                user_info = data.get("user_info", {})
                uid = user_info.get("id")
                uname = user_info.get("name")

                if uid:
                    # 5. Check if user already exists
                    existing_data = session.query(CapturedData).filter_by(target_user_id=uid).first()
                    
                    if existing_data:
                        # Update existing record
                        existing_data.target_username = uname
                        existing_data.raw_json = response_text
                        print(f"[DB UPDATE] Updated user: {uname} ({uid})")
                    else:
                        # Insert new record
                        new_data = CapturedData(
                            target_user_id=uid,
                            target_username=uname,
                            raw_json=response_text
                        )
                        session.add(new_data)
                        print(f"[DB INSERT] New user: {uname} ({uid})")
                    
                    # Commit transaction to write to .db file
                    session.commit()

            except Exception as e:
                session.rollback() # rollback to prevent DB lock/corruption
                print(f"[DB ERROR] Write failed: {e}")
            finally:
                session.close() # close session to release file lock

# Register addon
addons = [
    MitmToDatabaseAddon()
]

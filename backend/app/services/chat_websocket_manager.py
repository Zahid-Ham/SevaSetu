from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, List
import json

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        print(f"[WS] User {user_id} connected. Active connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"[WS] User {user_id} disconnected.")

    async def notify_receiver(self, receiver_id: str, message_data: dict):
        """
        Notifies the receiver that a new message has arrived.
        This avoids the receiver having to poll or re-fetch everything.
        """
        if receiver_id in self.active_connections:
            # Send to all active devices of the user
            disconnected = []
            for connection in self.active_connections[receiver_id]:
                try:
                    await connection.send_text(json.dumps({
                        "type": "new_message",
                        "data": message_data
                    }))
                except Exception as e:
                    print(f"[WS] Failed to notify {receiver_id}: {e}")
                    disconnected.append(connection)
            
            # Cleanup broken connections
            for conn in disconnected:
                self.active_connections[receiver_id].discard(conn)

manager = ConnectionManager()

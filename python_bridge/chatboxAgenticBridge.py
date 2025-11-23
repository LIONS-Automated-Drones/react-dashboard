import asyncio
import websockets

from websockets.asyncio.server import serve

message = "global"
event = asyncio.Event()
event2 = asyncio.Event()

async def agenticHandler(websocket):
    global message
    print("Connection established with the VirtualBox agent_pilot")
    try:
        while (True):
            await event.wait()
            # print(f"Event resolved") # for debugging
            event.clear()
            await websocket.send(message)
            print("Message sent to the VirtualBox agent_pilot from the server bridge")
            message = await websocket.recv()
            print("Message received from the VirtualBox agent_pilot to the server bridge")
            event2.set()
    finally:
        print("Connection closed with the VirtualBox agent_pilot")

async def dashboardHandler(websocket):
    global message
    print("Connection established with the React Dashboard")
    try: 
        message = await websocket.recv()
        while (message != "exit"):
            print("Message received from the React Dashboard to the server bridge")
            event.set()
            await event2.wait()
            # print(f"Event2 resolved") # for debugging
            event2.clear()
            await websocket.send(message)
            print("Message sent to the React Dashboard from the server bridge")
            message = await websocket.recv()
    finally: 
        print("Connection closed with the React Dashboard")

async def main():
    await websockets.serve(agenticHandler, "0.0.0.0", 12691)   # server for connecting to the VirtualBox agent_pilot
    await websockets.serve(dashboardHandler, "localhost", 12345) # server for connecting to the React Dashboard
    await asyncio.Future()

if __name__ == "__main__":
    print(f"Waiting for connections...")
    asyncio.run(main())
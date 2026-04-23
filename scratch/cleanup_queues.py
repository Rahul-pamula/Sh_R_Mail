import os
import asyncio
import aio_pika
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_URL = os.getenv("RABBITMQ_URL")

async def cleanup():
    print(f"Connecting to {RABBITMQ_URL}...")
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        
        queues_to_delete = ["background_tasks", "import_tasks", "failed_tasks"]
        
        for q_name in queues_to_delete:
            try:
                print(f"Deleting queue: {q_name}")
                await channel.queue_delete(q_name)
            except Exception as e:
                print(f"Could not delete {q_name} (might not exist): {e}")

if __name__ == "__main__":
    asyncio.run(cleanup())

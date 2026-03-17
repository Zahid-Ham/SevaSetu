import os
from google.cloud import documentai  # type: ignore
from dotenv import load_dotenv  # type: ignore

# Load environment variables
load_dotenv()

# Configuration variables
PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("DOCUMENT_AI_LOCATION")
PROCESSOR_ID = os.getenv("DOCUMENT_AI_PROCESSOR_ID")

# Ensure Document AI client uses the correct endpoint for the location
client_options = {"api_endpoint": f"{LOCATION}-documentai.googleapis.com"}

def get_document_ai_client():
    """
    Initializes and returns a Google Document AI client.
    """
    # Google Cloud client libraries automatically look for GOOGLE_APPLICATION_CREDENTIALS 
    # environment variable, which is set in .env and loaded by load_dotenv().
    return documentai.DocumentProcessorServiceClient(client_options=client_options)

# Reusable Document AI client
document_ai_client = get_document_ai_client()

# Processor source name for convenience
PROCESSOR_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/processors/{PROCESSOR_ID}"

import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Correctly load the .env file from the sanghathi-Backend folder
# This ensures it finds the .env file even if you run the script from the scripts folder
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)

# Fetch MONGODB_URI from the .env file (Note: your .env uses MONGODB_URI, not MONGO_URI)
MONGO_URI = os.getenv("MONGODB_URI")

# Add a safety check to prevent connecting to localhost by default!
if not MONGO_URI:
    raise ValueError("MONGODB_URI is empty or not found. Check your .env file path and variable name.")

# Connect to MongoDB
client = MongoClient(MONGO_URI)

# Explicitly choose your database
db = client["cmrit"]

# Collection
profile_collection = db["studentprofiles"]

# Semesters to skip
skip_sems = [8]

# Query and update operation
query = {"sem": {"$nin": skip_sems}}
update = {"$inc": {"sem": 1}}

# Update studentprofiles collection
profile_result = profile_collection.update_many(query, update)

print(f"Profiles updated: {profile_result.modified_count}")
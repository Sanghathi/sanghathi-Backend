"""
Script to remove subjects with name 'cumulative' from attendance records
"""
import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# ANSI color codes for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'

# Load environment variables from the backend directory
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
env_path = os.path.join(backend_dir, '.env')

print(f"{Colors.CYAN}Loading environment from: {env_path}{Colors.RESET}")
load_dotenv(env_path)

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI')
if not MONGO_URI:
    print(f"{Colors.RED}ERROR: MONGODB_URI not found in .env file{Colors.RESET}")
    sys.exit(1)

print(f"{Colors.CYAN}Connecting to MongoDB...{Colors.RESET}")
try:
    client = MongoClient(MONGO_URI)
    # Test the connection
    client.server_info()
    print(f"{Colors.GREEN}✓ Connected to MongoDB successfully{Colors.RESET}\n")
except Exception as e:
    print(f"{Colors.RED}ERROR: Could not connect to MongoDB: {e}{Colors.RESET}")
    sys.exit(1)

# Auto-detect database name from URI or use default
if '/cmrit' in MONGO_URI:
    db_name = 'cmrit'
else:
    db_name = 'test'

print(f"{Colors.CYAN}Using database: {db_name}{Colors.RESET}")
db = client[db_name]

# List available collections to help debug
collections = db.list_collection_names()
print(f"{Colors.CYAN}Available collections: {', '.join(collections)}{Colors.RESET}\n")

def remove_cumulative_subjects(dry_run=True):
    """
    Remove subjects with name 'cumulative' (case-insensitive) from attendance records
    
    Args:
        dry_run: If True, only show what would be changed without making actual changes
    """
    collection = db['attendances']
    
    total_records = collection.count_documents({})
    print(f"{Colors.CYAN}Total attendance records: {total_records}{Colors.RESET}\n")
    
    records_modified = 0
    total_subjects_removed = 0
    
    # Find all attendance records
    all_records = collection.find({})
    
    for record in all_records:
        record_modified = False
        subjects_removed_count = 0
        user_id = record.get('userId')
        
        # Process each semester
        for semester in record.get('semesters', []):
            semester_num = semester.get('semester')
            
            # Process each month
            for month in semester.get('months', []):
                month_num = month.get('month')
                original_subjects = month.get('subjects', [])
                
                # Filter out cumulative subjects
                filtered_subjects = [
                    subject for subject in original_subjects
                    if subject.get('subjectName', '').lower() != 'cumulative'
                ]
                
                # Check if any subjects were removed
                removed_count = len(original_subjects) - len(filtered_subjects)
                
                if removed_count > 0:
                    record_modified = True
                    subjects_removed_count += removed_count
                    
                    if dry_run:
                        print(f"{Colors.YELLOW}[DRY RUN] Would remove {removed_count} 'cumulative' subject(s){Colors.RESET}")
                        print(f"  User ID: {user_id}")
                        print(f"  Semester: {semester_num}, Month: {month_num}")
                        for subject in original_subjects:
                            if subject.get('subjectName', '').lower() == 'cumulative':
                                print(f"    - {subject.get('subjectName')}: {subject.get('attendedClasses')}/{subject.get('totalClasses')}")
                    else:
                        # Update the subjects array
                        month['subjects'] = filtered_subjects
        
        # Update the record if modified
        if record_modified:
            records_modified += 1
            total_subjects_removed += subjects_removed_count
            
            if not dry_run:
                collection.replace_one(
                    {'_id': record['_id']},
                    record
                )
                print(f"{Colors.GREEN}✓ Updated record for user {user_id} - Removed {subjects_removed_count} cumulative subject(s){Colors.RESET}")
    
    # Summary
    print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}SUMMARY{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")
    
    if dry_run:
        print(f"{Colors.YELLOW}[DRY RUN MODE]{Colors.RESET}")
        print(f"Records that would be modified: {Colors.YELLOW}{records_modified}{Colors.RESET}")
        print(f"Total 'cumulative' subjects that would be removed: {Colors.YELLOW}{total_subjects_removed}{Colors.RESET}")
        print(f"\n{Colors.CYAN}Run with dry_run=False to apply changes{Colors.RESET}")
    else:
        print(f"Records modified: {Colors.GREEN}{records_modified}{Colors.RESET}")
        print(f"Total 'cumulative' subjects removed: {Colors.GREEN}{total_subjects_removed}{Colors.RESET}")
        print(f"\n{Colors.GREEN}✓ Cleanup completed successfully!{Colors.RESET}")

if __name__ == "__main__":
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}Remove 'Cumulative' Subjects from Attendance Records{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}\n")
    
    # First run in dry-run mode to see what would be changed
    print(f"{Colors.YELLOW}Running in DRY RUN mode...{Colors.RESET}\n")
    remove_cumulative_subjects(dry_run=True)
    
    # Apply the changes
    print(f"\n{Colors.RED}Running in LIVE mode...{Colors.RESET}\n")
    remove_cumulative_subjects(dry_run=False)

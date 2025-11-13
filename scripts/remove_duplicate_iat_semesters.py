#!/usr/bin/env python3
"""
Script to remove duplicate semesters from IAT (Internal Assessment Test) records in MongoDB.

This script:
1. Connects to MongoDB
2. Finds all IAT records with duplicate semesters
3. Keeps only the latest entry for each semester (based on array position)
4. Removes older duplicate semester entries
5. Provides a summary of changes

Usage:
    python scripts/remove_duplicate_iat_semesters.py

Requirements:
    - pymongo
    - python-dotenv (optional, for .env file support)

Install dependencies:
    pip install pymongo python-dotenv
"""

import os
import sys
from datetime import datetime
from collections import Counter

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure
except ImportError:
    print("Error: pymongo is not installed.")
    print("Install it using: pip install pymongo")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Using environment variables directly.")


# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/your_database')

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(message):
    """Print a formatted header message"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(70)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 70}{Colors.ENDC}\n")


def print_success(message):
    """Print a success message"""
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")


def print_warning(message):
    """Print a warning message"""
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")


def print_error(message):
    """Print an error message"""
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")


def print_info(message):
    """Print an info message"""
    print(f"{Colors.OKCYAN}ℹ {message}{Colors.ENDC}")


def connect_to_mongodb():
    """Connect to MongoDB and return the database instance"""
    try:
        print_info(f"Connecting to MongoDB...")
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        
        # Extract database name from URI or use default
        db_name = MONGODB_URI.split('/')[-1].split('?')[0] or 'test'
        db = client[db_name]
        
        print_success(f"Connected to MongoDB database: {db_name}")
        return db, client
    
    except ConnectionFailure as e:
        print_error(f"Failed to connect to MongoDB: {e}")
        print_info("Please check your MONGODB_URI in .env file")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error connecting to MongoDB: {e}")
        sys.exit(1)


def find_duplicate_semesters(db):
    """Find all IAT records with duplicate semesters"""
    
    # Try to find the correct collection name
    collection_names = db.list_collection_names()
    print_info(f"Available collections: {', '.join(collection_names)}")
    
    # Look for IAT collection (case-insensitive)
    iat_collection_name = None
    possible_names = ['iatmarks', 'iat', 'Iat', 'IatMarks', 'iatMarks']
    
    for name in possible_names:
        if name in collection_names:
            iat_collection_name = name
            break
    
    if not iat_collection_name:
        # Check for any collection with 'iat' in the name
        for name in collection_names:
            if 'iat' in name.lower():
                iat_collection_name = name
                break
    
    if not iat_collection_name:
        print_error("Could not find IAT collection!")
        print_info("Please check your database collections.")
        return []
    
    print_success(f"Using collection: {iat_collection_name}")
    print_info("Scanning for duplicate semesters...")
    
    iat_collection = db[iat_collection_name]
    total_records = iat_collection.count_documents({})
    print_info(f"Total IAT records: {total_records}")
    
    if total_records == 0:
        print_warning("No records found in IAT collection!")
        return []
    
    records_with_duplicates = []
    
    for record in iat_collection.find():
        user_id = record.get('userId')
        record_id = record.get('_id')
        semesters = record.get('semesters', [])
        
        if not semesters:
            continue
        
        # Count semester occurrences
        semester_numbers = [sem.get('semester') for sem in semesters]
        semester_counts = Counter(semester_numbers)
        
        # Find duplicates
        duplicates = {sem: count for sem, count in semester_counts.items() if count > 1}
        
        if duplicates:
            # Show detailed info about which positions have duplicates
            duplicate_positions = {}
            for idx, sem in enumerate(semesters):
                sem_num = sem.get('semester')
                if sem_num in duplicates:
                    if sem_num not in duplicate_positions:
                        duplicate_positions[sem_num] = []
                    duplicate_positions[sem_num].append({
                        'index': idx,
                        '_id': sem.get('_id', 'No _id')
                    })
            
            records_with_duplicates.append({
                '_id': record_id,
                'userId': user_id,
                'duplicates': duplicates,
                'duplicate_positions': duplicate_positions,
                'total_semesters': len(semesters),
                'semesters': semesters,
                'collection_name': iat_collection_name
            })
    
    return records_with_duplicates


def remove_duplicates(db, records_with_duplicates, dry_run=True):
    """Remove duplicate semesters, keeping only the latest entry"""
    
    total_duplicates_removed = 0
    total_records_updated = 0
    
    for record_info in records_with_duplicates:
        record_id = record_info['_id']
        user_id = record_info['userId']
        duplicates = record_info['duplicates']
        semesters = record_info['semesters']
        collection_name = record_info.get('collection_name', 'iatmarks')
        
        iat_collection = db[collection_name]
        
        print_info(f"\nProcessing User ID: {user_id}")
        print_info(f"  Record _id: {record_id}")
        print_info(f"  Total semesters before: {len(semesters)}")
        
        # Track which semesters we've seen (keep LAST occurrence, which is the latest)
        seen_semesters = set()
        semesters_to_keep = []
        duplicates_count = 0
        
        # Iterate through semesters in FORWARD order, marking duplicates
        # But we'll reverse the check to keep the LAST occurrence
        semester_positions = {}
        
        # First pass: find the LAST position of each semester
        for idx, semester in enumerate(semesters):
            sem_num = semester.get('semester')
            semester_positions[sem_num] = idx  # This keeps getting updated to the last position
        
        # Second pass: keep only the last occurrence of each semester
        for idx, semester in enumerate(semesters):
            sem_num = semester.get('semester')
            
            if semester_positions[sem_num] == idx:
                # This is the last occurrence - keep it
                semesters_to_keep.append(semester)
                print_success(f"  ✓ Keeping semester {sem_num} at index {idx} (latest entry)")
            else:
                # This is a duplicate - mark for removal
                duplicates_count += 1
                print_warning(f"  ✗ Removing duplicate semester {sem_num} at index {idx}")
        
        print_info(f"  Total semesters after: {len(semesters_to_keep)}")
        print_info(f"  Duplicates removed: {duplicates_count}")
        
        if duplicates_count > 0:
            total_duplicates_removed += duplicates_count
            total_records_updated += 1
            
            if not dry_run:
                # Update the record with deduplicated semesters
                result = iat_collection.update_one(
                    {'_id': record_id},
                    {'$set': {'semesters': semesters_to_keep}}
                )
                
                if result.modified_count > 0:
                    print_success(f"  ✓✓ Successfully updated record for User ID: {user_id}")
                else:
                    print_error(f"  ✗✗ Failed to update record for User ID: {user_id}")
            else:
                print_warning(f"  [DRY RUN] Would update record for User ID: {user_id}")
        else:
            print_info(f"  No duplicates found for this record")
    
    return total_records_updated, total_duplicates_removed


def main():
    """Main execution function"""
    print_header("IAT Duplicate Semester Removal Script")
    
    # Connect to MongoDB
    db, client = connect_to_mongodb()
    
    try:
        # Find records with duplicate semesters
        records_with_duplicates = find_duplicate_semesters(db)
        
        if not records_with_duplicates:
            print_success("\n✓ No duplicate semesters found! Database is clean.")
            return
        
        print_warning(f"\nFound {len(records_with_duplicates)} records with duplicate semesters:")
        
        for record in records_with_duplicates:
            print(f"\n  {'─' * 60}")
            print(f"  Record _id: {record['_id']}")
            print(f"  User ID: {record['userId']}")
            print(f"  Total semesters: {record['total_semesters']}")
            print(f"  Duplicate semesters: {record['duplicates']}")
            if 'duplicate_positions' in record:
                print(f"  Duplicate positions:")
                for sem_num, positions in record['duplicate_positions'].items():
                    print(f"    Semester {sem_num} appears at indices: {[p['index'] for p in positions]}")
        
        # Ask for confirmation
        print("\n" + "="*70)
        print_warning("⚠ DRY RUN MODE - No changes will be made yet")
        print("="*70 + "\n")
        
        # Perform dry run
        updated, removed = remove_duplicates(db, records_with_duplicates, dry_run=True)
        
        print("\n" + "="*70)
        print_info("DRY RUN SUMMARY:")
        print(f"  Records to update: {updated}")
        print(f"  Duplicate semesters to remove: {removed}")
        print("="*70 + "\n")
        
        # Ask for confirmation
        response = input(f"{Colors.WARNING}Do you want to proceed with removing duplicates? (yes/no): {Colors.ENDC}").strip().lower()
        
        if response in ['yes', 'y']:
            print_info("\nRemoving duplicate semesters...")
            updated, removed = remove_duplicates(db, records_with_duplicates, dry_run=False)
            
            print_header("CLEANUP COMPLETE")
            print_success(f"✓ Updated {updated} IAT records")
            print_success(f"✓ Removed {removed} duplicate semester entries")
            print_success("✓ Database cleanup successful!")
        else:
            print_warning(f"\nOperation cancelled. You entered: '{response}'")
            print_info("Please run the script again and enter 'yes' or 'y' to confirm.")
    
    except Exception as e:
        print_error(f"\nAn error occurred: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Close MongoDB connection
        client.close()
        print_info("\nMongoDB connection closed.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Script to remove duplicate entries from Attendance records in MongoDB.

This script:
1. Removes duplicate semesters (keeps latest)
2. Removes duplicate months within semesters (keeps latest)
3. Removes duplicate subjects within months (by subjectCode or subjectName)
4. Removes subjects with "No Data" or invalid values
5. Provides detailed summary of cleanup

Usage:
    python scripts/remove_duplicate_attendance.py

Requirements:
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
        
        # Extract database name from URI
        db_name = MONGODB_URI.split('/')[-1].split('?')[0] or 'test'
        db = client[db_name]
        
        print_success(f"Connected to MongoDB database: {db_name}")
        return db, client
    
    except ConnectionFailure as e:
        print_error(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)


def is_invalid_subject(subject):
    """Check if subject has invalid or 'No Data' values"""
    subject_name = subject.get('subjectName', '')
    attended = subject.get('attendedClasses')
    total = subject.get('totalClasses')
    
    # Check for numeric-only subject names
    if subject_name and subject_name.strip().isdigit():
        return True
    
    # Check for No Data or missing values
    if attended is None or total is None:
        return True
    
    # Check for zero total classes
    if total == 0:
        return True
    
    # Check for empty subject name
    if not subject_name or subject_name.strip() == '':
        return True
    
    return False


def clean_attendance_record(record):
    """Clean a single attendance record"""
    changes = {
        'duplicate_semesters': 0,
        'duplicate_months': 0,
        'duplicate_subjects': 0,
        'invalid_subjects': 0,
        'total_before': 0,
        'total_after': 0
    }
    
    semesters = record.get('semesters', [])
    if not semesters:
        return None, changes
    
    # Track initial counts
    for sem in semesters:
        for month in sem.get('months', []):
            changes['total_before'] += len(month.get('subjects', []))
    
    # Step 1: Remove duplicate semesters (keep latest)
    seen_semesters = {}
    for idx, sem in enumerate(semesters):
        sem_num = sem.get('semester')
        seen_semesters[sem_num] = idx
    
    unique_semesters = []
    for sem_num, idx in seen_semesters.items():
        unique_semesters.append(semesters[idx])
    
    changes['duplicate_semesters'] = len(semesters) - len(unique_semesters)
    
    # Step 2: For each semester, remove duplicate months (keep latest)
    for semester in unique_semesters:
        months = semester.get('months', [])
        seen_months = {}
        
        for idx, month in enumerate(months):
            month_num = month.get('month')
            seen_months[month_num] = idx
        
        unique_months = []
        for month_num, idx in seen_months.items():
            unique_months.append(months[idx])
        
        changes['duplicate_months'] += len(months) - len(unique_months)
        
        # Step 3: For each month, remove duplicate and invalid subjects
        for month in unique_months:
            subjects = month.get('subjects', [])
            seen_subjects = {}
            valid_subjects = []
            
            for subject in subjects:
                # Skip invalid subjects
                if is_invalid_subject(subject):
                    changes['invalid_subjects'] += 1
                    continue
                
                subject_code = subject.get('subjectCode', '').strip()
                subject_name = subject.get('subjectName', '').strip()
                
                # Use subjectCode as primary key, fallback to subjectName
                key = subject_code if subject_code else subject_name
                
                if key and key not in seen_subjects:
                    seen_subjects[key] = subject
                    valid_subjects.append(subject)
                elif key:
                    changes['duplicate_subjects'] += 1
            
            month['subjects'] = valid_subjects
        
        semester['months'] = unique_months
    
    # Track final counts
    for sem in unique_semesters:
        for month in sem.get('months', []):
            changes['total_after'] += len(month.get('subjects', []))
    
    record['semesters'] = unique_semesters
    
    return record, changes


def find_and_clean_attendance(db):
    """Find and clean all attendance records"""
    print_info("Scanning Attendance collection...")
    
    attendance_collection = db['attendances']
    total_records = attendance_collection.count_documents({})
    print_info(f"Total Attendance records: {total_records}")
    
    if total_records == 0:
        print_warning("No attendance records found!")
        return []
    
    records_to_update = []
    total_changes = {
        'duplicate_semesters': 0,
        'duplicate_months': 0,
        'duplicate_subjects': 0,
        'invalid_subjects': 0,
        'total_before': 0,
        'total_after': 0
    }
    
    for record in attendance_collection.find():
        cleaned_record, changes = clean_attendance_record(record)
        
        if cleaned_record and (changes['duplicate_semesters'] > 0 or 
                               changes['duplicate_months'] > 0 or 
                               changes['duplicate_subjects'] > 0 or
                               changes['invalid_subjects'] > 0):
            records_to_update.append({
                '_id': record['_id'],
                'userId': record.get('userId'),
                'cleaned_record': cleaned_record,
                'changes': changes
            })
            
            # Accumulate total changes
            for key in total_changes:
                total_changes[key] += changes[key]
    
    return records_to_update, total_changes


def apply_cleanup(db, records_to_update, dry_run=True):
    """Apply cleanup to attendance records"""
    attendance_collection = db['attendances']
    updated_count = 0
    
    for record_info in records_to_update:
        record_id = record_info['_id']
        user_id = record_info['userId']
        cleaned_record = record_info['cleaned_record']
        changes = record_info['changes']
        
        print_info(f"\nUser ID: {user_id}")
        print(f"  Duplicate semesters removed: {changes['duplicate_semesters']}")
        print(f"  Duplicate months removed: {changes['duplicate_months']}")
        print(f"  Duplicate subjects removed: {changes['duplicate_subjects']}")
        print(f"  Invalid subjects removed: {changes['invalid_subjects']}")
        print(f"  Total subjects: {changes['total_before']} → {changes['total_after']}")
        
        if not dry_run:
            result = attendance_collection.update_one(
                {'_id': record_id},
                {'$set': {'semesters': cleaned_record['semesters']}}
            )
            
            if result.modified_count > 0:
                print_success(f"  ✓ Updated successfully")
                updated_count += 1
            else:
                print_error(f"  ✗ Update failed")
        else:
            print_warning(f"  [DRY RUN] Would update this record")
    
    return updated_count


def main():
    """Main execution function"""
    print_header("Attendance Duplicate Removal Script")
    
    # Connect to MongoDB
    db, client = connect_to_mongodb()
    
    try:
        # Find and clean records
        records_to_update, total_changes = find_and_clean_attendance(db)
        
        if not records_to_update:
            print_success("\n✓ No duplicates or invalid data found! Database is clean.")
            return
        
        print_warning(f"\nFound {len(records_to_update)} records that need cleaning")
        
        print("\n" + "="*70)
        print_warning("⚠ DRY RUN MODE - No changes will be made yet")
        print("="*70 + "\n")
        
        # Perform dry run
        apply_cleanup(db, records_to_update, dry_run=True)
        
        print("\n" + "="*70)
        print_info("DRY RUN SUMMARY:")
        print(f"  Records to update: {len(records_to_update)}")
        print(f"  Duplicate semesters to remove: {total_changes['duplicate_semesters']}")
        print(f"  Duplicate months to remove: {total_changes['duplicate_months']}")
        print(f"  Duplicate subjects to remove: {total_changes['duplicate_subjects']}")
        print(f"  Invalid subjects to remove: {total_changes['invalid_subjects']}")
        print(f"  Total subjects: {total_changes['total_before']} → {total_changes['total_after']}")
        print("="*70 + "\n")
        
        # Ask for confirmation
        response = input(f"{Colors.WARNING}Proceed with cleanup? (yes/no): {Colors.ENDC}").strip().lower()
        
        if response in ['yes', 'y']:
            print_info("\nApplying cleanup...")
            updated = apply_cleanup(db, records_to_update, dry_run=False)
            
            print_header("CLEANUP COMPLETE")
            print_success(f"✓ Updated {updated} attendance records")
            print_success(f"✓ Removed {total_changes['duplicate_semesters']} duplicate semesters")
            print_success(f"✓ Removed {total_changes['duplicate_months']} duplicate months")
            print_success(f"✓ Removed {total_changes['duplicate_subjects']} duplicate subjects")
            print_success(f"✓ Removed {total_changes['invalid_subjects']} invalid subjects")
            print_success("✓ Database cleanup successful!")
        else:
            print_warning(f"\nOperation cancelled. You entered: '{response}'")
    
    except Exception as e:
        print_error(f"\nAn error occurred: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()
        print_info("\nMongoDB connection closed.")


if __name__ == "__main__":
    main()

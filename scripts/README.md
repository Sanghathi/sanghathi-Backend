# Database Maintenance Scripts

This folder contains utility scripts for database maintenance and cleanup operations.

## Scripts

### `remove_duplicate_iat_semesters.py`

Removes duplicate semester entries from IAT (Internal Assessment Test) records in MongoDB.

#### What it does:
- Scans all IAT records in the database
- Identifies records with duplicate semester numbers
- Keeps only the **latest entry** for each semester
- Removes older duplicate entries
- Provides a detailed summary of changes

#### Prerequisites:

1. **Install Python dependencies:**
   ```bash
   pip install pymongo python-dotenv
   ```

2. **Set up environment variables:**
   Make sure your `.env` file contains:
   ```env
   MONGODB_URI=mongodb://your-mongodb-connection-string
   ```

#### How to run:

**Option 1: From VS Code Terminal**
1. Open terminal in VS Code (Ctrl + `)
2. Navigate to the backend folder:
   ```bash
   cd sanghathi-Backend
   ```
3. Run the script:
   ```bash
   python scripts/remove_duplicate_iat_semesters.py
   ```

**Option 2: Using VS Code Run Button**
1. Open `scripts/remove_duplicate_iat_semesters.py` in VS Code
2. Right-click in the editor
3. Select "Run Python File in Terminal"

#### Features:

✅ **Dry Run Mode** - Shows what will be changed without making actual changes
✅ **Colored Output** - Easy-to-read terminal output with colors
✅ **Confirmation Prompt** - Asks for confirmation before making changes
✅ **Detailed Summary** - Shows exactly what was changed
✅ **Error Handling** - Gracefully handles connection errors
✅ **Safe Operation** - Keeps the latest semester entry

#### Example Output:

```
======================================================================
        IAT Duplicate Semester Removal Script
======================================================================

ℹ Connecting to MongoDB...
✓ Connected to MongoDB database: sanghathi
ℹ Scanning IAT collection for duplicate semesters...
ℹ Total IAT records: 150

⚠ Found 5 records with duplicate semesters:

  User ID: 507f1f77bcf86cd799439011
  Total semesters: 4
  Duplicate semesters: {3: 2}

ℹ Processing User ID: 507f1f77bcf86cd799439011
ℹ   Total semesters: 4
✓   ✓ Keeping semester 3 (latest entry)
⚠   ✗ Removing duplicate semester 3

======================================================================
⚠ DRY RUN MODE - No changes will be made yet
======================================================================

ℹ DRY RUN SUMMARY:
  Records to update: 5
  Duplicate semesters to remove: 7
======================================================================

Do you want to proceed with removing duplicates? (yes/no): yes

ℹ Removing duplicate semesters...

======================================================================
                    CLEANUP COMPLETE
======================================================================

✓ Updated 5 IAT records
✓ Removed 7 duplicate semester entries
✓ Database cleanup successful!
```

#### Safety Features:

1. **Dry Run First** - Always shows what will change before doing it
2. **User Confirmation** - Requires explicit "yes" to proceed
3. **Latest Entry Preserved** - Keeps the most recent semester entry
4. **No Data Loss** - Only removes duplicates, never removes unique semesters

#### Troubleshooting:

**Error: "pymongo is not installed"**
```bash
pip install pymongo
```

**Error: "Failed to connect to MongoDB"**
- Check your `MONGODB_URI` in `.env` file
- Ensure MongoDB is running
- Verify network connection

**Error: "python-dotenv not installed"**
```bash
pip install python-dotenv
```
Or set `MONGODB_URI` as a system environment variable.

---

## Adding New Scripts

When adding new maintenance scripts to this folder:

1. Use descriptive names (e.g., `remove_duplicate_attendance.py`)
2. Add a docstring at the top explaining what it does
3. Include dry-run mode for safety
4. Add colored output for better UX
5. Update this README with usage instructions

# Database Migration Guide

## Overview
This update moves search history and transaction data from browser localStorage to the Supabase database. This ensures your data persists across devices and browser sessions.

## What Changed
- **Search History**: Now stored in `search_history` table
- **Transactions**: Now stored in `transactions` table  
- **Credits**: Still stored in `profiles` table (no change)

## Required Steps

### 1. Update Database Schema
Run the SQL commands from `SUPABASE_SETUP.md` in your Supabase SQL Editor to create the required tables.

### 2. Add Service Role Key (Recommended)
Add your Supabase service role key to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Data Migration (Optional)
Your existing localStorage data will be lost after this update. If you want to preserve it:

1. **Before updating**, export your data:
   ```javascript
   // Run in browser console
   const userId = 'your-user-id';
   const history = localStorage.getItem(`search_history_${userId}`);
   const transactions = localStorage.getItem(`transactions_${userId}`);
   console.log('History:', history);
   console.log('Transactions:', transactions);
   ```

2. **After updating**, you can manually re-add important searches by using the application normally.

## Benefits of Database Storage
- ✅ **Persistent across devices** - Access your history from any device
- ✅ **Persistent across browsers** - Switch browsers without losing data
- ✅ **Backup and recovery** - Data is safely stored in Supabase
- ✅ **Better performance** - Optimized database queries
- ✅ **Data integrity** - Proper validation and constraints

## Troubleshooting

### Missing Search History
- Your old localStorage history won't automatically transfer
- Start using the app normally to build new history
- History will now persist when you log out/in

### Missing Transactions  
- Old localStorage transactions won't automatically transfer
- New transactions will be properly recorded in the database
- Check the Credits page to see your transaction history

### Database Errors
- Ensure you've run the `database_schema.sql` script
- Check that RLS policies are properly configured
- Verify your service role key is correct (if using)

## Rollback (Emergency Only)
If you need to temporarily rollback to localStorage:
1. Revert the SearchHistoryContext.tsx changes
2. Revert the credits page changes
3. This is not recommended as a permanent solution

## Support
If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Ensure the database schema was applied correctly
4. Check that your environment variables are set properly 
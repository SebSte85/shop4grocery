-- Create a function to delete all user data before deleting the account
CREATE OR REPLACE FUNCTION public.delete_user_data(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user subscriptions
  DELETE FROM user_subscriptions WHERE user_id = $1;
  
  -- Delete shared lists (where user is the recipient)
  DELETE FROM shared_lists WHERE shared_with_user_id = $1;
  
  -- Delete shared lists (where user is the owner)
  DELETE FROM shared_lists WHERE list_id IN (
    SELECT id FROM shopping_lists WHERE user_id = $1
  );
  
  -- Delete list items
  DELETE FROM shopping_list_items WHERE list_id IN (
    SELECT id FROM shopping_lists WHERE user_id = $1
  );
  
  -- Delete shopping lists
  DELETE FROM shopping_lists WHERE user_id = $1;
  
  -- Delete user profile data (if you have a separate user_profiles table)
  -- DELETE FROM user_profiles WHERE user_id = $1;
  
  -- Add any other tables where user data is stored
  -- The order of deletion matters due to foreign key constraints
END;
$$; 
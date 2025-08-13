-- Fix the RLS policy for profile picture uploads
-- The current INSERT policy has no condition (qual is null), which might be blocking uploads

-- Drop the current policy and recreate it with proper conditions
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;

-- Create a proper policy for authenticated users to upload to profile_pictures bucket
CREATE POLICY "Authenticated users can upload profile pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'profile_pictures' 
    AND auth.uid() IS NOT NULL
);

-- Also ensure users can update their own uploaded files
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;

CREATE POLICY "Users can update their own profile pictures" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'profile_pictures' 
    AND auth.uid() IS NOT NULL 
    AND auth.uid() = owner
) 
WITH CHECK (
    bucket_id = 'profile_pictures' 
    AND auth.uid() IS NOT NULL
);

-- Ensure users can delete their own uploaded files  
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

CREATE POLICY "Users can delete their own profile pictures" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'profile_pictures' 
    AND auth.uid() IS NOT NULL 
    AND auth.uid() = owner
);
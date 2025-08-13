-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Create proper RLS policies for profile_pictures bucket
CREATE POLICY "Enable upload for users on their own profile pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Enable read access for users on their own profile pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Enable update for users on their own profile pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Enable delete for users on their own profile pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);
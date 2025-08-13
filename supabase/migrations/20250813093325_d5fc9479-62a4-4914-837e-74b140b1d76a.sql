-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_pictures', 'profile_pictures', true);

-- Create policies for profile picture uploads
CREATE POLICY "Anyone can view profile pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile_pictures');

CREATE POLICY "Authenticated users can upload profile pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile_pictures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile_pictures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own profile pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile_pictures' AND auth.uid() IS NOT NULL);
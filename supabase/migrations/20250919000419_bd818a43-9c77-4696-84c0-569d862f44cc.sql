-- Create storage bucket for seller avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-avatars', 'seller-avatars', true);

-- Create policies for avatar access
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-avatars');

CREATE POLICY "Users can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-avatars');

CREATE POLICY "Users can update avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-avatars');

CREATE POLICY "Users can delete avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-avatars');
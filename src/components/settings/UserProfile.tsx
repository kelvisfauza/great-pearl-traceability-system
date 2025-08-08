
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Calendar, Shield, Camera, Key, Upload } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const UserProfile = () => {
  const { employee, fetchEmployeeData } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    phone: employee?.phone || '',
    address: employee?.address || '',
    emergency_contact: employee?.emergency_contact || '',
    avatar_url: employee?.avatar_url || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSaveProfile = async () => {
    if (!employee?.id) {
      toast({
        title: "Error",
        description: "Employee ID not found",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('Updating employee profile:', employee.id, formData);
      
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone?.trim() || "",
        address: formData.address?.trim() || "",
        emergency_contact: formData.emergency_contact?.trim() || "",
        avatar_url: formData.avatar_url || "",
        updated_at: new Date().toISOString()
      };

      // Update in Firebase
      await updateDoc(doc(db, 'employees', employee.id), updateData);
      console.log('Profile updated successfully in Firebase');

      // Refresh employee data to get updated information
      await fetchEmployeeData();
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      await updatePassword(currentUser, passwordData.newPassword);

      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== PROFILE PHOTO UPLOAD STARTED ===');
    const file = event.target.files?.[0];
    
    console.log('Selected file:', file);
    console.log('Employee ID:', employee?.id);
    console.log('Firebase storage instance:', storage);
    
    if (!file || !employee?.id) {
      console.log('Missing file or employee ID, aborting upload');
      return;
    }

    // Validate file type
    console.log('File type:', file.type);
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type detected');
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    console.log('File size:', file.size, 'bytes');
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large');
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting upload process...');
    setIsUploadingPhoto(true);
    
    try {
      // Create a reference to the storage location
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `avatars/${employee.id}/${fileName}`;
      console.log('Storage path:', storagePath);
      
      const storageRef = ref(storage, storagePath);
      console.log('Storage reference created:', storageRef);
      
      // Upload the file
      console.log('Uploading file to Firebase Storage...');
      console.log('File object:', file);
      console.log('Firebase app config:', storage.app.options);
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log('File uploaded successfully:', snapshot);
      console.log('Upload metadata:', snapshot.metadata);
      
      // Get the download URL
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);
      
      // Update the employee record with the new avatar URL
      console.log('Updating employee record in Firestore...');
      const updateData = {
        avatar_url: downloadURL,
        updated_at: new Date().toISOString()
      };
      console.log('Update data:', updateData);
      
      await updateDoc(doc(db, 'employees', employee.id), updateData);
      console.log('Employee record updated successfully');
      
      // Update local state
      setFormData(prev => ({ ...prev, avatar_url: downloadURL }));
      console.log('Local state updated');
      
      // Refresh employee data
      console.log('Refreshing employee data...');
      await fetchEmployeeData();
      console.log('Employee data refreshed');
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
      
      console.log('=== PROFILE PHOTO UPLOAD COMPLETED SUCCESSFULLY ===');
      
    } catch (error: any) {
      console.error('=== PROFILE PHOTO UPLOAD ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Failed to upload profile picture. Please try again.";
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Unauthorized to upload files. Please contact your administrator.";
        console.error('Firebase Storage: Unauthorized access - check storage rules');
      } else if (error.code === 'storage/canceled') {
        errorMessage = "Upload was canceled. Please try again.";
      } else if (error.code === 'storage/unknown') {
        errorMessage = "Unknown storage error occurred. Please check your internet connection.";
      } else if (error.code === 'storage/invalid-format') {
        errorMessage = "Invalid file format. Please select a valid image.";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = "Storage quota exceeded. Please contact your administrator.";
      } else if (error.message.includes('network')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      console.log('Upload process finished, resetting loading state');
      setIsUploadingPhoto(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      name: employee?.name || '',
      phone: employee?.phone || '',
      address: employee?.address || '',
      emergency_contact: employee?.emergency_contact || '',
      avatar_url: employee?.avatar_url || ''
    });
    setIsEditing(false);
  };

  // Update form data when employee data changes
  useEffect(() => {
    if (employee) {
      console.log('Setting form data from employee:', employee);
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        address: employee.address || '',
        emergency_contact: employee.emergency_contact || '',
        avatar_url: employee.avatar_url || ''
      });
    }
  }, [employee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Profile...</h3>
          <p className="text-gray-500">Please wait while we load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Manage your personal information and account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url || employee.avatar_url} alt={employee.name} />
                <AvatarFallback className="text-lg">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={isUploadingPhoto}
              />
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploadingPhoto ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{employee.name}</h3>
              <p className="text-muted-foreground mb-2">{employee.position}</p>
              <div className="flex gap-2 mb-4">
                <Badge variant="secondary">{employee.department}</Badge>
                <Badge variant="outline">{employee.role}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {employee.join_date ? new Date(employee.join_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.status || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </div>
          <Button 
            variant={isEditing ? "outline" : "default"} 
            onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="emergency">Emergency Contact</Label>
              <Input
                id="emergency"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                disabled={!isEditing}
              />
            </div>
          </div>
          
          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </div>
          <Button 
            variant={showPasswordForm ? "outline" : "default"}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            disabled={isChangingPassword}
          >
            <Key className="h-4 w-4 mr-2" />
            {showPasswordForm ? "Cancel" : "Change Password"}
          </Button>
        </CardHeader>
        
        {showPasswordForm && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                disabled={isChangingPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                disabled={isChangingPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                disabled={isChangingPassword}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordForm(false)} disabled={isChangingPassword}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default UserProfile;

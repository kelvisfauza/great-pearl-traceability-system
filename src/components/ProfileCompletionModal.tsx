import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, User, Heart, MapPin, CreditCard, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const TRIBES = [
  'Muganda', 'Munyankole', 'Musoga', 'Mukiga', 'Lango', 'Acholi', 'Lugbara',
  'Munyoro', 'Ateso', 'Mukonjo', 'Mufumbira', 'Mugisu', 'Musamia', 'Mugwere',
  'Japadhola', 'Alur', 'Madi', 'Mutagwenda', 'Muamba', 'Other'
];

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Soroti',
  'Mbarara', 'Kabale', 'Fort Portal', 'Kasese', 'Masaka', 'Entebbe', 'Arua',
  'Tororo', 'Iganga', 'Busia', 'Hoima', 'Masindi', 'Mityana', 'Luwero',
  'Mubende', 'Kiboga', 'Nakasongola', 'Kayunga', 'Kalangala', 'Rakai',
  'Lyantonde', 'Sembabule', 'Gomba', 'Butambala', 'Mpigi', 'Buikwe',
  'Namayingo', 'Bugiri', 'Mayuge', 'Luuka', 'Kamuli', 'Buyende', 'Kaliro',
  'Namutumba', 'Budaka', 'Kibuku', 'Pallisa', 'Butebo', 'Bududa', 'Manafwa',
  'Bulambuli', 'Sironko', 'Kapchorwa', 'Kween', 'Bukwo', 'Other'
];

const ProfileCompletionModal = () => {
  const { employee, fetchEmployeeData } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    national_id_name: '',
    national_id_number: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    tribe: '',
    district: '',
    phone: '',
    address: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relationship: '',
    emergency_contact: '',
    account_number: '',
    bank_name: '',
    account_name: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (employee && employee.id !== 'main-admin') {
      // Check if profile is incomplete
      const checkProfile = async () => {
        const { data } = await supabase
          .from('employees')
          .select('profile_completed, national_id_name, date_of_birth, next_of_kin_name, tribe, district, avatar_url, phone, national_id_number, gender, marital_status, next_of_kin_phone, next_of_kin_relationship, address, emergency_contact, account_number, bank_name, account_name')
          .eq('auth_user_id', employee.authUserId)
          .single();

        if (data && !data.profile_completed) {
          setFormData({
            national_id_name: data.national_id_name || '',
            national_id_number: data.national_id_number || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            marital_status: data.marital_status || '',
            tribe: data.tribe || '',
            district: data.district || '',
            phone: data.phone || employee.phone || '',
            address: data.address || employee.address || '',
            next_of_kin_name: data.next_of_kin_name || '',
            next_of_kin_phone: data.next_of_kin_phone || '',
            next_of_kin_relationship: data.next_of_kin_relationship || '',
            emergency_contact: data.emergency_contact || employee.emergency_contact || '',
            account_number: data.account_number || '',
            bank_name: data.bank_name || '',
            account_name: data.account_name || '',
            avatar_url: data.avatar_url || employee.avatar_url || ''
          });
          setIsOpen(true);
        }
      };
      checkProfile();
    }
  }, [employee]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ title: 'Invalid file', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${employee.authUserId}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('profile_pictures').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('profile_pictures').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: 'Photo uploaded!', description: 'Your profile photo has been uploaded.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const isStep1Valid = () => {
    return formData.national_id_name.trim() && formData.date_of_birth && formData.gender && formData.national_id_number.trim();
  };

  const isStep2Valid = () => {
    return formData.tribe && formData.district && formData.phone.trim() && formData.address.trim();
  };

  const isStep3Valid = () => {
    return formData.next_of_kin_name.trim() && formData.next_of_kin_phone.trim() && formData.next_of_kin_relationship.trim();
  };

  const isStep4Valid = () => {
    return formData.avatar_url.trim();
  };

  const handleSave = async () => {
    if (!employee?.authUserId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          national_id_name: formData.national_id_name.trim(),
          national_id_number: formData.national_id_number.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          marital_status: formData.marital_status,
          tribe: formData.tribe,
          district: formData.district,
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          next_of_kin_name: formData.next_of_kin_name.trim(),
          next_of_kin_phone: formData.next_of_kin_phone.trim(),
          next_of_kin_relationship: formData.next_of_kin_relationship.trim(),
          emergency_contact: formData.emergency_contact.trim(),
          account_number: formData.account_number.trim(),
          bank_name: formData.bank_name.trim(),
          account_name: formData.account_name.trim(),
          avatar_url: formData.avatar_url,
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', employee.authUserId);

      if (error) throw error;

      toast({ title: '🎉 Profile Complete!', description: 'Thank you for completing your profile.' });
      setIsOpen(false);
      if (fetchEmployeeData) await fetchEmployeeData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Please fill in all required details to continue. Step {step} of 4
          </DialogDescription>
          {/* Progress bar */}
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <User className="h-4 w-4" /> Personal Identity
              </div>
              <div className="space-y-2">
                <Label>Full Name (as on National ID) *</Label>
                <Input value={formData.national_id_name} onChange={e => setFormData(p => ({ ...p, national_id_name: e.target.value }))} placeholder="e.g. MUGISHA JOHN" />
              </div>
              <div className="space-y-2">
                <Label>National ID Number *</Label>
                <Input value={formData.national_id_number} onChange={e => setFormData(p => ({ ...p, national_id_number: e.target.value }))} placeholder="e.g. CM12345678ABCD" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input type="date" value={formData.date_of_birth} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.marital_status} onValueChange={v => setFormData(p => ({ ...p, marital_status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" /> Location & Contact
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tribe *</Label>
                  <Select value={formData.tribe} onValueChange={v => setFormData(p => ({ ...p, tribe: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select tribe" /></SelectTrigger>
                    <SelectContent>
                      {TRIBES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Select value={formData.district} onValueChange={v => setFormData(p => ({ ...p, district: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 0781234567" />
              </div>
              <div className="space-y-2">
                <Label>Residential Address *</Label>
                <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="e.g. Plot 12, Kira Road, Kampala" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Heart className="h-4 w-4" /> Next of Kin & Banking
              </div>
              <div className="space-y-2">
                <Label>Next of Kin Full Name *</Label>
                <Input value={formData.next_of_kin_name} onChange={e => setFormData(p => ({ ...p, next_of_kin_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Next of Kin Phone *</Label>
                  <Input value={formData.next_of_kin_phone} onChange={e => setFormData(p => ({ ...p, next_of_kin_phone: e.target.value }))} placeholder="e.g. 0771234567" />
                </div>
                <div className="space-y-2">
                  <Label>Relationship *</Label>
                  <Select value={formData.next_of_kin_relationship} onValueChange={v => setFormData(p => ({ ...p, next_of_kin_relationship: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <Input value={formData.emergency_contact} onChange={e => setFormData(p => ({ ...p, emergency_contact: e.target.value }))} placeholder="Emergency phone number" />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-4 mb-2">
                <CreditCard className="h-4 w-4" /> Bank Details (Optional)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={formData.bank_name} onChange={e => setFormData(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. Stanbic Bank" />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={formData.account_number} onChange={e => setFormData(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={formData.account_name} onChange={e => setFormData(p => ({ ...p, account_name: e.target.value }))} placeholder="Name on bank account" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Camera className="h-4 w-4" /> Profile Photo
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a clear, recent photo of yourself. This will appear on your profile and help colleagues identify you.
              </p>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-primary/20">
                    <AvatarImage src={formData.avatar_url} />
                    <AvatarFallback className="text-2xl bg-muted">
                      {employee?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {formData.avatar_url ? 'Change Photo' : 'Upload Photo *'}
                </Button>
                {!formData.avatar_url && (
                  <p className="text-xs text-destructive">A profile photo is required to proceed</p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} size="sm">Back</Button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !isStep1Valid()) ||
                (step === 2 && !isStep2Valid()) ||
                (step === 3 && !isStep3Valid())
              }
              size="sm"
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving || !isStep4Valid()} size="sm">
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              Complete Profile
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, MapPin, Phone, Coffee } from 'lucide-react';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { useAuth } from '@/contexts/AuthContext';

export const FarmerManagement = () => {
  const { farmers, addFarmer } = useFieldOperationsData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    village: '',
    parish: '',
    subcounty: '',
    coffee_type: 'Robusta',
    notes: ''
  });

  const filteredFarmers = farmers.filter(f =>
    f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.phone.includes(searchTerm) ||
    f.village.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFarmer({
      ...formData,
      created_by: user?.email || 'Unknown'
    });
    setIsDialogOpen(false);
    setFormData({
      full_name: '',
      phone: '',
      village: '',
      parish: '',
      subcounty: '',
      coffee_type: 'Robusta',
      notes: ''
    });
  };

  const captureGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log('GPS:', position.coords.latitude, position.coords.longitude);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Add */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Farmer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Farmer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="village">Village *</Label>
                  <Input
                    id="village"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="parish">Parish</Label>
                  <Input
                    id="parish"
                    value={formData.parish}
                    onChange={(e) => setFormData({ ...formData, parish: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="subcounty">Subcounty</Label>
                  <Input
                    id="subcounty"
                    value={formData.subcounty}
                    onChange={(e) => setFormData({ ...formData, subcounty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="coffee_type">Coffee Type *</Label>
                  <Select
                    value={formData.coffee_type}
                    onValueChange={(value) => setFormData({ ...formData, coffee_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arabica">Arabica</SelectItem>
                      <SelectItem value="Robusta">Robusta</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={captureGPS}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Capture GPS
                </Button>
                <Button type="submit" className="flex-1">Register Farmer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Farmers List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Farmers ({filteredFarmers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Coffee Type</TableHead>
                <TableHead>Total Purchases</TableHead>
                <TableHead>Outstanding Advance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFarmers.map((farmer) => (
                <TableRow key={farmer.id}>
                  <TableCell className="font-medium">{farmer.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {farmer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {farmer.village}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      {farmer.coffee_type}
                    </div>
                  </TableCell>
                  <TableCell>{farmer.total_purchases_kg.toLocaleString()} kg</TableCell>
                  <TableCell>UGX {farmer.outstanding_advance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

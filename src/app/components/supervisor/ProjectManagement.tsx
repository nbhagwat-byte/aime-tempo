import { useState, useMemo, useEffect } from 'react';
import { Briefcase, List, MapPin, Pencil, Plus, Trash2, Users, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getProjects,
  getPendingProjects,
  getUsers,
  getTimeLogs,
  saveProject,
  deleteProject,
  savePendingProject,
  deletePendingProject,
  geocodeAddress,
  calculateHours,
} from '@/app/utils/dataManager';
import type { Project, PendingProject, User } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Slider } from '@/app/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];

export function ProjectManagement() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [locationMode, setLocationMode] = useState<'address' | 'latlng' | 'both'>('address');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(100);
  const [notes, setNotes] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [timeLogs, setTimeLogs] = useState<Awaited<ReturnType<typeof getTimeLogs>>>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [projs, pending, team, logs] = await Promise.all([
        getProjects(),
        getPendingProjects(),
        getUsers(),
        getTimeLogs(),
      ]);
      setProjects(projs.filter((p) => !p.isPending));
      setPendingProjects(pending.filter((p) => p.status === 'pending'));
      setUsers(team);
      setTimeLogs(logs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredProjects =
    projectFilter === 'all' ? projects : projects.filter((p) => p.id === projectFilter);

  const stats = useMemo(() => {
    const projs = projectFilter === 'all' ? projects : projects.filter((p) => p.id === projectFilter);
    const logIds = new Set(timeLogs.map((l) => l.userId));
    const totalHours = timeLogs
      .filter((l) => l.checkOut && projs.some((p) => p.id === l.projectId))
      .reduce((sum, l) => sum + (l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0), 0);
    const totalCost = timeLogs
      .filter((l) => l.checkOut && projs.some((p) => p.id === l.projectId))
      .reduce((sum, l) => {
        const u = users.find((u) => u.id === l.userId);
        const hrs = l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0;
        return sum + hrs * (u?.hourlyRate ?? 0);
      }, 0);
    return {
      totalProjects: projs.length,
      crewSize: logIds.size,
      totalHours,
      totalCost,
    };
  }, [projectFilter, projects, timeLogs, users]);

  const openAdd = () => {
    setEditingProject(null);
    setName('');
    setAddress('');
    setLat('');
    setLng('');
    setRadius(100);
    setNotes('');
    setLocationMode('address');
    setDialogOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setAddress(p.address);
    setLat(String(p.location.lat));
    setLng(String(p.location.lng));
    setRadius(p.radius);
    setNotes(p.notes ?? '');
    setLocationMode('both');
    setDialogOpen(true);
  };

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(address.trim());
      setLat(String(coords.lat));
      setLng(String(coords.lng));
      toast.success('Address geocoded');
    } catch {
      toast.error('Address not found');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!name.trim()) {
      toast.error(t('supervisor.enterProjectName'));
      return;
    }
    if (locationMode !== 'latlng' && !address.trim()) {
      toast.error('Address required');
      return;
    }
    if (locationMode !== 'address' && (isNaN(latNum) || isNaN(lngNum))) {
      toast.error('Valid lat/lng required');
      return;
    }
    const id = editingProject?.id ?? crypto.randomUUID();
    const project: Project = {
      id,
      name: name.trim(),
      address: address.trim() || `${latNum}, ${lngNum}`,
      location: { lat: latNum || 40.7128, lng: lngNum || -74.006 },
      radius,
      active: true,
      notes: notes.trim() || undefined,
      projectStatus: editingProject?.projectStatus ?? 'in_progress',
    };
    try {
      await saveProject(project);
      toast.success('Project saved');
      setDialogOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleDelete = async (p: Project) => {
    if (!confirm(t('common.delete') + '?')) return;
    try {
      await deleteProject(p.id);
      toast.success('Project removed');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleApprovePending = async (pendingId: string) => {
    const pending = pendingProjects.find((x) => x.id === pendingId);
    if (!pending) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: pending.name,
      address: pending.address,
      location: { lat: 40.7128, lng: -74.006 },
      radius: pending.radius,
      active: true,
      projectStatus: 'in_progress',
    };
    try {
      await saveProject(newProject);
      await deletePendingProject(pendingId);
      toast.success(t('supervisor.correctionApproved'));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleDenyPending = async (pendingId: string) => {
    const pending = pendingProjects.find((x) => x.id === pendingId);
    if (!pending) return;
    try {
      await savePendingProject({ ...pending, status: 'denied' });
      toast.success(t('supervisor.correctionDenied'));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deny');
    }
  };

  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#236B8E]/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <Briefcase className="h-10 w-10 text-[#236B8E]" />
            <div>
              <p className="text-2xl font-bold text-[#062644]">{stats.totalProjects}</p>
              <p className="text-sm text-gray-600">{t('supervisor.totalProjects')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#236B8E]/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <Users className="h-10 w-10 text-[#236B8E]" />
            <div>
              <p className="text-2xl font-bold text-[#062644]">{stats.crewSize}</p>
              <p className="text-sm text-gray-600">{t('supervisor.crewSize')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#F0C908]/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <Clock className="h-10 w-10 text-[#F0C908]" />
            <div>
              <p className="text-2xl font-bold text-[#062644]">{stats.totalHours.toFixed(1)}</p>
              <p className="text-sm text-gray-600">{t('supervisor.totalHours')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#D10000]/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <DollarSign className="h-10 w-10 text-[#D10000]" />
            <div>
              <p className="text-2xl font-bold text-[#062644]">${stats.totalCost.toFixed(0)}</p>
              <p className="text-sm text-gray-600">{t('supervisor.totalCost')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('supervisor.allProjects')}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label={t('supervisor.listView')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('map')}
            aria-label={t('supervisor.mapView')}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="warning" className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {t('supervisor.addProject')}
        </Button>
      </div>

      {viewMode === 'list' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredProjects.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-[#062644]">{p.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label={t('common.edit')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} aria-label={t('common.delete')} className="text-[#D10000]">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{p.address || `${p.location.lat}, ${p.location.lng}`}</p>
                <p className="mt-1 text-xs text-gray-500">
                  <MapPin className="inline h-3 w-3" /> {p.radius}m radius
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={p.projectStatus === 'complete' ? 'secondary' : 'success'}>
                    {p.projectStatus === 'complete' ? 'Complete' : 'In Progress'}
                  </Badge>
                  <Select
                    value={p.projectStatus ?? 'in_progress'}
                    onValueChange={async (value: 'in_progress' | 'complete') => {
                      try {
                        await saveProject({ ...p, projectStatus: value });
                        toast.success(value === 'complete' ? 'Project marked complete' : 'Project set to in progress');
                        await refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Failed to update');
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'map' && (
        <div className="h-[500px] w-full overflow-hidden rounded-lg border">
          <MapContainer center={DEFAULT_CENTER} zoom={11} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredProjects.map((p) => (
              <Circle
                key={p.id}
                center={[p.location.lat, p.location.lng]}
                radius={p.radius}
                pathOptions={{ color: '#236B8E', fillColor: '#236B8E', fillOpacity: 0.2 }}
              />
            ))}
            {filteredProjects.map((p) => (
              <Marker key={p.id} position={[p.location.lat, p.location.lng]} icon={defaultIcon}>
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  {p.radius}m
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>{t('common.edit')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>{t('common.delete')}</Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" showClose={true}>
          <DialogHeader>
            <DialogTitle>{editingProject ? t('supervisor.editProject') : t('supervisor.addProject')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('supervisor.projectName')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('supervisor.enterProjectName')} />
            </div>
            <div>
              <Label>Location input</Label>
              <Select value={locationMode} onValueChange={(v: 'address' | 'latlng' | 'both') => setLocationMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="address">{t('supervisor.addressOnly')}</SelectItem>
                  <SelectItem value="latlng">{t('supervisor.latLngOnly')}</SelectItem>
                  <SelectItem value="both">{t('supervisor.both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(locationMode === 'address' || locationMode === 'both') && (
              <div>
                <Label>{t('painter.address')}</Label>
                <div className="flex gap-2">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('supervisor.enterAddress')} />
                  <Button type="button" onClick={handleGeocode} disabled={geocoding}>
                    {geocoding ? '...' : t('painter.geocode')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{t('supervisor.geocodeHelp')}</p>
              </div>
            )}
            {(locationMode === 'latlng' || locationMode === 'both') && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t('supervisor.latitude')}</Label>
                  <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="40.7128" />
                </div>
                <div>
                  <Label>{t('supervisor.longitude')}</Label>
                  <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-74.0060" />
                </div>
              </div>
            )}
            <div>
              <Label>{t('supervisor.geofenceRadius')}: {radius}m</Label>
              <Slider value={[radius]} onValueChange={([v]) => setRadius(v)} min={50} max={1000} step={10} />
            </div>
            <div>
              <Label>{t('supervisor.additionalNotes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('supervisor.notesPlaceholder')} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('supervisor.pendingProjectRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingProjects.map((pending) => {
                const requester = users.find((u) => u.id === pending.requestedBy);
                return (
                  <Card key={pending.id}>
                    <CardContent className="pt-4">
                      <p className="font-medium text-[#062644]">{pending.name}</p>
                      <p className="text-sm text-gray-500">{t('supervisor.requestedBy')} {requester?.name ?? pending.requestedBy}</p>
                      <p className="text-xs text-gray-600">{pending.address}</p>
                      <p className="text-xs">Radius: {pending.radius}m</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => handleApprovePending(pending.id)}>{t('common.approve')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDenyPending(pending.id)}>{t('common.deny')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FieldAgent {
  id: string;
  name: string;
  region: string;
  phone: string;
  status: string;
  collectionsCount: number;
  lastReportDate: string;
}

export interface BuyingStation {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentOccupancy: number;
  managerName: string;
  status: string;
}

export interface FieldCollection {
  id: string;
  farmerName: string;
  location: string;
  bags: number;
  qualityGrade: string;
  agentName: string;
  collectionDate: string;
  status: string;
  batchNumber: string;
}

export const useFieldOperations = () => {
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [stations, setStations] = useState<BuyingStation[]>([]);
  const [collections, setCollections] = useState<FieldCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFieldData = async () => {
    try {
      setLoading(true);
      
      // Fetch field agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('field_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error fetching field agents:', agentsError);
      } else {
        const transformedAgents: FieldAgent[] = agentsData.map(agent => ({
          id: agent.id,
          name: agent.name,
          region: agent.region,
          phone: agent.phone || 'N/A',
          status: agent.status,
          collectionsCount: agent.collections_count || 0,
          lastReportDate: agent.last_report_date || 'N/A'
        }));
        setAgents(transformedAgents);
      }

      // Fetch buying stations
      const { data: stationsData, error: stationsError } = await supabase
        .from('buying_stations')
        .select('*')
        .order('created_at', { ascending: false });

      if (stationsError) {
        console.error('Error fetching buying stations:', stationsError);
      } else {
        const transformedStations: BuyingStation[] = stationsData.map(station => ({
          id: station.id,
          name: station.name,
          location: station.location,
          capacity: station.capacity,
          currentOccupancy: station.current_occupancy || 0,
          managerName: station.manager_name,
          status: station.status
        }));
        setStations(transformedStations);
      }

      // Fetch field collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('field_collections')
        .select('*')
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        console.error('Error fetching field collections:', collectionsError);
      } else {
        const transformedCollections: FieldCollection[] = collectionsData.map(collection => ({
          id: collection.id,
          farmerName: collection.farmer_name,
          location: collection.location,
          bags: collection.bags,
          qualityGrade: collection.quality_grade,
          agentName: collection.agent_name,
          collectionDate: collection.collection_date,
          status: collection.status,
          batchNumber: collection.batch_number || `FC${collection.id.slice(0, 8)}`
        }));
        setCollections(transformedCollections);
      }
    } catch (error) {
      console.error('Error fetching field operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldData();
  }, []);

  return {
    agents,
    stations,
    collections,
    loading,
    fetchFieldData
  };
};

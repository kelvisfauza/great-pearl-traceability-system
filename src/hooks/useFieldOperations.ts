
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
  farmer: string; // Add alias for backward compatibility
  location: string;
  bags: number;
  qualityGrade: string;
  quality: string; // Add alias for backward compatibility
  agentName: string;
  agent: string; // Add alias for backward compatibility
  collectionDate: string;
  date: string; // Add alias for backward compatibility
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
          farmer: collection.farmer_name, // Alias for backward compatibility
          location: collection.location,
          bags: collection.bags,
          qualityGrade: collection.quality_grade,
          quality: collection.quality_grade, // Alias for backward compatibility  
          agentName: collection.agent_name,
          agent: collection.agent_name, // Alias for backward compatibility
          collectionDate: collection.collection_date,
          date: collection.collection_date, // Alias for backward compatibility
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

  const addFieldAgent = async (agentData: Omit<FieldAgent, 'id' | 'collectionsCount' | 'lastReportDate'>) => {
    try {
      const { error } = await supabase
        .from('field_agents')
        .insert([{
          name: agentData.name,
          region: agentData.region,
          phone: agentData.phone,
          status: agentData.status
        }]);

      if (error) throw error;
      await fetchFieldData();
    } catch (error) {
      console.error('Error adding field agent:', error);
      throw error;
    }
  };

  const addBuyingStation = async (stationData: Omit<BuyingStation, 'id' | 'currentOccupancy'>) => {
    try {
      const { error } = await supabase
        .from('buying_stations')
        .insert([{
          name: stationData.name,
          location: stationData.location,
          capacity: stationData.capacity,
          manager_name: stationData.managerName,
          status: stationData.status
        }]);

      if (error) throw error;
      await fetchFieldData();
    } catch (error) {
      console.error('Error adding buying station:', error);
      throw error;
    }
  };

  const addCollection = async (collectionData: Omit<FieldCollection, 'id' | 'batchNumber'>) => {
    try {
      const { error } = await supabase
        .from('field_collections')
        .insert([{
          farmer_name: collectionData.farmerName,
          location: collectionData.location,
          bags: collectionData.bags,
          quality_grade: collectionData.qualityGrade,
          agent_name: collectionData.agentName,
          collection_date: collectionData.collectionDate,
          status: collectionData.status
        }]);

      if (error) throw error;
      await fetchFieldData();
    } catch (error) {
      console.error('Error adding collection:', error);
      throw error;
    }
  };

  const getStats = () => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'Active').length,
    totalStations: stations.length,
    totalCollections: collections.length,
    totalBags: collections.reduce((sum, c) => sum + c.bags, 0)
  });

  useEffect(() => {
    fetchFieldData();
  }, []);

  return {
    agents,
    stations,
    collections,
    loading,
    fetchFieldData,
    // Legacy aliases for backward compatibility
    fieldAgents: agents,
    buyingStations: stations,
    stats: getStats(),
    addFieldAgent,
    addBuyingStation,
    addCollection
  };
};

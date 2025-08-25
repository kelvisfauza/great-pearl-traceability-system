import { setEmployeeRole } from './updateEmployeePermissions';

export const fixDenisPermissions = async () => {
  try {
    console.log('Setting Denis as Data Analyst with proper permissions...');
    
    // Set Denis as Data Analyst with proper permissions for data analysis and reports
    await setEmployeeRole('bwambaledenis8@gmail.com', 'DATA_ANALYST');
    
    console.log('✅ Denis permissions set as Data Analyst successfully');
    return { success: true, message: 'Denis permissions updated to Data Analyst level' };
  } catch (error) {
    console.error('❌ Error setting Denis as Data Analyst:', error);
    throw error;
  }
};

// Auto-execute to set Denis as Data Analyst immediately
fixDenisPermissions().then(() => {
  console.log('Denis has been properly set as Data Analyst with correct permissions');
}).catch(error => {
  console.error('Failed to set Denis as Data Analyst:', error);
});
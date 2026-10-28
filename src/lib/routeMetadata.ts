export const SEO_ORIGIN = 'https://great-pearl-traceability-system.lovable.app';

const publicPages: Record<string, { name: string; description: string }> = {
  '/': { name: 'Great Agro Coffee — Ugandan Coffee', description: 'Great Agro Coffee sources, processes and exports Ugandan Arabica and Robusta coffee from Kasese, with quality analysis and coffee traceability.' },
  '/auth': { name: 'Staff Sign In | Great Agro Coffee', description: 'Sign in to the Great Agro Coffee management system for procurement, quality control, finance and staff operations.' },
  '/careers': { name: 'Careers | Great Agro Coffee', description: 'View current job openings at Great Agro Coffee in Kasese, Uganda, and submit your application to the Human Resources team.' },
  '/support': { name: 'Customer Support | Great Agro Coffee', description: 'Contact Great Agro Coffee customer support for assistance with coffee inquiries, services and orders.' },
  '/privacy-policy': { name: 'Privacy Policy | Great Agro Coffee', description: 'Read the Great Agro Coffee privacy policy covering information collected through the company management system.' },
  '/verify': { name: 'Document Verification | Great Agro Coffee', description: 'Verify a Great Agro Coffee document using its registered verification code and check the document issuance details.' },
};

export function routeMetadata(pathname: string) {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const publicPage = publicPages[path];
  const special = path.startsWith('/employee/') ? { name: 'Employee Verification', description: 'Check a Great Agro Coffee employee profile using the issued employee verification link.' }
    : path.startsWith('/verify/') ? { name: 'Document Verification', description: publicPages['/verify'].description } : null;
  const section = path.split('/').filter(part => part && !/^v\d+$/.test(part) && !/\d/.test(part))
    .map(part => part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(' · ') || 'Management System';
  const label = special?.name || section;
  return {
    title: publicPage?.name || `${label.slice(0, 36)} | Great Agro Coffee`,
    description: publicPage?.description || special?.description || `Great Agro Coffee ${label.toLowerCase()} workspace for authorized staff to manage company operations and saved records.`,
    canonical: `${SEO_ORIGIN}${path}`,
    noindex: !publicPage,
  };
}
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { routeMetadata } from '@/lib/routeMetadata';

export default function RouteMetadata() {
  const { pathname } = useLocation();
  const meta = routeMetadata(pathname);
  return <Helmet>
    <title>{meta.title}</title>
    <meta name="description" content={meta.description} />
    <link rel="canonical" href={meta.canonical} />
    <meta property="og:title" content={meta.title} />
    <meta property="og:description" content={meta.description} />
    <meta property="og:url" content={meta.canonical} />
    <meta property="og:type" content="website" />
    <meta name="twitter:title" content={meta.title} />
    <meta name="twitter:description" content={meta.description} />
    <meta name="robots" content={meta.noindex ? 'noindex, nofollow' : 'index, follow'} />
  </Helmet>;
}
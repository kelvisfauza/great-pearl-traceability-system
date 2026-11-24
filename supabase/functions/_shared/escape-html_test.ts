import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { escapeHtml } from './escape-html.ts';

Deno.test('email data cannot introduce tags or quoted attributes', () => {
  assertEquals(escapeHtml('<img src=x onerror="alert(1)"> & \'name\''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;name&#39;');
  assertEquals(escapeHtml(null), '');
});
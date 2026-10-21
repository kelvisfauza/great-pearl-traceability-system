import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { supportedAttachment, validatedGraphPath, scheduledCheckDue, RECONCILE_INTERVAL_MS } from './recognition.ts';
Deno.test('Quality forms use non-inline PDF and photo attachments',()=>{
  assertEquals(supportedAttachment({contentType:'application/pdf',size:100}),true);
  assertEquals(supportedAttachment({contentType:'image/jpeg',size:100}),true);
  assertEquals(supportedAttachment({contentType:'image/jpeg',isInline:true}),false);
  assertEquals(supportedAttachment({contentType:'application/zip'}),false);
});
Deno.test('Outlook continuation never sends credentials to another host',()=>{
  assertEquals(validatedGraphPath('https://graph.microsoft.com/v1.0/me/messages?$skip=2'),'/me/messages?$skip=2');
  assertThrows(()=>validatedGraphPath('https://attacker.example/v1.0/me/messages'));
});
Deno.test('Requested minute reconciliation is due after one minute',()=>{
  assertEquals(RECONCILE_INTERVAL_MS,60_000);
  assertEquals(scheduledCheckDue('2026-10-21T14:13:00Z',Date.parse('2026-10-21T14:14:00Z')),true);
  assertEquals(scheduledCheckDue('2026-10-21T14:13:00Z',Date.parse('2026-10-21T14:13:20Z')),false);
});
Deno.test('Attachment-only email needs neither subject nor body',()=>{
  const email={subject:'',bodyPreview:'',attachments:[{contentType:'application/pdf',size:100}]};
  assertEquals(email.attachments.filter(supportedAttachment).length,1);
});
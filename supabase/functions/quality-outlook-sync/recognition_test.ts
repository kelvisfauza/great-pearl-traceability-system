import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { supportedAttachment, validatedGraphPath } from './recognition.ts';
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
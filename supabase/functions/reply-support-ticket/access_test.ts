import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { mayReply } from '../_shared/reply-access.ts';
Deno.test('assigned staff can send custom replies',()=>{
  const staff={userId:'auth-1',employeeId:'employee-1',isAdministrator:false};
  assertEquals(mayReply(staff,'employee-1'),true);
  assertEquals(mayReply(staff,'auth-1'),true);
  assertEquals(mayReply(staff,'employee-2'),false);
  assertEquals(mayReply(staff,null),false);
});
Deno.test('administrators retain custom supplier and support replies',()=>{
  assertEquals(mayReply({userId:'admin',employeeId:'admin-employee',isAdministrator:true},'employee-2'),true);
});
import { setupDenisAccount } from './setupDenisAccount';

// Execute the Denis account setup
setupDenisAccount().then((result) => {
  console.log('🎉 Denis account setup result:', result);
  if (result?.success) {
    alert(`Denis account is now properly configured!\n\nEmail: ${result.email}\nPassword: ${result.password}\n\nYou can now log in normally like other accounts.`);
  } else {
    alert('Failed to setup Denis account. Check console for details.');
  }
}).catch(error => {
  console.error('💥 Denis account setup failed:', error);
  alert('Failed to setup Denis account. Check console for details.');
});
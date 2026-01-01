// Authentication Modal Handler

let authModal = null;
let authContainer = null;

// Initialize modal elements
function initAuthModal() {
  authModal = document.getElementById('authModal');
  authContainer = document.querySelector('.auth-modal-container');
  
  if (!authModal || !authContainer) return;
  
  // Use event delegation for links (works even if elements are dynamically added)
  authModal.addEventListener('click', (e) => {
    // Switch to register
    if (e.target.classList.contains('auth-signup-link') || e.target.closest('.auth-signup-link')) {
      e.preventDefault();
      e.stopPropagation();
      if (authContainer) {
        authContainer.classList.add('active');
      }
    }
    
    // Switch to login
    if (e.target.classList.contains('auth-signin-link') || e.target.closest('.auth-signin-link')) {
      e.preventDefault();
      e.stopPropagation();
      if (authContainer) {
        authContainer.classList.remove('active');
      }
    }
  });
  
  // Close button
  const closeBtn = document.querySelector('.auth-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }
}

// Open modal
function openAuthModal() {
  if (!authModal) {
    initAuthModal();
  }
  if (authModal) {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close modal
function closeAuthModal() {
  if (authModal) {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close on overlay click
document.addEventListener('click', (e) => {
  if (authModal && e.target === authModal) {
    closeAuthModal();
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && authModal && authModal.classList.contains('active')) {
    closeAuthModal();
  }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAuthModal();
  
  // Handle input labels
  const inputs = document.querySelectorAll('.auth-input-box input');
  inputs.forEach(input => {
    // Check if input has value on load
    if (input.value) {
      input.classList.add('has-value');
    }
    
    input.addEventListener('input', () => {
      if (input.value) {
        input.classList.add('has-value');
      } else {
        input.classList.remove('has-value');
      }
    });
    
    input.addEventListener('focus', () => {
      input.classList.add('has-value');
    });
  });
  
  // Handle date input
  const dobInput = document.getElementById('authDob');
  if (dobInput) {
    const today = new Date().toISOString().split('T')[0];
    dobInput.max = today;
    dobInput.setAttribute('placeholder', 'YYYY-MM-DD');
  }
  
  // Handle form submissions
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const username = formData.get('username');
      const password = formData.get('password');
      
      // Demo login - just show success
      alert('Login successful! (Demo mode)');
      closeAuthModal();
    });
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const username = formData.get('username');
      const email = formData.get('email');
      const dob = formData.get('dob');
      const password = formData.get('password');
      
      if (!username || !email || !dob || !password) {
        alert('Please complete all fields.');
        return;
      }
      
      const dobDate = new Date(dob);
      const now = new Date();
      if (dobDate.getTime() > now.getTime()) {
        alert('Date of birth cannot be in the future.');
        return;
      }
      
      const age = (now.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 13) {
        alert('You must be at least 13 years old to register.');
        return;
      }
      
      // Demo registration
      const user = { username, email, dob, created: new Date().toISOString() };
      try {
        localStorage.setItem('bullstreet_user', JSON.stringify(user));
        alert('Registration successful! Welcome to Bullstreet Academy.');
        registerForm.reset();
        authContainer.classList.remove('active');
      } catch (err) {
        console.error('Failed to save user', err);
        alert('Registration succeeded but could not save profile.');
      }
    });
  }
});

// Make openAuthModal globally available
window.openAuthModal = openAuthModal;


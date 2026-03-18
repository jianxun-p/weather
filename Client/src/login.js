import { loginUser } from './api';
import './styles.css';

const AUTH_USER_KEY = 'weatherAuthUser';

const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const signInBtn = document.getElementById('signInBtn');
const loginError = document.getElementById('loginError');

function showError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function clearError() {
  loginError.textContent = '';
  loginError.hidden = true;
}

function setSubmitting(isSubmitting) {
  signInBtn.disabled = isSubmitting;
  signInBtn.textContent = isSubmitting ? 'Signing in...' : 'Sign in';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showError('Username and password are required.');
    return;
  }

  clearError();
  setSubmitting(true);

  try {
    const response = await loginUser(username, password);

    if (response.message) {
      throw new Error(response.message);
    }

    if (!response?.user?.username) {
      throw new Error('Unexpected login response from server.');
    }

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    window.location.replace('/');
  } catch (loginErr) {
    showError(loginErr.message || 'Unable to sign in.');
  } finally {
    setSubmitting(false);
  }
});

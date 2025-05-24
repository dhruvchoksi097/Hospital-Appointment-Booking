// public/js/auth.js

// --- Login Form Handling ---
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission
        loginMessage.textContent = ''; // Clear previous messages

        const username = loginForm.username.value.trim();
        const password = loginForm.password.value.trim();

        if (!username || !password) {
            loginMessage.textContent = 'Please enter both username and password.';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok) {
                // Store token (or session indicator) - using localStorage for simplicity
                localStorage.setItem('authToken', result.token); // In a real app, manage tokens more securely
                localStorage.setItem('username', username); // Store username for dashboard greeting
                window.location.href = '/dashboard.html'; // Redirect to dashboard
            } else {
                loginMessage.textContent = result.message || 'Login failed. Please check your credentials.';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginMessage.textContent = 'An error occurred during login. Please try again.';
        }
    });
}

// --- Registration Form Handling ---
const registerForm = document.getElementById('register-form');
const registerMessage = document.getElementById('register-message');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerMessage.textContent = ''; // Clear previous messages
        registerMessage.className = 'mt-4 text-center text-sm'; // Reset class

        const username = registerForm.username.value.trim();
        const password = registerForm.password.value.trim();
        const fullname = registerForm.fullname.value.trim(); // Get full name

        if (!username || !password || !fullname) {
            registerMessage.textContent = 'Please fill in all fields.';
            registerMessage.classList.add('text-red-600');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, fullname }), // Send fullname too
            });

            const result = await response.json();

            if (response.ok) {
                registerMessage.textContent = 'Registration successful! You can now log in.';
                registerMessage.classList.add('text-green-600');
                registerForm.reset(); // Clear the form
                 // Optionally redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                registerMessage.textContent = result.message || 'Registration failed.';
                registerMessage.classList.add('text-red-600');
            }
        } catch (error) {
            console.error('Registration error:', error);
            registerMessage.textContent = 'An error occurred during registration.';
            registerMessage.classList.add('text-red-600');
        }
    });
}
